import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redis.on('error', (err) => {
  process.stderr.write(`Redis error: ${err.message}\n`)
})
