"use client";

import { useRef, useCallback } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { IImage } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useImages } from "@/hooks/useImages";

export default function ImageUploader({
  multiple = true,
  handleImageUploaded,
  folder = "bfl4svd",
  ...props
}: {
  handleImageUploaded: (images: IImage[]) => void;
  folder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImages, isUploading } = useImages();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      toast.error("No image selected");
      return;
    }

    await handleUpload(Array.from(files));
  };

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) {
        toast.error("No image selected");
        return;
      }

      const toastId = toast.loading("Uploading image...");

      try {
        const uploadedImages = await uploadImages(files);

        if (!uploadedImages || uploadedImages.length === 0) {
          toast.dismiss(toastId);
          toast.error("Failed to upload images");
          return;
        }

        toast.dismiss(toastId);
        toast.success(
          `Successfully uploaded ${uploadedImages.length} image(s)`,
        );
        handleImageUploaded(uploadedImages);

        // Reset input
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      } catch (err: any) {
        toast.dismiss(toastId);
        const errorMessage = err.message || "Failed to upload images";
        toast.error(errorMessage);
      }
    },
    [folder, handleImageUploaded],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter((file) => {
        return file.type.startsWith("image/");
      });

      if (imageFiles.length === 0) {
        toast.error("Please drop valid image files");
        return;
      }

      if (!multiple && imageFiles.length > 1) {
        toast.error("Only one image can be uploaded at a time");
        return;
      }

      handleUpload(imageFiles);
    },
    [multiple, handleUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    disabled: isUploading,
    multiple,
  });

  return (
    <div className="flex gap-4 items-center justify-center h-full w-full">
      <Card
        {...getRootProps()}
        className={`w-1/2 cursor-pointer border-2 border-dashed transition-all ${
          isDragActive
            ? "border-blue-500 bg-primary/5 shadow-md"
            : "border-primary hover:border-primary/80 hover:bg-muted"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            multiple={multiple}
            onChange={handleFileChange}
            {...getInputProps()}
            {...props}
          />

          <UploadCloud
            className={`w-8 h-8 mb-2 transition-colors ${
              isDragActive ? "text-blue-500" : "text-primary"
            }`}
          />

          <h2 className="text-xl font-semibold tracking-wide">
            {isDragActive ? "Drop images here" : "Upload Image"}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground tracking-wide">
            {isDragActive
              ? "Release to upload"
              : "Drag and drop images here, or click to select"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            SVG, PNG, JPG, GIF or WebP (Max 10MB)
          </p>

          <Button
            className="mt-4"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={(e) => {
              e.preventDefault();
              inputRef.current?.click();
            }}
          >
            {isUploading ? "Uploading..." : "Select Files"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
