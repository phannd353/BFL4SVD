export interface CommonOptionDto {
  configuration: () => Record<string, any>;
  global?: boolean;
  cachePrefix: string;
}
