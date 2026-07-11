/**
 * Tiny structured-logging shim. Emits one JSON object per line so logs are
 * greppable and ingestible by any collector. Swap the sink for pino/winston or
 * ship to your platform without touching call sites.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

const WEIGHT: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const threshold =
  WEIGHT[(process.env.LOG_LEVEL as Level) ?? 'debug'] ??
  (process.env.NODE_ENV === 'production' ? WEIGHT.info : WEIGHT.debug)

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (WEIGHT[level] < threshold) return
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    emit('error', message, meta),
}
