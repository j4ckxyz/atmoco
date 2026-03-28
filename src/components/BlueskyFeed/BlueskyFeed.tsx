import { useBlueskyFeed } from '../../hooks/useBlueskyFeed';
import { useJetstream } from '../../hooks/useJetstream';
import PostCard from './PostCard';
import LoadingSpinner from '../LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCallback, useRef, useEffect, useState } from 'react';
import type { MediaPreview } from '../../types';
import { Feather } from 'lucide-react';
import ComposerOverlay from './ComposerOverlay';
import { usePostComposer } from '@/hooks/usePostComposer';
import { FEED_POLL_INTERVAL } from '@/utils/config';
import type { BlueskyPost } from '@/types';

interface BlueskyFeedProps {
  onPreviewMedia?: (media: MediaPreview) => void;
  realtime?: boolean;
}

export default function BlueskyFeed({ onPreviewMedia, realtime = true }: BlueskyFeedProps) {
  const { posts, isLoading, isLoadingMore, error, refresh, loadMore, hasMore } = useBlueskyFeed({
    pollIntervalMs: realtime ? FEED_POLL_INTERVAL : FEED_POLL_INTERVAL * 3,
  });
  const [interactionPosts, setInteractionPosts] = useState<BlueskyPost[]>([]);
  const [activeLikeUri, setActiveLikeUri] = useState<string | null>(null);
  const [activeRepostUri, setActiveRepostUri] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const composer = usePostComposer();

  useEffect(() => {
    setInteractionPosts(posts);
  }, [posts]);

  // Listen to Jetstream for new posts (will trigger refresh via polling)
  const handleNewPost = useCallback(() => {
    // When we detect a new post from Jetstream, trigger a refresh
    console.log('New post detected on Jetstream, refreshing feed...');
    refresh();
  }, [refresh]);

  const { isConnected } = useJetstream({
    onPost: handleNewPost,
    collections: ['app.bsky.feed.post'],
    enabled: realtime,
  });

  useEffect(() => {
    void composer.restoreSession();
  }, [composer.restoreSession]);

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
    <div className="h-full flex flex-col relative">
      {/* Status bar */}
      <div className="px-2 py-1.5 border-b border-border/70 flex items-center justify-between bg-muted/35">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-muted-foreground font-medium">
            {realtime ? (isConnected ? 'Live' : 'Offline') : 'Mobile mode'}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="h-6 px-2 text-[10px] rounded-md"
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
          <div className="divide-y divide-border/65">
            {interactionPosts.map((post) => (
              <PostCard
                key={post.uri}
                post={post}
                onPreviewMedia={onPreviewMedia}
                canInteract={composer.isAuthenticated}
                isLiking={activeLikeUri === post.uri}
                isReposting={activeRepostUri === post.uri}
                onToggleLike={async (targetPost) => {
                  if (!composer.isAuthenticated) {
                    setIsComposerOpen(true);
                    return;
                  }

                  setActiveLikeUri(targetPost.uri);
                  const previousPost = targetPost;

                  const optimisticLikeActive = !Boolean(targetPost.viewer?.like);
                  const optimisticLikeCount = Math.max(0, (targetPost.likeCount ?? 0) + (optimisticLikeActive ? 1 : -1));
                  const pendingLikeToken = `pending-like-${targetPost.uri}`;

                  setInteractionPosts((prev) => prev.map((candidate) => {
                    if (candidate.uri !== targetPost.uri) {
                      return candidate;
                    }

                    return {
                      ...candidate,
                      likeCount: optimisticLikeCount,
                      viewer: {
                        ...candidate.viewer,
                        like: optimisticLikeActive ? pendingLikeToken : undefined,
                      },
                    };
                  }));

                  try {
                    const result = await composer.toggleInteraction({
                      kind: 'like',
                      postUri: targetPost.uri,
                      postCid: targetPost.cid,
                      existingRecordUri: targetPost.viewer?.like && !targetPost.viewer.like.startsWith('pending-like-')
                        ? targetPost.viewer.like
                        : undefined,
                    });

                    setInteractionPosts((prev) => prev.map((candidate) => {
                      if (candidate.uri !== targetPost.uri) {
                        return candidate;
                      }

                      return {
                        ...candidate,
                        viewer: {
                          ...candidate.viewer,
                          like: result.active ? result.recordUri : undefined,
                        },
                      };
                    }));
                  } catch {
                    setInteractionPosts((prev) => prev.map((candidate) => candidate.uri === previousPost.uri ? previousPost : candidate));
                  } finally {
                    setActiveLikeUri(null);
                  }
                }}
                onToggleRepost={async (targetPost) => {
                  if (!composer.isAuthenticated) {
                    setIsComposerOpen(true);
                    return;
                  }

                  setActiveRepostUri(targetPost.uri);
                  const previousPost = targetPost;

                  const optimisticRepostActive = !Boolean(targetPost.viewer?.repost);
                  const optimisticRepostCount = Math.max(0, (targetPost.repostCount ?? 0) + (optimisticRepostActive ? 1 : -1));
                  const pendingRepostToken = `pending-repost-${targetPost.uri}`;

                  setInteractionPosts((prev) => prev.map((candidate) => {
                    if (candidate.uri !== targetPost.uri) {
                      return candidate;
                    }

                    return {
                      ...candidate,
                      repostCount: optimisticRepostCount,
                      viewer: {
                        ...candidate.viewer,
                        repost: optimisticRepostActive ? pendingRepostToken : undefined,
                      },
                    };
                  }));

                  try {
                    const result = await composer.toggleInteraction({
                      kind: 'repost',
                      postUri: targetPost.uri,
                      postCid: targetPost.cid,
                      existingRecordUri: targetPost.viewer?.repost && !targetPost.viewer.repost.startsWith('pending-repost-')
                        ? targetPost.viewer.repost
                        : undefined,
                    });

                    setInteractionPosts((prev) => prev.map((candidate) => {
                      if (candidate.uri !== targetPost.uri) {
                        return candidate;
                      }

                      return {
                        ...candidate,
                        viewer: {
                          ...candidate.viewer,
                          repost: result.active ? result.recordUri : undefined,
                        },
                      };
                    }));
                  } catch {
                    setInteractionPosts((prev) => prev.map((candidate) => candidate.uri === previousPost.uri ? previousPost : candidate));
                  } finally {
                    setActiveRepostUri(null);
                  }
                }}
              />
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
      <div className="px-3 py-1.5 border-t border-border/70 text-[10px] text-muted-foreground text-center bg-muted/35">
        {posts.length} {posts.length === 1 ? 'post' : 'posts'}
      </div>

      <Button
        type="button"
        size="icon"
        className="absolute bottom-8 right-3 h-9 w-9 rounded-full shadow-md z-30"
        onClick={() => setIsComposerOpen(true)}
        title="Create a Bluesky post"
      >
        <Feather className="h-4 w-4" />
      </Button>

      <ComposerOverlay
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        isAuthenticated={composer.isAuthenticated}
        signedInHandle={composer.session?.handle}
        signedInDid={composer.session?.did}
        isAuthLoading={composer.isAuthLoading}
        authError={composer.authError}
        onLogin={composer.login}
        onLogout={composer.logout}
        text={composer.text}
        onTextChange={composer.setText}
        media={composer.media}
        onAddFiles={composer.addFiles}
        onRemoveMedia={composer.removeMedia}
        onUpdateMediaAlt={composer.updateMediaAlt}
        isPosting={composer.isPosting}
        postError={composer.postError}
        onSubmit={async () => {
          await composer.submitPost();
          refresh();
        }}
        mentionSuggestions={composer.mentionSuggestions}
        isMentionLoading={composer.isMentionLoading}
        onMentionQuery={composer.fetchMentionSuggestions}
        promoteText={composer.promoteText}
      />
    </div>
  );
}
