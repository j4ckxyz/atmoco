import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, MessageSquare, ExternalLink, X, Minus, Plus, GripHorizontal } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import html2canvas from 'html2canvas';

interface ChatWindowLayout {
  width: number;
  height: number;
  x: number;
  y: number;
}

const MIN_CHAT_SCALE = 0.75;
const MAX_CHAT_SCALE = 1.3;
const CHAT_SCALE_STEP = 0.1;

function getViewport(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function getDefaultChatLayout(): ChatWindowLayout {
  const { width: viewportWidth, height: viewportHeight } = getViewport();
  const width = Math.min(420, Math.max(300, Math.floor(viewportWidth * 0.36)));
  const height = Math.min(560, Math.max(360, Math.floor(viewportHeight * 0.72)));
  const x = Math.max(12, viewportWidth - width - 12);
  const y = Math.max(60, Math.min(84, viewportHeight - height - 12));

  return { width, height, x, y };
}

function clampLayout(layout: ChatWindowLayout): ChatWindowLayout {
  const { width: viewportWidth, height: viewportHeight } = getViewport();
  const width = Math.min(layout.width, viewportWidth - 12);
  const height = Math.min(layout.height, viewportHeight - 12);

  const maxX = Math.max(0, viewportWidth - width - 6);
  const maxY = Math.max(0, viewportHeight - height - 6);

  return {
    width,
    height,
    x: Math.max(6, Math.min(layout.x, maxX)),
    y: Math.max(6, Math.min(layout.y, maxY)),
  };
}

function getLayoutForStream(streamRect?: DOMRect): ChatWindowLayout {
  const fallback = getDefaultChatLayout();
  if (!streamRect) {
    return fallback;
  }

  return clampLayout({
    width: Math.min(420, Math.max(300, Math.floor(streamRect.width * 0.68))),
    height: Math.min(560, Math.max(340, Math.floor(streamRect.height * 0.98))),
    x: Math.floor(streamRect.left + 14),
    y: Math.floor(streamRect.top + 14),
  });
}

interface StreamPlayerProps {
  handle: string;
}

export default function StreamPlayer({ handle }: StreamPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; startWindowX: number; startWindowY: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLayout, setChatLayout] = useState<ChatWindowLayout>(() => getDefaultChatLayout());
  const [chatScale, setChatScale] = useState(0.9);

  const embedUrl = `https://stream.place/embed/${handle}`;
  const chatUrl = `https://stream.place/chat-popout/${handle}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsChatOpen(false);
      }
    };

    const onResize = () => {
      setChatLayout((previous) => clampLayout(previous));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isChatOpen]);

  const handleChatDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWindowX: chatLayout.x,
      startWindowY: chatLayout.y,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || moveEvent.pointerId !== dragState.pointerId) {
        return;
      }

      const deltaX = moveEvent.clientX - dragState.startX;
      const deltaY = moveEvent.clientY - dragState.startY;

      setChatLayout((previous) =>
        clampLayout({
          ...previous,
          x: dragState.startWindowX + deltaX,
          y: dragState.startWindowY + deltaY,
        }),
      );
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || upEvent.pointerId !== dragState.pointerId) {
        return;
      }

      dragStateRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const openChatWindow = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    setChatLayout(getLayoutForStream(rect));
    setIsChatOpen(true);
  };

  const openChatInNewTab = () => {
    window.open(chatUrl, '_blank', 'noopener,noreferrer');
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

      {typeof document !== 'undefined' && isChatOpen && createPortal(
        isTouchDevice ? (
          <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm p-2" onClick={() => setIsChatOpen(false)}>
            <div
              className="h-full w-full rounded-xl border border-border/70 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-11 px-3 border-b border-border/70 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Live Chat</p>
                  <p className="text-[10px] text-muted-foreground truncate">@{handle}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setChatScale((previous) => Math.max(MIN_CHAT_SCALE, Number((previous - CHAT_SCALE_STEP).toFixed(2))))}
                    title="Smaller text"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <div className="w-10 text-center text-[10px] text-muted-foreground tabular-nums">
                    {Math.round(chatScale * 100)}%
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setChatScale((previous) => Math.min(MAX_CHAT_SCALE, Number((previous + CHAT_SCALE_STEP).toFixed(2))))}
                    title="Bigger text"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={openChatInNewTab}
                    title="Open chat in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsChatOpen(false)}
                    title="Close chat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="relative h-[calc(100%-44px)] overflow-hidden bg-black">
                <iframe
                  src={chatUrl}
                  title={`Stream chat for ${handle}`}
                  className="absolute left-0 top-0 border-0"
                  style={{
                    width: `${100 / chatScale}%`,
                    height: `${100 / chatScale}%`,
                    transform: `scale(${chatScale})`,
                    transformOrigin: 'top left',
                  }}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-[70] pointer-events-none">
            <div
              className="absolute rounded-xl border border-border/70 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-auto"
              style={{
                left: `${chatLayout.x}px`,
                top: `${chatLayout.y}px`,
                width: `${chatLayout.width}px`,
                height: `${chatLayout.height}px`,
              }}
            >
              <div
                className="h-11 px-3 border-b border-border/70 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={handleChatDragStart}
                title="Drag chat window"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Live Chat</p>
                  <p className="text-[10px] text-muted-foreground truncate">@{handle}</p>
                </div>

                <div className="text-muted-foreground/70 hidden md:flex">
                  <GripHorizontal className="h-3.5 w-3.5" />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setChatScale((previous) => Math.max(MIN_CHAT_SCALE, Number((previous - CHAT_SCALE_STEP).toFixed(2))))}
                    title="Smaller text"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <div className="w-10 text-center text-[10px] text-muted-foreground tabular-nums">
                    {Math.round(chatScale * 100)}%
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setChatScale((previous) => Math.min(MAX_CHAT_SCALE, Number((previous + CHAT_SCALE_STEP).toFixed(2))))}
                    title="Bigger text"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={openChatInNewTab}
                    title="Open chat in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsChatOpen(false)}
                    title="Close chat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="relative h-[calc(100%-44px)] overflow-hidden bg-black">
                <iframe
                  src={chatUrl}
                  title={`Stream chat for ${handle}`}
                  className="absolute left-0 top-0 border-0"
                  style={{
                    width: `${100 / chatScale}%`,
                    height: `${100 / chatScale}%`,
                    transform: `scale(${chatScale})`,
                    transformOrigin: 'top left',
                  }}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </div>
          </div>
        ),
        document.body,
      )}

      {/* Floating controls overlay */}
      {!isLoading && !hasError && (showControls || isTouchDevice) && (
        <div className="screenshot-controls absolute top-2 right-2 z-20 flex gap-2 animate-in fade-in-0 duration-150">
          <Button
            size="icon"
            variant="secondary"
            onClick={openChatWindow}
            className="bg-background/90 backdrop-blur-sm hover:bg-background rounded-md shadow-sm"
            title="Open chat in this page"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={openChatInNewTab}
            className="bg-background/90 backdrop-blur-sm hover:bg-background rounded-md shadow-sm"
            title="Open stream chat in new tab (recommended for sign-in)"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
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
