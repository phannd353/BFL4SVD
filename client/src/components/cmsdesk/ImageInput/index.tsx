'use client';

import { UploadCloud } from 'lucide-react';
import ImagePreview from './ImagePreview';
import ImagePicker from './ImagePicker';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function ImageInput({
  label,
  name,
  value,
  onChange,
  ...props
}: {
  name: string;
  label?: string;
  value?: string;
  onChange: (value: string, ...args: any) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const [showPicker, setShowPicker] = useState(false);

  const handleOpenPicker = () => {
    setShowPicker(true);
  };

  const handleClosePicker = () => {
    setShowPicker(false);
  };

  return (
    <div className="space-y-4">
      {label && <Label>{label}</Label>}

      <div className="flex items-center justify-center">
        {!!value ? (
          <div className="space-y-2 w-full">
            <ImagePreview src={value} handleOpenPicker={handleOpenPicker} />
          </div>
        ) : (
          <Card
            className="w-full cursor-pointer border-2 border-dashed border-primary hover:border-primary/80 hover:bg-muted transition-colors"
            onClick={handleOpenPicker}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <UploadCloud className="w-8 h-8 text-primary mb-2" />

              <h2 className="text-lg font-semibold tracking-wide">
                {label || 'Upload Image'}
              </h2>

              <p className="mt-2 text-sm text-muted-foreground tracking-wide">
                SVG, PNG, JPG or GIF
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                type="button"
              >
                Select File
              </Button>
            </CardContent>
          </Card>
        )}

        <input type="hidden" name={name} value={value || ''} {...props} />
      </div>

      {showPicker && (
        <ImagePicker
          selected={value}
          onClose={handleClosePicker}
          onSelect={onChange}
        />
      )}
    </div>
  );
}
