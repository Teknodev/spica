import { Query } from 'mingo';
import { ChunkKind, StreamChunk } from '@spica-server/interface/realtime';
import { ChangeStream, Collection, ObjectId } from 'mongodb';
import { asyncScheduler, Observable, Subject, Subscriber, TeardownLogic, Subscription } from 'rxjs';
import { filter, bufferTime, switchMap, share } from 'rxjs/operators';
import { PassThrough } from 'stream';
import { DatabaseChange, FindOptions, OperationType } from './interface';
import { levenshtein } from './levenshtein';
import { late } from './operators';

export class Emitter<T extends { _id: ObjectId }> {
  private sort = new Subject<DatabaseChange<T>>();
  private sortSubscription: Subscription;

  private ids = new Set<string>();

  private observable: Observable<StreamChunk<T>>;
  private observer: Subscriber<StreamChunk<T>>;
  private subscribe: (
    this: Observable<StreamChunk<T>>,
    subscriber: Subscriber<StreamChunk<T>>
  ) => TeardownLogic;

  public collectionName;

  private passThrough = new PassThrough({
    objectMode: true
  });

  constructor(
    private collection: Collection,
    private changeStream: ChangeStream,
    private options: FindOptions<T>
  ) {
    this.collectionName = collection.collectionName;
    this.subscribe = observer => {
      this.observer = observer;
      if (options.sort) {
        this.listenSortChanges();
      }

      this.passThrough.on('data', (change: DatabaseChange<T>) => {
        switch (change.operationType) {
          case OperationType.INSERT:
            if (
              (options.filter && !this.doesMatch(change.fullDocument)) ||
              (options.limit && this.ids.size >= options.limit && !options.sort)
            ) {
              return;
            }

            // If sorting enabled hand over the event to sort
            if (options.sort) {
              return this.sort.next(change);
            }

            this.next({ kind: ChunkKind.Insert, document: change.fullDocument });

            break;

          case OperationType.DELETE:
            const documentId = change.documentKey._id.toString();

            if (this.ids.has(documentId)) {
              this.next({ kind: ChunkKind.Delete, document: change.documentKey });

              if (options.limit && this.ids.size < options.limit) {
                this.fetchMoreItemToFillTheCursor();
              }
            }

            break;

          case OperationType.REPLACE:
          case OperationType.UPDATE:
            if (!options.filter || this.doesMatch(change.fullDocument)) {
              if (
                !this.isChangeAlreadyPresentInCursor(change) &&
                ((options.limit && this.ids.size >= options.limit) ||
                  (!options.filter && options.skip))
              ) {
                if (options.sort) {
                  this.sort.next(change);
                }
                return;
              }

              // If the updated or replaced document is deleted immediately
              // after update/replace operation fullDocument will be empty.
              if (change.fullDocument != null) {
                this.next({
                  kind:
                    change.operationType == OperationType.UPDATE
                      ? ChunkKind.Update
                      : ChunkKind.Replace,
                  document: change.fullDocument
                });
              }

              if (options.sort) {
                this.sort.next(change);
              }
            } else if (this.isChangeAlreadyPresentInCursor(change)) {
              this.next({
                kind: ChunkKind.Expunge,
                document: change.documentKey
              });
            }

            break;

          case OperationType.DROP:
            this.ids.clear();
            this.observer.complete();

            break;
        }
      });

      this.changeStream.pipe(this.passThrough);

      return this.getTearDownLogic();
    };
  }

  getObservable() {
    if (!this.observable) {
      this.observable = new Observable<StreamChunk<T>>(this.subscribe).pipe(
        share(),
        this.getLateSubscriberOperator()
      );
    }
    return this.observable;
  }

  getLateSubscriberOperator() {
    return late<StreamChunk<T>>((subscriber, connect) => {
      const pipeline: any[] = [];

      if (this.options.filter) {
        pipeline.push({
          $match: this.options.filter
        });
      }

      if (this.options.sort) {
        pipeline.push({
          $sort: this.options.sort
        });
      }

      if (this.options.skip) {
        pipeline.push({
          $skip: this.options.skip
        });
      }

      if (this.options.limit) {
        pipeline.push({
          $limit: this.options.limit
        });
      }

      this.collection
        .aggregate(pipeline)
        .toArray()
        .then(documents => {
          for (const document of documents) {
            subscriber.next({ kind: ChunkKind.Initial, document: document });
            this.ids.add(document._id.toString());
          }
        })
        .catch(e => subscriber.error(e))
        .finally(() => {
          subscriber.next({ kind: ChunkKind.EndOfInitial });
          connect();
        });
    });
  }

  next(message: { kind: ChunkKind; document?: T }) {
    this.observer.next(message);
    const id = message.document?._id.toString();

    switch (message.kind) {
      case ChunkKind.Initial:
      case ChunkKind.Insert:
        if (id) this.ids.add(id);
        break;
      case ChunkKind.Update:
      case ChunkKind.Replace:
        if (id) this.ids.add(id);
        break;
      case ChunkKind.Expunge:
      case ChunkKind.Delete:
        if (id) this.ids.delete(id);
        break;
    }
  }

  error(e: Error) {
    this.observer.error(e);
  }

  private getTearDownLogic(): TeardownLogic {
    return () => {
      if (this.sortSubscription) {
        this.sortSubscription.unsubscribe();
      }

      if (!this.changeStream.closed) {
        this.changeStream.unpipe(this.passThrough);
      }

      this.passThrough.removeAllListeners();
    };
  }

  private listenSortChanges() {
    const sortedKeys = getSortedKeys(this.options.sort);
    this.sortSubscription = this.sort
      .pipe(
        filter(change => this.doesTheChangeAffectTheSortedCursor(sortedKeys, change)),
        bufferTime(1, asyncScheduler),
        filter(changes => changes.length > 0),
        switchMap(async changes => {
          if (
            sortedKeys.length == 1 &&
            sortedKeys[0] == '_id' &&
            changes.length > 1 &&
            this.options.sort?._id == -1
          ) {
            changes = changes.reverse();
          }
          for (const change of changes) {
            if (change.operationType == OperationType.INSERT) {
              this.next({ kind: ChunkKind.Insert, document: change.fullDocument });
            }
          }

          const syncedIds = await this.fetchSortedIdsOfTheCursor();
          const changeSequence = levenshtein(this.ids, syncedIds);
          if (changeSequence.distance) {
            this.ids = new Set(syncedIds);
            this.observer.next({ kind: ChunkKind.Order, sequence: changeSequence.sequence });
          }
        })
      )
      .subscribe();
  }

  private fetchSortedIdsOfTheCursor(): Promise<string[]> {
    const pipeline: any[] = [];

    if (this.options.filter) {
      pipeline.push({
        $match: this.options.filter
      });
    }

    if (this.options.sort) {
      pipeline.push({
        $sort: this.options.sort
      });
    }

    if (this.options.skip) {
      pipeline.push({
        $skip: this.options.skip
      });
    }

    if (this.options.limit) {
      pipeline.push({
        $limit: this.options.limit
      });
    }

    pipeline.push({
      $project: {
        _id: 1
      }
    });

    return this.collection
      .aggregate(pipeline)
      .toArray()
      .then(r => r.map(r => r._id.toString()));
  }

  private fetchMoreItemToFillTheCursor() {
    this.collection
      .find<T>(this.options.filter)
      .skip(this.options.skip ? this.options.skip + this.ids.size : this.ids.size)
      .limit(this.options.limit ? this.options.limit - this.ids.size : 0)
      .next()
      .then(data => this.next({ kind: ChunkKind.Initial, document: data }))
      .catch(e => this.error(e));
  }

  private isChangeAlreadyPresentInCursor(change: DatabaseChange<T>): boolean {
    return this.ids.has(change.documentKey._id.toString());
  }

  private doesMatch(document: T): boolean {
    if (!this.options.filter) return true;
    const query = new Query(this.options.filter);
    return query.test(document);
  }

  private doesTheChangeAffectTheSortedCursor(
    sortedKeys: string[],
    change: DatabaseChange<T>
  ): boolean {
    if (change.operationType == OperationType.UPDATE) {
      const changedKeys: string[] = (change.updateDescription.removedFields || []).concat(
        Object.keys(change.updateDescription.updatedFields || {})
      );
      return sortedKeys.some(key => changedKeys.includes(key));
    }
    return true;
  }
}

function getSortedKeys<T>(sort: { [P in keyof T]?: 1 | -1 } | undefined): string[] {
  if (!sort) return [];
  return Object.keys(sort).sort((a, b) => {
    return (sort[a] || 1) - (sort[b] || 1);
  });
}
