require('dotenv').config({ path: '.env' });
import type { Default, Objectype, Production } from './config.interface';
import { config as defaultConfig } from './envs/default';
import { config as developmentConfig } from './envs/development';
import { config as productionConfig } from './envs/production';

const util = {
  isObject<T>(value: T): value is T & Objectype {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  },
  merge<T extends Objectype, U extends Objectype>(target: T, source: U): T & U {
    for (const key of Object.keys(source)) {
      const targetValue = target[key];
      const sourceValue = source[key] as any;
      if (this.isObject(targetValue) && this.isObject(sourceValue)) {
        Object.assign(sourceValue, this.merge(targetValue, sourceValue));
      }
    }

    return { ...target, ...source };
  },
};

const envConfigs: Record<string, Production | Default> = {
  development: developmentConfig as any,
  production: productionConfig,
  test: developmentConfig as any, // or create a test config
};

export const configuration = () => {
  const env = process.env.NODE_ENV || 'development';
  const envConfig = envConfigs[env] || developmentConfig;

  return util.merge(defaultConfig, envConfig);
};
