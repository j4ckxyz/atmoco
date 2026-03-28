import { useState, useEffect, useCallback, useRef } from 'react';
import { BskyAgent } from '@atproto/api';
import { ATMOCO_FEED_URI, BLUESKY_API_URL, FEED_POLL_INTERVAL } from '../utils/config';
import type { BlueskyPost } from '../types';

interface UseBlueskyFeedOptions {
  pollIntervalMs?: number;
}

export function useBlueskyFeed({ pollIntervalMs = FEED_POLL_INTERVAL }: UseBlueskyFeedOptions = {}) {
  const [posts, setPosts] = useState<BlueskyPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const agent = useRef<BskyAgent>();
  const lastFetchRef = useRef<number>(0);

  // Initialize agent
  useEffect(() => {
    agent.current = new BskyAgent({ service: BLUESKY_API_URL });
  }, []);

  const fetchFeed = useCallback(async (isLoadMore = false) => {
    if (!agent.current) return;

    try {
      const now = Date.now();
      // Prevent too frequent fetches
      if (now - lastFetchRef.current < 5000 && !isLoadMore) {
        return;
      }
      lastFetchRef.current = now;

      if (isLoadMore) {
        setIsLoadingMore(true);
      }

      console.log('Fetching atmoco feed...', isLoadMore ? `cursor: ${cursor}` : 'initial');
      const response = await agent.current.app.bsky.feed.getFeed({
        feed: ATMOCO_FEED_URI,
        limit: 30,
        cursor: isLoadMore ? cursor : undefined,
      });

      if (response.data.feed) {
        const newPosts = response.data.feed.map((item: any) => item.post);
        
        setPosts(prevPosts => {
          if (isLoadMore) {
            // Append new posts for infinite scroll
            const postMap = new Map<string, BlueskyPost>();
            prevPosts.forEach(post => postMap.set(post.uri, post));
            newPosts.forEach((post: BlueskyPost) => postMap.set(post.uri, post));
            return Array.from(postMap.values());
          } else {
            // Replace posts for refresh
            const postMap = new Map<string, BlueskyPost>();
            prevPosts.forEach(post => postMap.set(post.uri, post));
            newPosts.forEach((post: BlueskyPost) => postMap.set(post.uri, post));
            return Array.from(postMap.values()).sort((a, b) => 
              new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
            );
          }
        });

        // Update cursor for pagination
        setCursor(response.data.cursor);
        setHasMore(!!response.data.cursor);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cursor]);

  // Initial fetch
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [fetchFeed, pollIntervalMs]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchFeed();
  }, [fetchFeed]);

  // Load more posts
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      fetchFeed(true);
    }
  }, [isLoadingMore, hasMore, cursor, fetchFeed]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    hasMore,
  };
}
