import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

// Ensure we only create a single Redis instance in development to avoid connection leaks
const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl || 'redis://localhost:6379');

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
