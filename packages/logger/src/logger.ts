import pino from 'pino';
import type { DestinationStream } from 'pino';
import { env } from '@starter-kit/env';
import type { LoggerOptions, Logger, LogContext, LogLevel } from './types';

/**
 * Creates a Pino logger instance with
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  // Safely get environment variables with fallbacks. We attempt to use the
  // shared `@starter-kit/env` helper first (works in Node.js). If that throws (e.g.
  // when running in the browser) we fall back to defaults, **without**
  // touching `process` when it isn't defined.
  let environment;
  try {
    environment = env();
  } catch {
    const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
    environment = {
      LOG_LEVEL: nodeEnv?.LOG_LEVEL ?? 'debug',
      NODE_ENV: nodeEnv?.NODE_ENV ?? 'development',
      LOG_TARGET: nodeEnv?.LOG_TARGET ?? 'stdout',
    };
  }
  
  const {
    level = (environment.LOG_LEVEL as LogLevel) || 'info',
    prettyPrint = environment.NODE_ENV === 'development',
    transports = [],
    service,
    environment: envContext = environment.NODE_ENV,
    ...pinoOptions
  } = options;

  /**
   * Build a transport stream based purely on environment variables.
   * This allows swapping log providers (Grafana Loki, BetterStack, etc.)
   * without changing application code – just tweak LOG_TARGET + creds.
   */
  const buildEnvTransport = (): DestinationStream | undefined => {
    const target = (environment.LOG_TARGET || 'stdout').toLowerCase();
    if (!target || target === 'stdout') return undefined;

    // Lazily require optional deps so they don't break front-end bundles
    const safeRequire = (mod: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(mod);
      } catch {
        return undefined;
      }
    };

    if (target === 'betterstack' || target === 'logtail') {
      const sourceToken = env().LOGTAIL_SOURCE_TOKEN;
      const endpoint = env().LOGTAIL_ENDPOINT;
      
      if (!sourceToken) {
        console.warn('[logger] Missing BETTERSTACK_SOURCE_TOKEN or LOGTAIL_SOURCE_TOKEN env var for BetterStack target');
        return undefined;
      }
      
      return pino.transport({
        target: '@logtail/pino',
        options: {
          sourceToken,
          ...(endpoint && { options: { endpoint } }),
        },
      });
    }

    if (target === 'http') {
      const pinoHttpSend = safeRequire('pino-http-send');
      if (!pinoHttpSend) {
        console.warn('[logger] LOG_TARGET set to "http" but pino-http-send is not installed');
        return undefined;
      }
      const url = env().LOG_HTTP_URL;
      const apiToken = env().LOG_HTTP_TOKEN;
      if (!url || !apiToken) {
        console.warn('[logger] Missing LOG_HTTP_URL or LOG_HTTP_TOKEN env vars');
        return undefined;
      }
      return pinoHttpSend({
        url,
        headers: { Authorization: `Bearer ${apiToken}` },
      });
    }

    console.warn(`[logger] Unknown LOG_TARGET "${target}" – falling back to stdout`);
    return undefined;
  };

  // Collect destination streams in order: custom, env-derived, pretty-print
  const destinationStreams: DestinationStream[] = [];

  // 1. explicit custom streams passed in options
  if (transports.length > 0) destinationStreams.push(...transports);

  // 2. env-driven transport (only if no custom)
  if (transports.length === 0) {
    const envTransport = buildEnvTransport();
    if (envTransport) destinationStreams.push(envTransport);
  }

  // 3. pretty printer for local dev (can coexist for dual-write)
  if (prettyPrint) {
    const prettyTransport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: service ? `[${service}] {msg}` : '{msg}',
        errorLikeObjectKeys: ['err', 'error'],
      },
    });
    destinationStreams.push(prettyTransport);
  }

  // Base configuration
  const baseConfig: pino.LoggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      // Only apply level formatter when not using external transports that handle their own formatting
      ...(environment.LOG_TARGET === 'betterstack' || environment.LOG_TARGET === 'logtail' ? {} : {
        level: (label) => ({ level: label }),
      }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        ...(service && { service }),
        ...(envContext && { environment: envContext }),
      }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    ...pinoOptions,
  };

  // Create the Pino logger instance based on how many streams we collected
  const pinoLogger = destinationStreams.length === 0
    ? pino(baseConfig)
    : destinationStreams.length === 1
    ? pino(baseConfig, destinationStreams[0])
    : pino(
        baseConfig,
        pino.multistream(
          destinationStreams.map((stream) => ({ stream, objectMode: true }))
        )
      );

  // Helper function to process log arguments
  const processLogArgs = (messageOrError: string | Error, context?: LogContext) => {
    if (messageOrError instanceof Error) {
      return {
        msg: messageOrError.message,
        err: messageOrError,
        ...context,
      };
    }
    return {
      msg: messageOrError,
      ...context,
    };
  };

  // Create the Logger interface
  const logger: Logger = {
    trace: (message: string, context?: LogContext) => {
      pinoLogger.trace(processLogArgs(message, context));
    },
    
    debug: (message: string, context?: LogContext) => {
      pinoLogger.debug(processLogArgs(message, context));
    },
    
    info: (message: string, context?: LogContext) => {
      pinoLogger.info(processLogArgs(message, context));
    },
    
    warn: (message: string, context?: LogContext) => {
      pinoLogger.warn(processLogArgs(message, context));
    },
    
    error: (messageOrError: string | Error, context?: LogContext) => {
      pinoLogger.error(processLogArgs(messageOrError, context));
    },
    
    fatal: (messageOrError: string | Error, context?: LogContext) => {
      pinoLogger.fatal(processLogArgs(messageOrError, context));
    },
    
    child: (bindings: LogContext): Logger => {
      const childPino = pinoLogger.child(bindings);
      
      return {
        trace: (message: string, context?: LogContext) => {
          childPino.trace(processLogArgs(message, context));
        },
        debug: (message: string, context?: LogContext) => {
          childPino.debug(processLogArgs(message, context));
        },
        info: (message: string, context?: LogContext) => {
          childPino.info(processLogArgs(message, context));
        },
        warn: (message: string, context?: LogContext) => {
          childPino.warn(processLogArgs(message, context));
        },
        error: (messageOrError: string | Error, context?: LogContext) => {
          childPino.error(processLogArgs(messageOrError, context));
        },
        fatal: (messageOrError: string | Error, context?: LogContext) => {
          childPino.fatal(processLogArgs(messageOrError, context));
        },
        child: (childBindings: LogContext) => logger.child({ ...bindings, ...childBindings }),
      };
    },
  };

  return logger;
} 