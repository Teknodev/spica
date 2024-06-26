export const IDENTITY_OPTIONS = Symbol.for("IDENTITY_OPTIONS");
export const POLICY_PROVIDER = Symbol.for("POLICY_PROVIDER");

export interface IdentityOptions {
  expiresIn: number;
  maxExpiresIn: number;
  refreshTokenExpiresIn: number;
  issuer: string;
  audience?: string;
  secretOrKey: string;
  defaultIdentityIdentifier?: string;
  defaultIdentityPassword?: string;
  defaultIdentityPolicies?: string[];
  entryLimit?: number;
  blockingOptions: {
    failedAttemptLimit: number;
    blockDurationMinutes: number;
  };
  passwordHistoryUniquenessCount: number;
}
