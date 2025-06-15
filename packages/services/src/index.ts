import { createLogger } from '@starter-kit/logger';

const logger = createLogger({
  service: 'services',
  level: 'debug',
});

logger.info('Starting services module...');

export * from "./interfaces";
export * from "./implementations";