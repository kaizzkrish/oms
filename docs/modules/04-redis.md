# Module 04 — Redis

## Status: Complete

## What was built

- `backend/src/redis/redis.service.ts` — `RedisService` extends `ioredis`'s
  `Redis` client directly (lazy-connect, connects/disconnects on Nest
  lifecycle hooks), configured from `REDIS_URL` if set, otherwise
  `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`.
- `backend/src/redis/redis.module.ts` — `@Global` `RedisModule` exporting
  `RedisService`, so any future module (session/JWT blacklist in
  Authentication, BullMQ queues, Notifications) can inject it directly.
- Wired into `AppModule` alongside `PrismaModule`.
- Verified against the dockerized Redis container: a full Nest app boot
  connects successfully (`RedisService` logs "Connected to Redis") and
  unit tests pass.

## Notes

- BullMQ queue registration is deferred to whichever module first needs a
  queue (e.g. email sending in Authentication, or Notifications) rather
  than being generically scaffolded here with no consumer — avoids
  placeholder code per the project's "never generate placeholder
  implementations" rule.
- The JWT blacklist and session-cache usage described in the architecture
  decisions will be implemented as part of the Authentication module
  (Step 7), using this same `RedisService`.
