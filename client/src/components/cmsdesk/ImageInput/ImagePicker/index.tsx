"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ImagePreview from "../ImagePreview";
import ImageUploader from "./ImageUploader";
import ImageMetadata from "./ImageMetadata";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { useImages } from "@/hooks/useImages";

interface ImagePickerProps {
  selected?: string;
  defaultActiveTab?: number;
  onClose: () => void;
  onSelect: (selectedImage: string) => void;
}

export default function ImagePicker({
  selected,
  defaultActiveTab = 2,
  onClose,
  onSelect,
}: ImagePickerProps) {
  const { images, isLoading, deleteImage, mutate } = useImages();
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    selected,
  );
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
  };

  const handleConfirm = () => {
    if (!selectedImage) {
      toast.error("No image selected");
      return;
    }
    onSelect(selectedImage);
    onClose();
  };

  useEffect(() => {
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", escapeHandler);

    return () => {
      document.removeEventListener("keydown", escapeHandler);
    };
  }, [onClose]);

  const handleDeleteImages = async () => {
    const toastId = toast.loading("Deleting images...");
    setIsDeletingImage(true);

    try {
      const img = images.find((img) => img.img_url == selectedImage);
      if (!img) {
        toast.dismiss(toastId);
        toast.error("Selected image not found");
        return;
      }
      await deleteImage(img.public_id);

      toast.dismiss(toastId);
      toast.success(`Image deleted successfully`);

      // Remove deleted images from state
      setSelectedImage("");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to delete images");
    } finally {
      setIsDeletingImage(false);
      mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-8 z-50">
      <Card className="flex flex-col gap-4 p-6 rounded-lg shadow-lg w-full h-full overflow-y-auto">
        <div className="grow grid grid-cols-12 divide-x gap-4">
          <div
            className={`${
              activeTab === 1 ? "col-span-12" : "col-span-9"
            } grow w-full h-full divide-y transition-all`}
          >
            <div className="w-full flex gap-4 px-4">
              <button
                className={`-mb-px rounded-t px-2 py-1 ${
                  activeTab === 1 ? "border" : ""
                }`}
                onClick={() => setActiveTab(1)}
                type="button"
              >
                Tải lên tệp mới
              </button>
              <button
                className={`-mb-px rounded-t px-2 py-1 ${
                  activeTab === 2 ? "border" : ""
                }`}
                onClick={() => setActiveTab(2)}
                type="button"
              >
                Chọn từ thư viện Media
              </button>
            </div>

            {activeTab === 1 && (
              <ImageUploader
                handleImageUploaded={(images) => {
                  setSelectedImage(images[0].img_url);
                  mutate();

                  setActiveTab(2);
                }}
              />
            )}
            {activeTab === 2 && (
              <div className="grid grid-cols-8 gap-4 pt-4 px-4">
                {isLoading && (
                  <>
                    {Array.from({ length: 16 }).map((_, index) => (
                      <div
                        key={index}
                        className="border-2 rounded-lg aspect-square animate-pulse bg-zinc-300"
                      ></div>
                    ))}
                  </>
                )}
                {!isLoading &&
                  images.map((image) => (
                    <div
                      key={image.public_id}
                      className={`border-2 rounded-lg aspect-square cursor-pointer flex justify-center items-center transition-all ${
                        image?.img_url === selectedImage
                          ? "border-blue-500"
                          : "border-gray-300"
                      } overflow-hidden hover:border-blue-400`}
                      onClick={() => handleImageClick(image.img_url)}
                    >
                      <img
                        src={image.img_url}
                        alt={`Image`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {activeTab === 1 || (
            <div className="col-span-3 h-full pl-4 flex flex-col gap-4">
              {selectedImage && <ImagePreview src={selectedImage} />}
              {selectedImage && (
                <ImageMetadata
                  image={images.find((img) => img.img_url === selectedImage)}
                />
              )}
            </div>
          )}
        </div>

        <div className="h-fit flex justify-between gap-4">
          <div className="flex gap-4">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading || isDeletingImage}
            >
              Hủy bỏ
            </Button>

            {selectedImage && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="destructive" disabled={isLoading} />}
                >
                  Xóa ảnh
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Xóa ảnh đã chọn</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa ảnh này? Hành động này không thể
                    hoàn tác.
                  </AlertDialogDescription>
                  <div className="flex justify-end gap-2">
                    <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteImages}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Xóa
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {selectedImage && (
              <Link
                href={selectedImage}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                Xem chi tiết
              </Link>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={isLoading || !selectedImage}
          >
            Xác nhận
          </Button>
        </div>
      </Card>
    </div>
  );
}
