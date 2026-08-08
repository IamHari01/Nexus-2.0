import Redis from 'ioredis';
import { env } from './env';

const redisUrl = env.REDIS_URL;

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: Redis | undefined;
}

export const redis =
  global.redisGlobal ??
  new Redis(redisUrl || 'redis://localhost:6379');

if (env.NODE_ENV !== 'production') global.redisGlobal = redis;
