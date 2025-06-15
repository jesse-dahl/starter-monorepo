import { createLogger } from '@starter-kit/logger';

const logger = createLogger({
  service: 'repositories',
  level: 'debug',
});

logger.info('Starting repositories module...');

export * from './user.repository';