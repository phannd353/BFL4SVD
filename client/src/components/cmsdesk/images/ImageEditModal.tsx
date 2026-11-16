"use client";

import { SubmitEventHandler, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { IMAGE_CATEGORIES, CATEGORY_LABELS } from "@/constants/image.category";
import type { ImageCategory } from "@/constants/image.category";
import type { IImage, ImageMetadata } from "@/types/image";

const MAX_ALT_LENGTH = 200;
const MAX_CAPTION_LENGTH = 500;

type MetadataValues = {
  category: ImageCategory;
  alt: string;
  caption: string;
};

type MetadataErrors = Partial<Record<keyof MetadataValues, string>>;

interface ImageEditModalProps {
  image: IImage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    publicId: string,
    metadata: Partial<ImageMetadata>,
  ) => void | Promise<void>;
}

function getImageMetadata(image: IImage | null): MetadataValues {
  const category = IMAGE_CATEGORIES.find(
    (candidate) => candidate === image?.metadata?.category,
  );

  return {
    category: category ?? IMAGE_CATEGORIES[8],
    alt: image?.metadata?.alt ?? "",
    caption: image?.metadata?.caption ?? "",
  };
}

export function ImageEditModal({
  image,
  isOpen,
  onClose,
  onSave,
}: ImageEditModalProps) {
  const [metadata, setMetadata] = useState<MetadataValues>(() =>
    getImageMetadata(image),
  );
  const [errors, setErrors] = useState<MetadataErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMetadata(getImageMetadata(image));
      setErrors({});
      setSaveError(null);
    }
  }, [image, isOpen]);

  const updateMetadata = <K extends keyof MetadataValues>(
    key: K,
    value: MetadataValues[K],
  ) => {
    setMetadata((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSaveError(null);
  };

  const onSubmit: SubmitEventHandler = async (event) => {
    event.preventDefault();
    if (!image) return;

    const validationErrors: MetadataErrors = {};
    if (metadata.alt.length > MAX_ALT_LENGTH) {
      validationErrors.alt = `Alt text must be less than ${MAX_ALT_LENGTH} characters`;
    }
    if (metadata.caption.length > MAX_CAPTION_LENGTH) {
      validationErrors.caption = `Caption must be less than ${MAX_CAPTION_LENGTH} characters`;
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(image.public_id, metadata);
      onClose();
    } catch (error) {
      console.error("Failed to save metadata:", error);
      setSaveError("Failed to save image metadata. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Image Metadata</DialogTitle>
          <DialogDescription>
            Update the title, description, category, alt text, and caption for
            this image.
          </DialogDescription>
        </DialogHeader>

        {image && (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field data-invalid={Boolean(errors.caption)}>
              <FieldLabel htmlFor="image-caption">Caption</FieldLabel>
              <Textarea
                id="image-caption"
                placeholder="Caption to display with the image"
                value={metadata.caption}
                onChange={(event) =>
                  updateMetadata("caption", event.currentTarget.value)
                }
                maxLength={MAX_CAPTION_LENGTH}
                aria-invalid={Boolean(errors.caption)}
                aria-describedby={
                  errors.caption ? "image-caption-error" : "image-caption-help"
                }
                rows={2}
              />
              <FieldDescription id="image-caption-help">
                Displayed below the image in galleries
              </FieldDescription>
              {errors.caption && (
                <FieldError id="image-caption-error">
                  {errors.caption}
                </FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.alt)}>
              <FieldLabel htmlFor="image-alt">Alt Text</FieldLabel>
              <Input
                id="image-alt"
                placeholder="Descriptive alt text for accessibility"
                value={metadata.alt}
                onChange={(event) =>
                  updateMetadata("alt", event.currentTarget.value)
                }
                maxLength={MAX_ALT_LENGTH}
                aria-invalid={Boolean(errors.alt)}
                aria-describedby={
                  errors.alt ? "image-alt-error" : "image-alt-help"
                }
              />
              <FieldDescription id="image-alt-help">
                Used for SEO and accessibility
              </FieldDescription>
              {errors.alt && (
                <FieldError id="image-alt-error">{errors.alt}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="image-category">Category</FieldLabel>
              <Select
                value={metadata.category}
                onValueChange={(value) => {
                  const category = IMAGE_CATEGORIES.find(
                    (candidate) => candidate === value,
                  );
                  if (category) updateMetadata("category", category);
                }}
              >
                <SelectTrigger id="image-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
