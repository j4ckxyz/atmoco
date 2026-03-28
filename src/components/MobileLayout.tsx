import { useEffect, useState } from 'react';
import { MonitorPlay, Radio, Waves, Menu, X, Download } from 'lucide-react';
import StreamPlayer from './StreamPlayer';
import BlueskyFeed from './BlueskyFeed/BlueskyFeed';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import type { MediaPreview } from '@/types';
import { STREAM_HANDLES } from '@/utils/config';
import MediaPreviewOverlay from './MediaPreviewOverlay';

type MobileTab = 'stream1' | 'stream2' | 'stream3' | 'feed';

const TAB_CONFIG: Array<{ key: MobileTab; label: string; icon: typeof MonitorPlay }> = [
  { key: 'stream1', label: 'S1', icon: MonitorPlay },
  { key: 'stream2', label: 'S2', icon: Radio },
  { key: 'stream3', label: 'S3', icon: Waves },
  { key: 'feed', label: 'Feed', icon: Menu },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function MobileLayout() {
  const [activeTab, setActiveTab] = useState<MobileTab>('stream1');
  const [previewMedia, setPreviewMedia] = useState<MediaPreview | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setShowInstallButton(false);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!previewMedia) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewMedia(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewMedia]);

  useEffect(() => {
    if (!previewMedia) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewMedia]);

  const openInstallPrompt = async () => {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setShowInstallButton(false);
  };

  const renderPanel = () => {
    if (activeTab === 'stream1') {
      return <StreamPlayer handle={STREAM_HANDLES[0]} />;
    }

    if (activeTab === 'stream2') {
      return <StreamPlayer handle={STREAM_HANDLES[1]} />;
    }

    if (activeTab === 'stream3') {
      return <StreamPlayer handle={STREAM_HANDLES[2]} />;
    }

    return <BlueskyFeed onPreviewMedia={setPreviewMedia} realtime={false} />;
  };

  const activeLabel = TAB_CONFIG.find((tab) => tab.key === activeTab)?.label ?? 'S1';

  return (
    <div className="app-shell h-screen w-screen overflow-hidden flex flex-col">
      <MediaPreviewOverlay media={previewMedia} onClose={() => setPreviewMedia(null)} />

      <header className="glass-panel border-b border-border/70 px-3 py-2 flex items-center gap-2">
        <img src="/logo.webp" alt="AtmosphereConf Logo" className="h-8 w-auto rounded-sm ring-1 ring-primary/30" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight truncate">AtmosphereConf Viewer</p>
          <p className="text-[10px] text-muted-foreground truncate">Now viewing: {activeLabel}</p>
        </div>

        {showInstallButton && (
          <Button type="button" variant="secondary" size="sm" className="h-7 px-2 text-[10px]" onClick={openInstallPrompt}>
            <Download className="h-3 w-3 mr-1" />
            Install
          </Button>
        )}
        <ThemeToggle />
      </header>

      <main className="flex-1 min-h-0 p-2">
        <div className="h-full rounded-xl border border-border/70 bg-card/85 backdrop-blur-sm overflow-hidden shadow-sm">
          {renderPanel()}
        </div>
      </main>

      <nav className="glass-panel border-t border-border/70 px-2 py-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-12 rounded-lg border text-[10px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary/70'
                    : 'bg-background/70 border-border/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="mt-1.5 w-full text-[10px] text-muted-foreground text-center"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? (
            <span className="inline-flex items-center gap-1"><X className="h-3 w-3" /> Hide tips</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Menu className="h-3 w-3" /> Show tips</span>
          )}
        </button>

        {menuOpen && (
          <div className="mt-1.5 rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 text-[10px] text-muted-foreground space-y-1">
            <p>- Streams use native controls for sound/fullscreen.</p>
            <p>- Feed mode on mobile uses a lighter update cadence to reduce data use.</p>
            <p>- Tap the feather in feed mode to compose a post.</p>
          </div>
        )}
      </nav>
    </div>
  );
}
