# Quick Start Guide

## Installation & Running

1. **Install Node.js** (if not already installed):
   - Download from https://nodejs.org/ (v18 or higher recommended)
   - Or use a version manager like nvm, volta, or asdf

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   - Navigate to http://localhost:3000
   - Make sure your browser window is at least 1280px wide

## What You'll See

```
┌─────────────────────────────────────────┐
│  AtmosphereConf - Multi-Stream Viewer   │
├──────────────────┬──────────────────────┤
│   Stream 1       │   Stream 2           │
│                  │                      │
│                  │                      │
├──────────────────┼──────────────────────┤
│   Stream 3       │   Bluesky Feed       │
│                  │   (scrollable)       │
│                  │                      │
└──────────────────┴──────────────────────┘
```

## Features to Test

### Stream Players
- [x] All 3 streams load in their iframes
- [x] Streams show loading state
- [x] Error handling with retry button
- [x] Can play/pause/mute each stream independently

### Bluesky Feed
- [x] Feed loads posts from atmoco feed
- [x] Shows real-time connection status (green dot = connected)
- [x] Auto-refreshes when new posts detected via Jetstream
- [x] Manual refresh button
- [x] Posts show: avatar, name, handle, timestamp, text, engagement stats
- [x] "View on Bluesky" links work
- [x] Scrollable with custom scrollbar

### Layout
- [x] 4-quadrant grid layout
- [x] Responsive to window resize
- [x] Shows warning on mobile/small screens

## Troubleshooting

### Streams not loading
- Check that stream.place is accessible
- Verify the handles in `src/utils/config.ts` are correct
- Try the retry button

### Feed not loading
- Check browser console for errors
- Verify Jetstream connection (green dot in feed header)
- Try manual refresh button
- Check that the feed URI is correct

### WebSocket connection fails
- Check browser console for WebSocket errors
- Try refreshing the page
- The app will auto-reconnect with exponential backoff

## Customization

### Change stream handles
Edit `src/utils/config.ts`:
```typescript
export const STREAM_HANDLES = [
  'your-handle-1.bsky.social',
  'your-handle-2.bsky.social',
  'your-handle-3.bsky.social',
];
```

### Change feed
Edit `src/utils/config.ts`:
```typescript
export const ATMOCO_FEED_URI = 'at://your-did/app.bsky.feed.generator/your-feed';
```

### Adjust polling interval
Edit `src/utils/config.ts`:
```typescript
export const FEED_POLL_INTERVAL = 60000; // 60 seconds
```

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready to deploy to any static hosting service.

## Deployment Options

- **Vercel**: `npm i -g vercel && vercel`
- **Netlify**: Drag `dist/` folder to netlify.com/drop
- **GitHub Pages**: Use GitHub Actions workflow
- **Any static host**: Upload `dist/` folder contents
