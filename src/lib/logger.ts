type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, meta?: unknown) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Structured JSON logging for production
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(meta instanceof Error 
            ? { error: { message: meta.message, stack: meta.stack, name: meta.name } } 
            : { meta })
      };
      // eslint-disable-next-line no-console
      console[level](JSON.stringify(logEntry));
    } else {
      // Pretty logging for development
      const prefix = `[${level.toUpperCase()}] ${new Date().toLocaleTimeString()}:`;
      if (meta instanceof Error) {
        // eslint-disable-next-line no-console
        console[level](prefix, message, '\\n', meta.stack);
      } else if (meta !== undefined) {
        // eslint-disable-next-line no-console
        console[level](prefix, message, meta);
      } else {
        // eslint-disable-next-line no-console
        console[level](prefix, message);
      }
    }
  }

  info(message: string, meta?: unknown) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: unknown) {
    this.log('error', message, meta);
  }

  debug(message: string, meta?: unknown) {
    this.log('debug', message, meta);
  }
}

export const logger = new Logger();
