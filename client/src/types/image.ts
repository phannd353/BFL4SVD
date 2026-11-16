import type { ImageCategory } from '@/constants/image.category';

export interface ImageMetadata {
  category?: ImageCategory;
  alt?: string;
  caption?: string;
  transformations?: Record<string, string>;
}

export interface IImage {
  public_id: string;
  img_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  metadata?: ImageMetadata;
  created_at?: string;
  updated_at?: string;
}
