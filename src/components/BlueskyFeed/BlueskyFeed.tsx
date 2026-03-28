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

interface InteractionCacheEntry {
  like?: string | null;
  repost?: string | null;
}

export default function BlueskyFeed({ onPreviewMedia, realtime = true }: BlueskyFeedProps) {
  const { posts, isLoading, isLoadingMore, error, refresh, loadMore, hasMore } = useBlueskyFeed({
    pollIntervalMs: realtime ? FEED_POLL_INTERVAL : FEED_POLL_INTERVAL * 3,
  });
  const [interactionPosts, setInteractionPosts] = useState<BlueskyPost[]>([]);
  const [interactionCache, setInteractionCache] = useState<Record<string, InteractionCacheEntry>>({});
  const [activeLikeUri, setActiveLikeUri] = useState<string | null>(null);
  const [activeRepostUri, setActiveRepostUri] = useState<string | null>(null);
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyDraftByUri, setReplyDraftByUri] = useState<Record<string, string>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const composer = usePostComposer();

  const applyInteractionCache = useCallback(
    (incomingPosts: BlueskyPost[]) => {
      return incomingPosts.map((post) => {
        const cached = interactionCache[post.uri];
        if (!cached) {
          return post;
        }

        const viewer = { ...(post.viewer ?? {}) };
        if (Object.prototype.hasOwnProperty.call(cached, 'like')) {
          viewer.like = cached.like ?? undefined;
        }
        if (Object.prototype.hasOwnProperty.call(cached, 'repost')) {
          viewer.repost = cached.repost ?? undefined;
        }

        return {
          ...post,
          viewer,
        };
      });
    },
    [interactionCache],
  );

  useEffect(() => {
    setInteractionPosts((previousPosts) => {
      const previousByUri = new Map(previousPosts.map((post) => [post.uri, post]));

      return applyInteractionCache(posts).map((post) => {
        const previous = previousByUri.get(post.uri);
        if (!previous) {
          return post;
        }

        const hasCachedLike = Object.prototype.hasOwnProperty.call(interactionCache[post.uri] ?? {}, 'like');
        const hasCachedRepost = Object.prototype.hasOwnProperty.call(interactionCache[post.uri] ?? {}, 'repost');

        const mergedViewer = {
          ...(post.viewer ?? {}),
          ...((!hasCachedLike && previous.viewer?.like) ? { like: previous.viewer.like } : {}),
          ...((!hasCachedRepost && previous.viewer?.repost) ? { repost: previous.viewer.repost } : {}),
        };

        return {
          ...post,
          viewer: mergedViewer,
        };
      });
    });
  }, [applyInteractionCache, interactionCache, posts]);

  useEffect(() => {
    if (!composer.isAuthenticated || posts.length === 0) {
      return;
    }

    let isCancelled = false;
    void composer.hydrateViewerState(posts).then((hydrated) => {
      if (!isCancelled) {
        setInteractionPosts(applyInteractionCache(hydrated));

        setInteractionCache((previous) => {
          const next = { ...previous };

          for (const post of hydrated) {
            const hasLikeField = Object.prototype.hasOwnProperty.call(post.viewer ?? {}, 'like');
            const hasRepostField = Object.prototype.hasOwnProperty.call(post.viewer ?? {}, 'repost');

            if (!hasLikeField && !hasRepostField) {
              continue;
            }

            next[post.uri] = {
              ...next[post.uri],
              ...(hasLikeField ? { like: post.viewer?.like ?? null } : {}),
              ...(hasRepostField ? { repost: post.viewer?.repost ?? null } : {}),
            };
          }

          return next;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [applyInteractionCache, composer.hydrateViewerState, composer.isAuthenticated, posts]);

  useEffect(() => {
    if (!composer.isAuthenticated) {
      setInteractionCache({});
    }
  }, [composer.isAuthenticated]);

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
              <div key={post.uri}>
                <PostCard
                  post={post}
                  onPreviewMedia={onPreviewMedia}
                  canInteract={composer.isAuthenticated}
                  isReplyOpen={Object.prototype.hasOwnProperty.call(replyDraftByUri, post.uri)}
                  onToggleReply={(targetPost) => {
                    if (!composer.isAuthenticated) {
                      setIsComposerOpen(true);
                      return;
                    }

                    setReplyDraftByUri((prev) => {
                      const next = { ...prev };
                      if (Object.prototype.hasOwnProperty.call(next, targetPost.uri)) {
                        delete next[targetPost.uri];
                      } else {
                        next[targetPost.uri] = '';
                      }
                      return next;
                    });
                  }}
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
                  const previousCachedLike = interactionCache[targetPost.uri]?.like;

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

                  setInteractionCache((prev) => ({
                    ...prev,
                    [targetPost.uri]: {
                      ...prev[targetPost.uri],
                      like: optimisticLikeActive ? pendingLikeToken : null,
                    },
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

                    setInteractionCache((prev) => ({
                      ...prev,
                      [targetPost.uri]: {
                        ...prev[targetPost.uri],
                        like: result.active ? (result.recordUri ?? pendingLikeToken) : null,
                      },
                    }));
                  } catch {
                    setInteractionPosts((prev) => prev.map((candidate) => candidate.uri === previousPost.uri ? previousPost : candidate));

                    setInteractionCache((prev) => {
                      const next = { ...prev };
                      const current = { ...(next[targetPost.uri] ?? {}) };

                      if (previousCachedLike === undefined) {
                        delete current.like;
                      } else {
                        current.like = previousCachedLike;
                      }

                      if (Object.keys(current).length === 0) {
                        delete next[targetPost.uri];
                      } else {
                        next[targetPost.uri] = current;
                      }

                      return next;
                    });
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
                  const previousCachedRepost = interactionCache[targetPost.uri]?.repost;

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

                  setInteractionCache((prev) => ({
                    ...prev,
                    [targetPost.uri]: {
                      ...prev[targetPost.uri],
                      repost: optimisticRepostActive ? pendingRepostToken : null,
                    },
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

                    setInteractionCache((prev) => ({
                      ...prev,
                      [targetPost.uri]: {
                        ...prev[targetPost.uri],
                        repost: result.active ? (result.recordUri ?? pendingRepostToken) : null,
                      },
                    }));
                  } catch {
                    setInteractionPosts((prev) => prev.map((candidate) => candidate.uri === previousPost.uri ? previousPost : candidate));

                    setInteractionCache((prev) => {
                      const next = { ...prev };
                      const current = { ...(next[targetPost.uri] ?? {}) };

                      if (previousCachedRepost === undefined) {
                        delete current.repost;
                      } else {
                        current.repost = previousCachedRepost;
                      }

                      if (Object.keys(current).length === 0) {
                        delete next[targetPost.uri];
                      } else {
                        next[targetPost.uri] = current;
                      }

                      return next;
                    });
                  } finally {
                    setActiveRepostUri(null);
                  }
                }}
                />

                {composer.isAuthenticated && (
                <div className="ml-9 mr-2 mb-2 mt-1 rounded-md border border-border/70 bg-muted/20 p-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground">Reply in-app</p>
                  </div>

                  {Object.prototype.hasOwnProperty.call(replyDraftByUri, post.uri) && (
                    <div className="space-y-1.5">
                      <textarea
                        value={replyDraftByUri[post.uri] ?? ''}
                        onChange={(event) => {
                          const next = event.target.value;
                          setReplyDraftByUri((prev) => ({ ...prev, [post.uri]: next }));
                        }}
                        placeholder={`Reply to @${post.author.handle}`}
                        className="w-full min-h-16 rounded-md border border-input bg-background px-2 py-1.5 text-[11px] leading-5 outline-none resize-y focus-visible:ring-2 focus-visible:ring-ring"
                      />

                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => {
                            setReplyDraftByUri((prev) => {
                              const next = { ...prev };
                              delete next[post.uri];
                              return next;
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          disabled={activeReplyUri === post.uri || !(replyDraftByUri[post.uri] ?? '').trim()}
                          onClick={async () => {
                            const draft = (replyDraftByUri[post.uri] ?? '').trim();
                            if (!draft) {
                              return;
                            }

                            setActiveReplyUri(post.uri);

                            try {
                              await composer.submitPost({
                                textOverride: draft,
                                mediaOverride: [],
                                replyTo: {
                                  parentUri: post.uri,
                                  parentCid: post.cid,
                                  rootUri: post.record?.reply?.root?.uri,
                                  rootCid: post.record?.reply?.root?.cid,
                                },
                              });

                              setReplyDraftByUri((prev) => {
                                const next = { ...prev };
                                delete next[post.uri];
                                return next;
                              });
                              refresh();
                            } catch {
                              // error surfaced via composer state
                            } finally {
                              setActiveReplyUri(null);
                            }
                          }}
                        >
                          {activeReplyUri === post.uri ? 'Replying...' : 'Reply'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
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
