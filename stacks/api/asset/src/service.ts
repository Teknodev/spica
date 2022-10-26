import {Injectable} from "@nestjs/common";
import {BaseCollection, DatabaseService} from "@spica-server/database";
import {Asset} from "./interface";

@Injectable()
export class AssetService extends BaseCollection<Asset>("asset") {
  constructor(db: DatabaseService) {
    super(db);
  }
}