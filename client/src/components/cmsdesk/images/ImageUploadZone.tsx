'use client';

import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  error?: string | null;
}

export function ImageUploadZone({
  onFilesSelected,
  isUploading = false,
  error = null,
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter((file) =>
        file.type.startsWith('image/'),
      );
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragGlobal } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
    },
    noClick: true, // Disable dropzone click, we'll use our button
    noKeyboard: true, // Disable keyboard events
  });

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={isDragGlobal ? 'z-100 fixed inset-0' : ''}
      >
        <input {...getInputProps()} onChange={handleFileChange} />

        {isDragGlobal && (
          <>
            <div className="m-4 z-100 fixed inset-0 rounded-lg border-4 border-dashed border-primary pointer-events-none"></div>
            <div className="z-90 fixed inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none bg-background/80 backdrop-blur-sm">
              <Upload className="h-20 w-20 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-3xl">
                  Drop your images here
                </p>
                <p className="text-muted-foreground">Release to upload</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Visible Button */}
      <div className="pointer-events-auto">
        <Button
          onClick={handleButtonClick}
          disabled={isUploading}
          className="flex items-center gap-2"
          variant="default"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading...' : 'Upload Images'}
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="pointer-events-auto mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
}
