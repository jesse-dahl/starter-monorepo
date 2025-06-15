import { createLogger } from '@starter-kit/logger';

const logger = createLogger({
  service: 'api',
  level: 'debug',
});

logger.info('Starting API module...');

export * from './modules';