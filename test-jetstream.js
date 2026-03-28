#!/usr/bin/env node

// Test Jetstream connection
const WebSocket = require('ws');

const JETSTREAM_URL = 'wss://jetstream2.us-east.bsky.network/subscribe';
const collections = ['app.bsky.feed.post'];

console.log('Testing Jetstream connection...');
console.log('URL:', JETSTREAM_URL);

const params = new URLSearchParams();
collections.forEach(col => params.append('wantedCollections', col));

const url = `${JETSTREAM_URL}?${params.toString()}`;
console.log('Full URL:', url);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('✅ Connected to Jetstream!');
});

ws.on('message', (data) => {
  try {
    const event = JSON.parse(data.toString());
    console.log('📨 Received event:', {
      kind: event.kind,
      did: event.did,
      time_us: event.time_us,
    });
    
    if (event.kind === 'commit' && event.commit) {
      console.log('  Collection:', event.commit.collection);
      console.log('  Operation:', event.commit.operation);
      if (event.commit.record?.text) {
        console.log('  Text preview:', event.commit.record.text.substring(0, 100));
      }
    }
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('🔌 Connection closed:', code, reason.toString());
});

// Keep alive for 30 seconds to see messages
setTimeout(() => {
  console.log('Test complete, closing connection...');
  ws.close();
  process.exit(0);
}, 30000);
