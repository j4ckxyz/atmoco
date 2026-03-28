import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import html2canvas from 'html2canvas';

interface StreamPlayerProps {
  handle: string;
}

export default function StreamPlayer({ handle }: StreamPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const embedUrl = `https://stream.place/embed/${handle}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const takeScreenshot = async () => {
    if (!containerRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Capture the entire stream container including the iframe
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        scale: 2, // Higher quality
        logging: false,
        onclone: (clonedDoc) => {
          // Hide controls in the screenshot
          const controls = clonedDoc.querySelector('.screenshot-controls');
          if (controls) {
            (controls as HTMLElement).style.display = 'none';
          }
        }
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png', 1.0);
      });

      // Copy to clipboard using modern Clipboard API
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      // Show success feedback
      alert('Screenshot copied to clipboard! 📸\n\nYou can now paste it anywhere (Ctrl/Cmd+V)');
      
    } catch (err) {
      console.error('Screenshot failed:', err);
      
      // Fallback: Try to open stream in new window for manual screenshot
      const streamUrl = `https://stream.place/${handle}`;
      alert(
        `Screenshot failed. This may be due to browser security restrictions.\n\n` +
        `Alternative: Opening stream in new window...\n` +
        `Use your browser's screenshot tool to capture it.`
      );
      window.open(streamUrl, '_blank');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-background"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center space-y-2">
            <LoadingSpinner />
            <p className="text-sm text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center p-4 space-y-4">
            <p className="text-destructive mb-2">Failed to load stream</p>
            <p className="text-sm text-muted-foreground">{handle}</p>
            <Button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (iframeRef.current) {
                  iframeRef.current.src = embedUrl;
                }
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Floating controls overlay */}
      {!isLoading && !hasError && showControls && (
        <div className="screenshot-controls absolute top-2 right-2 z-20 flex gap-2 animate-in fade-in-0 duration-150">
          <Button
            size="icon"
            variant="secondary"
            onClick={takeScreenshot}
            disabled={isCapturing}
            className="bg-background/90 backdrop-blur-sm hover:bg-background rounded-md shadow-sm"
            title="Take screenshot and copy to clipboard"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        onError={handleError}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
