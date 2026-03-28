// Stream handles for the 3 AtmosphereConf streams
export const STREAM_HANDLES = [
  'stream1.atmosphereconf.org',
  'stream2.atmosphereconf.org',
  'stream3.atmosphereconf.org',
] as const;

// Bluesky atmoco feed configuration
export const ATMOCO_FEED_URI = 'at://did:plc:3xewinw4wtimo2lqfy5fm5sw/app.bsky.feed.generator/atmosphereconf';
export const ATMOCO_FEED_DID = 'did:plc:3xewinw4wtimo2lqfy5fm5sw';

// Jetstream WebSocket URL
export const JETSTREAM_URL = 'wss://jetstream2.us-east.bsky.network/subscribe';

// Bluesky API endpoint
export const BLUESKY_API_URL = 'https://public.api.bsky.app';

// Feed refresh interval (ms) - fallback polling
export const FEED_POLL_INTERVAL = 30000; // 30 seconds

// Desktop minimum width - works on 13" laptops at 90% zoom
export const MIN_DESKTOP_WIDTH = 1024;
