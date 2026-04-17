export type WorkerEnv = Env & {
  AUTH_COOKIE_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  KAKAO_OAUTH_CLIENT_ID: string;
  KAKAO_OAUTH_CLIENT_SECRET: string;
  NAVER_OAUTH_CLIENT_ID: string;
  NAVER_OAUTH_CLIENT_SECRET: string;
  TOSS_PAYMENTS_CLIENT_KEY: string;
  TOSS_PAYMENTS_SECRET_KEY: string;
  TOSS_PAYMENTS_ENVIRONMENT: "test" | "live";
  TOSS_PAYMENTS_API_BASE_URL?: string;
  DB: D1Database;
};

export type WorkerEnvKey = Exclude<keyof WorkerEnv, "DB">;
