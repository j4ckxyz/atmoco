import { useEffect, useState, useCallback, useRef } from 'react';
import { JETSTREAM_URL } from '../utils/config';
import type { JetstreamEvent, JetstreamCommit } from '../types';

interface UseJetstreamOptions {
  onPost?: (post: JetstreamCommit) => void;
  collections?: string[];
  enabled?: boolean;
}

export function useJetstream({ onPost, collections = ['app.bsky.feed.post'], enabled = true }: UseJetstreamOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const onPostRef = useRef(onPost);
  const collectionsRef = useRef(collections);

  // Update refs when props change
  useEffect(() => {
    onPostRef.current = onPost;
  }, [onPost]);

  useEffect(() => {
    collectionsRef.current = collections;
  }, [collections]);

  const connect = useCallback(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    try {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Build query params
      const params = new URLSearchParams();
      collectionsRef.current.forEach(col => params.append('wantedCollections', col));
      
      const url = `${JETSTREAM_URL}?${params.toString()}`;
      console.log('Connecting to Jetstream:', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Jetstream connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: JetstreamEvent = JSON.parse(event.data);
          
          // Handle commit events (new posts)
          if (data.kind === 'commit' && data.commit.operation === 'create') {
            if (collectionsRef.current.includes(data.commit.collection)) {
              onPostRef.current?.(data as JetstreamCommit);
            }
          }
        } catch (err) {
          console.error('Failed to parse Jetstream message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('Jetstream error:', event);
        setError('WebSocket error occurred');
      };

      ws.onclose = () => {
        console.log('Jetstream disconnected');
        setIsConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to initialize connection');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setError(null);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, enabled]);

  return {
    isConnected,
    error,
    reconnect: connect,
  };
}
