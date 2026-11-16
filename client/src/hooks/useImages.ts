"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import type { IImage, ImageMetadata } from "@/types/image";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface UseImagesOptions {
  folder?: string;
}

export function useImages(options: UseImagesOptions = {}) {
  const { folder = "bfl4svd" } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ images: IImage[] }>(
    `/api/images?folder=${folder}`,
    fetcher,
  );

  const uploadImages = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append("folder", folder);

        files.forEach((file) => {
          formData.append("image", file);
        });

        const response = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to upload images");
        }

        const result = await response.json();

        // Revalidate the gallery
        await mutate();

        return result.images;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [folder, mutate],
  );

  const deleteImage = useCallback(
    async (publicId: string) => {
      try {
        const response = await fetch("/api/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: publicId }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete image");
        }

        // Revalidate the gallery
        await mutate();
      } catch (err) {
        console.error("Delete error:", err);
        throw err;
      }
    },
    [mutate],
  );

  const updateImage = useCallback(
    async (publicId: string, metadata: Partial<ImageMetadata>) => {
      try {
        const response = await fetch("/api/images", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: publicId, metadata }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete image");
        }

        // Revalidate the gallery
        await mutate();
      } catch (err) {
        console.error("Delete error:", err);
        throw err;
      }
    },
    [mutate],
  );

  return {
    images: data?.images || [],
    isLoading,
    error: error?.message || uploadError,
    uploadImages,
    deleteImage,
    mutate,
    isUploading,
    updateImage,
  };
}
