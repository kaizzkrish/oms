export interface JwtAccessPayload {
  sub: string;
  email: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;
  /**
   * Random per-issuance identifier. Without this, two refresh tokens for
   * the same session issued within the same second (identical sub/sid/iat)
   * would be byte-for-byte identical, defeating reuse detection.
   */
  jti: string;
  iat?: number;
  exp?: number;
}
