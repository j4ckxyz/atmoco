import { X } from 'lucide-react';
import type { MediaPreview } from '@/types';
import { Button } from '@/components/ui/button';

interface MediaPreviewOverlayProps {
  media: MediaPreview | null;
  onClose: () => void;
}

export default function MediaPreviewOverlay({ media, onClose }: MediaPreviewOverlayProps) {
  if (!media) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="absolute top-3 right-3 md:top-5 md:right-5">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 md:h-9 md:w-9 bg-background/90 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Close media preview"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-w-[92vw] max-h-[88vh] flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
        {media.type === 'image' ? (
          <img
            src={media.src}
            alt={media.alt || 'Media preview'}
            className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <video
            src={media.src}
            poster={media.poster}
            className="max-w-full max-h-[88vh] rounded-lg shadow-2xl"
            controls
            autoPlay
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
}
