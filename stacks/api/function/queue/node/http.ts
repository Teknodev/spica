import {Http} from "@spica-server/function/queue/proto";
import * as grpc from "@grpc/grpc-js";

export class HttpQueue {
  private client: any;

  constructor() {
    this.client = new Http.QueueClient(
      process.env.FUNCTION_GRPC_ADDRESS,
      grpc.credentials.createInsecure()
    );
  }

  end(e: Http.End): Promise<Http.End.Result> {
    return new Promise((resolve, reject) => {
      this.client.end(e, (error, event) => {
        if (error) {
          reject(error.details);
        } else {
          resolve(event);
        }
      });
    });
  }

  write(e: Http.Write): Promise<Http.Write.Result> {
    return new Promise((resolve, reject) => {
      this.client.write(e, (error, event) => {
        if (error) {
          reject(error);
        } else {
          resolve(event);
        }
      });
    });
  }

  writeHead(e: Http.WriteHead): Promise<Http.WriteHead.Result> {
    return new Promise((resolve, reject) => {
      this.client.writeHead(e, (error, event) => {
        if (error) {
          reject(error);
        } else {
          resolve(event);
        }
      });
    });
  }

  pop(e: Http.Request.Pop): Promise<Http.Request> {
    return new Promise((resolve, reject) => {
      this.client.pop(e, (error, event) => {
        if (error) {
          reject(new Error(error.details));
        } else {
          resolve(event);
        }
      });
    });
  }
}

export class Request {
  statusCode: number;
  statusMessage: string;
  method: string;
  url: string;
  path: string;
  headers = new Map<string, string | string[]>();
  query: unknown = {};
  params = new Map<string, string>();
  cookies = new Map<string, string>();
  body: Array<unknown> | object | Uint8Array | undefined;

  constructor(req: Http.Request) {
    this.statusCode = req.statusCode;
    this.statusMessage = req.statusMessage;
    this.method = req.method;
    this.url = req.url;
    this.path = req.path;

    if (req.headers) {
      this.headers = new Map(req.headers.map(h => [h.key, h.value]));
    }

    if (req.params) {
      this.params = new Map(req.params.map(h => [h.key, h.value]));
    }

    if (req.query) {
      this.query = JSON.parse(req.query);
    }

    if (req.body) {
      this.body = req.body;
      if (this.headers.get("content-type") == "application/json") {
        this.body = JSON.parse(Buffer.from(req.body).toString());
      }
    }
  }
}

export class ResponseHeaders extends Map<string, string | string[]> {
  append(key: string, value: string) {
    let values: string[] = [];
    if (this.has(key)) {
      const prevValues = this.get(key);
      if (!Array.isArray(prevValues)) {
        values.push(prevValues);
      } else {
        values.push(...prevValues);
      }
    }
    values.push(value);
    this.set(key, values);
  }
}

export class Response {
  statusCode: number;
  statusMessage: string;

  headersSent: boolean = false;

  headers = new ResponseHeaders();

  constructor(
    private _writeHead: (e: Http.WriteHead) => void,
    private _write: (e: Http.Write) => void,
    private _end: (e: Http.End) => void
  ) {}

  send(body: Buffer | Array<any> | object | string | boolean | number) {
    let type: string;
    let chunk: Buffer;
    if (Buffer.isBuffer(body)) {
      type = "application/octet-stream";
      chunk = body;
    } else if (Array.isArray(body) || typeof body == "object") {
      type = "application/json";
      chunk = Buffer.from(JSON.stringify(body));
    } else {
      type = "text/html";
      chunk = Buffer.from(String(body));
    }
    this.writeHead(this.statusCode || 200, this.statusMessage || "OK", {
      "Content-type": type,
      "Content-length": String(Buffer.byteLength(chunk))
    });
    this.end(chunk, "utf-8");
  }

  status(code: number, message?: string) {
    this.statusCode = code;
    this.statusMessage = message;
    return this;
  }

  write(chunk: string | Buffer, encoding?: BufferEncoding) {
    const write = new Http.Write();
    write.encoding = encoding;
    write.data = new Uint8Array(chunk instanceof Buffer ? chunk : Buffer.from(chunk, encoding));
    this._write(write);
  }

  writeHead(statusCode: number, statusMessage?: string, headers?: object) {
    if (this.headersSent) {
      throw new Error("Headers already sent");
    }
    const writeHead = new Http.WriteHead();
    writeHead.statusCode = statusCode;
    writeHead.statusMessage = statusMessage;
    if (headers) {
      for (const key in headers) {
        this.headers.set(key, headers[key]);
      }
    }
    writeHead.headers = Array.from(this.headers.entries()).reduce((headers, [key, v]) => {
      if (Array.isArray(v)) {
        for (const value of v) {
          headers.push(
            new Http.Header({
              key,
              value
            })
          );
        }
      } else {
        headers.push(
          new Http.Header({
            key,
            value: v
          })
        );
      }

      return headers;
    }, []);

    this._writeHead(writeHead);
    this.headersSent = true;
  }

  end(data: string | Buffer, encoding?: BufferEncoding) {
    const end = new Http.End();
    end.encoding = encoding;
    end.data = new Uint8Array(data instanceof Buffer ? data : Buffer.from(data, encoding));
    this._end(end);
  }
}
