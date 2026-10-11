import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
} from '../common.module-definition';
import { RedisService, type RedisServiceType } from './redis.service';

@Injectable()
export class UtilService {
  constructor(
    @Inject(RedisService) private readonly redisService: RedisServiceType,
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: typeof OPTIONS_TYPE,
  ) {}

  omit<T = Object>(obj: T, fields?: string[]): Partial<T> {
    if (!fields || !fields.length) return obj;

    return (Object.keys(obj as Object) as Array<keyof typeof obj>).reduce<
      Partial<T>
    >((object, field) => {
      if (!fields.includes(field as string)) object[field] = obj[field];

      return object;
    }, {});
  }

  isNullish = (val: any) => (val ?? null) === null;
  isEmptyObj = (obj: Object) => !Object.keys(obj).length;
  getSkipNumber = (limit: number, page: number) => limit * (page - 1);
  isObj = (obj: any) => obj instanceof Object && !Array.isArray(obj);
  capitalizeFirstLetter = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  removeNullishElements(arr: Array<any>) {
    const final: typeof arr = [];

    arr.forEach((ele) => {
      if (!this.isNullish(ele) && ele !== '') {
        const result = this.removeNestedNullish(ele);
        if (result instanceof Object && this.isEmptyObj(result)) return;

        final[final.length] = result;
      }
    });

    return final.filter((ele) => !this.isNullish(ele) && ele);
  }

  removeNullishAttributes(obj: Record<string, any>) {
    const final: typeof obj = {};

    (Object.keys(obj) as Array<keyof typeof obj>).forEach((key) => {
      if (!this.isNullish(obj[key]) && obj[key] !== '') {
        const result = this.removeNestedNullish(obj[key]);

        if (result instanceof Object && this.isEmptyObj(result)) return;

        final[key] = result;
      }
    });

    return final;
  }

  removeNestedNullish<T>(any: any): T {
    if (any instanceof Array)
      return this.removeNullishElements(any as Array<any>) as T;
    if (any instanceof Object)
      return this.removeNullishAttributes(any as Object) as T;

    return any;
  }

  removeNestedUndefined<T>(any: any): T {
    if (any instanceof Array)
      return this.removeUndefinedElements(any as Array<any>) as T;
    if (any instanceof Object)
      return this.removeUndefinedAttributes(any as Object) as T;

    return any;
  }

  removeUndefinedAttributes(obj: Record<string, any>) {
    const final: typeof obj = {};

    (Object.keys(obj) as Array<keyof typeof obj>).forEach((key) => {
      if (obj[key] !== undefined) {
        const result = this.removeNestedUndefined(obj[key]);

        if (result instanceof Object && this.isEmptyObj(result)) return;

        final[key] = result;
      }
    });

    return final;
  }

  removeUndefinedElements(arr: Array<any>) {
    const final: typeof arr = [];

    arr.forEach((ele) => {
      if (ele !== undefined) {
        const result = this.removeNestedUndefined(ele);
        if (result instanceof Object && this.isEmptyObj(result)) return;

        final[final.length] = result;
      }
    });

    return final.filter((ele) => ele !== undefined);
  }

  genCacheKey(...args: any[]) {
    return (
      this.options.cachePrefix +
      '|' +
      args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(':')
    );
  }

  /**
   *  Only use inside request/response cycle
   */
  async handleHashCachingQuery<T>(
    {
      cacheKey,
      hashAttribute,
      notFoundMessage = 'Dữ liệu không tồn tại',
    }: {
      cacheKey: string;
      hashAttribute: any;
      notFoundMessage?: string;
    },
    fetcher: () => Promise<T | null>,
  ): Promise<T> {
    let data: T | null = await this.redisService.hGet(
      cacheKey,
      JSON.stringify(hashAttribute),
    );
    if (data) {
      if (data === 'null')
        throw new HttpException(notFoundMessage, HttpStatus.NOT_FOUND);
      return data;
    }

    data = await fetcher();

    await this.redisService.hSet(
      cacheKey,
      JSON.stringify(hashAttribute),
      data,
      30 * 60, // longer caching time than gateway to protect database
    );
    if (!data) {
      throw new HttpException(notFoundMessage, HttpStatus.NOT_FOUND);
    }

    return data;
  }
}
