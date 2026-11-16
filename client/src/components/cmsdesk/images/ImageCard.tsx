'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ExternalLink, Copy, Check } from 'lucide-react';
import type { IImage } from '@/types/image';

interface ImageCardProps {
  image: IImage;
  onEdit: (image: IImage) => void;
  onDelete: (publicId: string) => Promise<void>;
}

export function ImageCard({ image, onEdit, onDelete }: ImageCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsDeleting(true);
    try {
      await onDelete(image.public_id);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyUrl = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(image.img_url);
      setIsCopied(true);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      alert('Failed to copy URL');
    } finally {
      setIsCopying(false);
    }
  };

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md'>
      {/* Image Container */}
      <div className='relative aspect-square overflow-hidden bg-muted'>
        <Image
          src={image.img_url}
          alt={image.metadata?.alt || 'Gallery image'}
          fill
          className='object-cover transition-transform hover:scale-105'
          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
        />

        {/* Quick Actions Overlay */}
        <div className='absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100'>
          <Button
            variant='outline'
            onClick={handleCopyUrl}
            disabled={isDeleting}
            className='absolute top-4 right-4 aspect-square'
            title='Copy image link'
          >
            {isCopied ? <Check className='h-4' /> : <Copy className='h-4' />}
          </Button>

          <Button
            // variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            title='Delete image'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
          <Button
            onClick={() => window.open(image.img_url, '_blank')}
            disabled={isDeleting}
            variant='outline'
            title='Open image in new tab'
          >
            <ExternalLink className='h-4 w-4' />
          </Button>
          <Button
            onClick={() => onEdit(image)}
            disabled={isDeleting}
            title='Edit image'
          >
            <Edit2 className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Image Info */}
      <div className='space-y-2 p-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex-1 min-w-0'>
            <p className='truncate font-medium text-sm'>
              {image.metadata?.caption ||
                image.public_id.split('/').pop() ||
                'Untitled'}
            </p>
            <p className='text-xs text-muted-foreground'>
              {image.width} × {image.height} • {formatBytes(image.bytes)}
            </p>
          </div>
        </div>

        {image.metadata?.category && (
          <div className='inline-block'>
            <span className='inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground'>
              {image.metadata.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
