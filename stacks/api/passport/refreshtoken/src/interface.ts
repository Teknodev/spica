import {ObjectId} from "@spica-server/database";

export interface RefreshToken {
  _id?: ObjectId;
  identity: string;
  token: string;
  expires_in: Date;
}

export interface PaginationResponse<T> {
  meta: {total: number};
  data: T[];
}