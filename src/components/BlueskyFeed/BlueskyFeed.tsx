import { useBlueskyFeed } from '../../hooks/useBlueskyFeed';
import { useJetstream } from '../../hooks/useJetstream';
import PostCard from './PostCard';
import LoadingSpinner from '../LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCallback, useRef, useEffect } from 'react';

export default function BlueskyFeed() {
  const { posts, isLoading, isLoadingMore, error, refresh, loadMore, hasMore } = useBlueskyFeed();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Listen to Jetstream for new posts (will trigger refresh via polling)
  const handleNewPost = useCallback(() => {
    // When we detect a new post from Jetstream, trigger a refresh
    console.log('New post detected on Jetstream, refreshing feed...');
    refresh();
  }, [refresh]);

  const { isConnected } = useJetstream({
    onPost: handleNewPost,
    collections: ['app.bsky.feed.post'],
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, loadMore]);

  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div className="px-2 py-1.5 border-b flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-muted-foreground">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="h-6 px-2 text-[10px]"
        >
          Refresh
        </Button>
      </div>

      {/* Feed content */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {isLoading && posts.length === 0 ? (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-4 text-center space-y-4">
            <p className="text-destructive text-sm">Failed to load feed</p>
            <p className="text-muted-foreground text-xs">{error}</p>
            <Button onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No posts yet...
          </div>
        ) : (
          <div className="divide-y">
            {posts.map((post) => (
              <PostCard key={post.uri} post={post} />
            ))}
            
            {/* Load more trigger */}
            <div ref={loadMoreRef} className="p-2 text-center">
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <LoadingSpinner />
                  <span>Loading more...</span>
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  No more posts
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer with post count */}
      <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground text-center bg-muted/50">
        {posts.length} {posts.length === 1 ? 'post' : 'posts'}
      </div>
    </div>
  );
}
