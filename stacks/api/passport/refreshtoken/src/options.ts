export const BLACKLISTEDTOKEN_OPTIONS = Symbol.for("BLACKLISTEDTOKEN_OPTIONS");

export interface RefreshTokenOptions {
  refreshTokenExpiresIn: number;
}
