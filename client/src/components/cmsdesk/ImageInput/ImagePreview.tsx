import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ImagePreview({
  src,
  handleOpenPicker,
}: {
  src: string;
  handleOpenPicker?: () => void;
}) {
  return (
    <Card className="relative w-full flex justify-center p-2 border-border shadow-sm">
      <img src={src} alt="preview" className="w-full h-40 object-contain" />

      {handleOpenPicker && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute top-2 right-4"
          onClick={handleOpenPicker}
        >
          Thay đổi
        </Button>
      )}
    </Card>
  );
}
