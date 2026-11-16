import NextImage from "next/image";
import { PropsWithChildren, ImgHTMLAttributes } from "react";

export default function Image({
  title = "Image not found",
  src = "/assets/image/not-found.webp",
  alt = "Image not found",
  ...props
}: PropsWithChildren<ImgHTMLAttributes<HTMLElement>>) {
  return (
    <figure className="max-w-[1200px] max-h-[800px] overflow-hidden">
      <NextImage
        {...props}
        width={1200}
        height={800}
        src={src as string}
        alt={alt}
        title={title}
        loading="lazy"
        // className="w-full h-full object-cover object-center"
      />
      {title && <figcaption>{title}</figcaption>}
    </figure>
  );
}
