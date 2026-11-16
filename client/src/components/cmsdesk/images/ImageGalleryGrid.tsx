'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { IImage } from '@/types/image';
import { ImageCard } from './ImageCard';

interface ImageGalleryGridProps {
  images: IImage[];
  isLoading?: boolean;
  onEdit: (image: IImage) => void;
  onDelete: (publicId: string) => Promise<void>;
  searchQuery?: string;
  categoryFilter?: string;
}

export function ImageGalleryGrid({
  images,
  isLoading = false,
  onEdit,
  onDelete,
  searchQuery = '',
  categoryFilter = '',
}: ImageGalleryGridProps) {
  const filteredImages = useMemo(() => {
    return images.filter((image) => {
      const searchTerm = searchQuery.toLowerCase();
      const caption = image.metadata?.caption || '';
      const alt = image.metadata?.alt || '';
      const category = image.metadata?.category || '';

      const matchesSearch =
        !searchQuery ||
        caption.toLowerCase().includes(searchTerm) ||
        alt.toLowerCase().includes(searchTerm) ||
        image.public_id.toLowerCase().includes(searchTerm);

      const matchesCategory = !categoryFilter || category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [images, searchQuery, categoryFilter]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted">
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading images...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No images yet</p>
          <p className="text-sm text-muted-foreground">
            Upload your first image to get started
          </p>
        </div>
      </div>
    );
  }

  if (filteredImages.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-border bg-muted">
        <p className="mb-4 text-sm font-medium text-foreground">
          No images match your filters
        </p>
        <Button variant="outline" size="sm">
          <RotateCcw className="mr-2 h-4 w-4" />
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredImages.map((image) => (
        <ImageCard
          key={image.public_id}
          image={image}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
