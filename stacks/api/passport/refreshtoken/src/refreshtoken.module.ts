import {DynamicModule, Module} from "@nestjs/common";
import {SchemaModule} from "@spica-server/core/schema";
import {RefreshTokenController} from "./refreshtoken.controller";
import {RefreshTokenService} from "./refreshtoken.service";
import RefreshTokenSchema = require("./schemas/refreshtoken.json");
import {REFRESHTOKEN_OPTIONS, RefreshTokenOptions} from "./options";
@Module({})
export class RefreshTokenModule {
  static forRoot(options: RefreshTokenOptions): DynamicModule {
    return {
      module: RefreshTokenModule,
      imports: [
        SchemaModule.forChild({
          schemas: [RefreshTokenSchema]
        })
      ],
      exports: [RefreshTokenService],
      controllers: [RefreshTokenController],
      providers: [
        RefreshTokenService,
        {
          provide: REFRESHTOKEN_OPTIONS,
          useValue: options
        },
      ]
    };
  }
}
