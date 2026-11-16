import { useEffect, useState } from 'react';

import { IImage } from '@/types/image';
import { toVnDateString } from '@/utils/date.util';

export default function ImageMetadata({ image }: { image?: IImage }) {
  if (!image) {
    return (
      <div className="bg-white rounded-lg p-4 animate-pulse">
        <div className="w-2/3 h-4 bg-zinc-300 rounded mb-2"></div>
        <div className="w-full h-8 bg-zinc-300 rounded mb-2"></div>
        <div className="w-full h-8 bg-zinc-300 rounded mb-2"></div>
        <div className="w-1/2 h-8 bg-zinc-300 rounded"></div>
      </div>
    );
  }
  const [dimension, setDimension] = useState('0x0');
  const [size, setSize] = useState(0);
  const [type, setType] = useState('image/jpeg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const img = new Image();
        const res = await fetch(image.img_url);
        if (!res.ok) {
          throw new Error('Failed to fetch image');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          setDimension(`${img.naturalWidth}x${img.naturalHeight}`);
          setSize(blob.size / 1024);
          setType(blob.type);
          setLoading(false);
        };
        img.src = url;
      } catch (error) {
        console.error('Error loading image metadata:', error);
        setDimension('0x0');
        setSize(0);
        setType('image/jpeg');
        setLoading(false);
      }
    })();
  }, [image?.img_url]);

  return loading ? (
    <div className="bg-white rounded-lg p-4 animate-pulse">
      <div className="w-2/3 h-4 bg-zinc-300 rounded mb-2"></div>
      <div className="w-full h-8 bg-zinc-300 rounded mb-2"></div>
      <div className="w-full h-8 bg-zinc-300 rounded mb-2"></div>
      <div className="w-1/2 h-8 bg-zinc-300 rounded"></div>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <p>
        <b>Đã tải lên lúc: </b>
        {toVnDateString(image.created_at || '')}
      </p>

      <p className="truncate">
        <b>Tên tệp tin: </b>
        {image.metadata?.caption || image.public_id}
      </p>
      <p>
        <b>Đường dẫn: </b>
        <a
          href={image.img_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline text-primary hover:underline text-sm break-all"
        >
          {image.img_url}
        </a>
      </p>
      <p>
        <b>Loại tệp tin: </b>
        {type}
      </p>
      <p>
        <b>Dung lượng tệp: </b>
        {size.toFixed(1)} KB
      </p>
      <p>
        <b>Kích thước: </b>
        {dimension} px
      </p>
    </div>
  );
}
