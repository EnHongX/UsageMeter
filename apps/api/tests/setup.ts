process.env.NODE_ENV = "test";
process.env.API_PORT = "7612";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://usagemeter:usagemeter@localhost:55432/usagemeter?schema=test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? "test-pepper";
