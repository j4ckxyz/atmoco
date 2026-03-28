# AtmosphereConf - Multi-Stream Viewer

A web application for viewing all 3 AtmosphereConf livestreams simultaneously alongside a real-time Bluesky feed. Built for all future #AtmosphereConf events!

## Features

- **4-Quadrant Layout**: View 3 conference streams at once
- **Real-time Bluesky Feed**: Live updates from the #AtmoConf feed via Jetstream
- **Inline Media Display**: Images, videos, and link previews shown directly in posts
- **Infinite Scroll**: Automatically loads more posts as you scroll
- **Compact Feed Design**: See more posts at a glance with optimized spacing
- **Native Screenshot Tool**: Click to capture stream in high quality and copy to clipboard
- **Desktop Optimized**: Designed for desktop viewing (minimum 1024px width)
- **Responsive Streams**: Embedded stream.place players with error handling
- **Live Updates**: WebSocket connection to Jetstream for instant feed updates
- **Light/Dark Mode**: Theme toggle with system preference detection
- **AtmosphereConf Branding**: Built for all future #AtmosphereConf events

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible UI components
- **html2canvas** - Native screenshot capture
- **@atproto/api** - Bluesky/ATProto integration
- **Jetstream** - Real-time WebSocket feed from Bluesky

## Getting Started

### Prerequisites

- Node.js 18+ or compatible package manager (npm, yarn, pnpm)

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

Stream handles and feed configuration can be modified in `src/utils/config.ts`:

```typescript
export const STREAM_HANDLES = [
  'stream1.atmosphereconf.org',
  'stream2.atmosphereconf.org',
  'stream3.atmosphereconf.org',
];

export const ATMOCO_FEED_URI = 'at://did:plc:3xewinw4wtimo2lqfy5fm5sw/app.bsky.feed.generator/atmosphereconf';
```

## Deployment

This is a static site that can be deployed to:

- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use GitHub Actions
- Any static hosting service

## Project Structure

```
src/
├── components/
│   ├── BlueskyFeed/
│   │   ├── BlueskyFeed.tsx      # Main feed container
│   │   ├── PostCard.tsx         # Individual post display
│   │   └── FeedHeader.tsx       # Feed header with status
│   ├── GridLayout.tsx           # 4-quadrant grid layout
│   ├── StreamPlayer.tsx         # Stream embed wrapper
│   └── LoadingSpinner.tsx       # Loading component
├── hooks/
│   ├── useJetstream.ts          # Jetstream WebSocket hook
│   └── useBlueskyFeed.ts        # Bluesky feed data hook
├── types/
│   └── index.ts                 # TypeScript types
├── utils/
│   └── config.ts                # Configuration constants
├── App.tsx                      # Root component
├── App.css                      # Global styles
└── main.tsx                     # Entry point
```

## How It Works

### Streams

The app embeds 3 stream.place players using iframes with the format:
```
https://stream.place/embed/{handle}
```

### Bluesky Feed

Two mechanisms work together for optimal real-time updates:

1. **Jetstream WebSocket**: Listens for new posts in real-time
2. **Polling Fallback**: Fetches feed every 30 seconds for reliability

When a new post is detected via Jetstream, the feed automatically refreshes to fetch the latest posts from the atmoco feed generator.

## Browser Support

Modern browsers with:
- WebSocket support
- CSS Grid support
- ES2020+ JavaScript

## License

MIT

## Built For

AtmosphereConf - Annual events for ATProto developers and communities on the open web.
