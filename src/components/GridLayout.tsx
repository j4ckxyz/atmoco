import StreamPlayer from './StreamPlayer';
import BlueskyFeed from './BlueskyFeed/BlueskyFeed';
import { STREAM_HANDLES } from '../utils/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export default function GridLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img 
              src="/logo.webp" 
              alt="AtmosphereConf Logo" 
              className="h-8 md:h-10 lg:h-12 w-auto flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-primary-foreground truncate">
                AtmosphereConf - Multi-Stream Viewer
              </h1>
              <p className="text-xs md:text-sm text-primary-foreground/80 truncate">
                Watch all 3 conference streams and the live Bluesky feed
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 md:gap-2 p-1 md:p-2 bg-background overflow-hidden">
        {/* Stream 1 - Top Left */}
        <Card className="overflow-hidden flex flex-col min-h-0">
          <CardHeader className="py-1 px-2 md:py-2 md:px-3 border-b flex-shrink-0">
            <CardTitle className="text-xs md:text-sm">Stream 1</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
            <StreamPlayer handle={STREAM_HANDLES[0]} />
          </CardContent>
        </Card>

        {/* Stream 2 - Top Right */}
        <Card className="overflow-hidden flex flex-col min-h-0">
          <CardHeader className="py-1 px-2 md:py-2 md:px-3 border-b flex-shrink-0">
            <CardTitle className="text-xs md:text-sm">Stream 2</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
            <StreamPlayer handle={STREAM_HANDLES[1]} />
          </CardContent>
        </Card>

        {/* Stream 3 - Bottom Left */}
        <Card className="overflow-hidden flex flex-col min-h-0">
          <CardHeader className="py-1 px-2 md:py-2 md:px-3 border-b flex-shrink-0">
            <CardTitle className="text-xs md:text-sm">Stream 3</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
            <StreamPlayer handle={STREAM_HANDLES[2]} />
          </CardContent>
        </Card>

        {/* Bluesky Feed - Bottom Right */}
        <Card className="overflow-hidden flex flex-col min-h-0">
          <CardHeader className="py-1 px-2 md:py-2 md:px-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs md:text-sm truncate">
                #AtmosphereConf
              </CardTitle>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] md:text-xs text-muted-foreground">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
            <BlueskyFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
