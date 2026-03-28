import { useMemo, useRef, useState } from 'react';
import { AtSign, Feather, ImagePlus, Loader2, LogOut, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComposerMediaItem, MentionSuggestion } from '@/hooks/usePostComposer';

interface ComposerOverlayProps {
  isOpen: boolean;
  onClose: () => void;

  isAuthenticated: boolean;
  signedInHandle?: string;
  signedInDid?: string;

  isAuthLoading: boolean;
  authError: string | null;
  onLogin: (handle: string, appPassword: string) => Promise<void>;
  onLogout: () => void;

  text: string;
  onTextChange: (value: string) => void;
  media: ComposerMediaItem[];
  onAddFiles: (files: File[]) => Promise<void>;
  onRemoveMedia: (id: string) => void;
  onUpdateMediaAlt: (id: string, alt: string) => void;

  isPosting: boolean;
  postError: string | null;
  onSubmit: () => Promise<void>;

  mentionSuggestions: MentionSuggestion[];
  isMentionLoading: boolean;
  onMentionQuery: (query: string) => Promise<void>;

  promoteText: string;
}

interface MentionState {
  start: number;
  end: number;
  query: string;
}

function getMentionState(text: string, cursor: number): MentionState | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(^|\s)@([a-zA-Z0-9._-]*)$/);
  if (!match) {
    return null;
  }

  const fullMatch = match[0];
  const mentionPart = fullMatch.trimStart();
  const atIndex = before.length - mentionPart.length;
  const query = mentionPart.slice(1);

  return {
    start: atIndex,
    end: cursor,
    query,
  };
}

function truncateDid(did?: string): string {
  if (!did) {
    return '';
  }

  if (did.length <= 20) {
    return did;
  }

  return `${did.slice(0, 12)}...${did.slice(-6)}`;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function countFacets(text: string): { mentions: number; links: number; tags: number } {
  const encoded = new TextEncoder().encode(text);
  const facets: Array<{ feature: string; start: number; end: number }> = [];

  const addFacet = (startUtf16: number, endUtf16: number, feature: string) => {
    const start = utf8ByteLength(text.slice(0, startUtf16));
    const end = utf8ByteLength(text.slice(0, endUtf16));
    if (end > start && start >= 0 && end <= encoded.length) {
      facets.push({ feature, start, end });
    }
  };

  const mentionRegex = /(^|\s)@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)/g;
  let mentionMatch: RegExpExecArray | null;
  while ((mentionMatch = mentionRegex.exec(text)) !== null) {
    const prefix = mentionMatch[1] ?? '';
    const handle = mentionMatch[2] ?? '';
    const start = mentionMatch.index + prefix.length;
    addFacet(start, start + 1 + handle.length, 'mention');
  }

  const linkRegex = /(https?:\/\/[^\s]+)/g;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const url = linkMatch[1];
    addFacet(linkMatch.index, linkMatch.index + url.length, 'link');
  }

  const tagRegex = /(^|\s)#([\p{L}\p{N}_]{1,64})/gu;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    const prefix = tagMatch[1] ?? '';
    const tag = tagMatch[2] ?? '';
    const start = tagMatch.index + prefix.length;
    addFacet(start, start + 1 + tag.length, 'tag');
  }

  const merged = new Map<string, string>();
  for (const facet of facets) {
    merged.set(`${facet.start}:${facet.end}`, facet.feature);
  }

  let mentions = 0;
  let links = 0;
  let tags = 0;

  for (const feature of merged.values()) {
    if (feature === 'mention') mentions += 1;
    if (feature === 'link') links += 1;
    if (feature === 'tag') tags += 1;
  }

  return { mentions, links, tags };
}

export default function ComposerOverlay({
  isOpen,
  onClose,
  isAuthenticated,
  signedInHandle,
  signedInDid,
  isAuthLoading,
  authError,
  onLogin,
  onLogout,
  text,
  onTextChange,
  media,
  onAddFiles,
  onRemoveMedia,
  onUpdateMediaAlt,
  isPosting,
  postError,
  onSubmit,
  mentionSuggestions,
  isMentionLoading,
  onMentionQuery,
  promoteText,
}: ComposerOverlayProps) {
  const [handleInput, setHandleInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasMedia = media.length > 0;
  const byteCount = useMemo(() => utf8ByteLength(text), [text]);
  const charCount = useMemo(() => {
    return Math.min(300, byteCount);
  }, [byteCount]);
  const isCharOverLimit = byteCount > 300;
  const countLabel = isCharOverLimit ? `300+/${300}` : `${charCount}/${300}`;
  const counterClassName = cn('ml-auto text-[10px]', isCharOverLimit ? 'text-destructive' : 'text-muted-foreground');

  const facetCounts = useMemo(() => countFacets(text), [text]);

  const canPublish = useMemo(() => {
    if (isCharOverLimit) {
      return false;
    }
    if (isPosting) {
      return false;
    }
    return true;
  }, [isCharOverLimit, isPosting]);

  const isPublishDisabled = !canPublish;

  if (!isOpen) {
    return null;
  }

  const applyMentionSelection = (handle: string) => {
    if (!mentionState || !textareaRef.current) {
      return;
    }

    const replacement = `@${handle} `;
    const nextText = `${text.slice(0, mentionState.start)}${replacement}${text.slice(mentionState.end)}`;
    onTextChange(nextText);
    setMentionState(null);

    const cursor = mentionState.start + replacement.length;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      await onSubmit();
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message) {
        setLocalError(error.message);
      }
    }
  };

  const handleFiles = async (files: File[]) => {
    setLocalError(null);
    try {
      await onAddFiles(files);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not attach media');
    }
  };

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        aria-label="Close composer"
        className="absolute inset-0 bg-background/65 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-2 rounded-xl border border-border/70 bg-card/88 backdrop-blur-lg shadow-xl overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="px-3 py-2 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <Feather className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-none">Post to Bluesky</p>
                <p className="text-[10px] text-muted-foreground mt-1">Viewer-first mode: sign in only when posting</p>
              </div>
            </div>

            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 p-3 space-y-3 text-xs">
              <p className="text-muted-foreground">
                Sign in with app password to post. You can still use the app fully without signing in.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="composer-handle" className="text-[11px] text-muted-foreground">Handle</label>
                <input
                  id="composer-handle"
                  value={handleInput}
                  onChange={(event) => setHandleInput(event.target.value)}
                  placeholder="your-handle.bsky.social"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="composer-password" className="text-[11px] text-muted-foreground">App Password</label>
                <input
                  id="composer-password"
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoComplete="current-password"
                />
              </div>

              {(authError || localError) && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                  {authError || localError}
                </div>
              )}

              <Button
                type="button"
                className="w-full h-9"
                onClick={async () => {
                  setLocalError(null);
                  if (!handleInput.trim() || !passwordInput.trim()) {
                    setLocalError('Enter both handle and app password');
                    return;
                  }
                  try {
                    await onLogin(handleInput, passwordInput);
                    setPasswordInput('');
                    setHandleInput('');
                  } catch (error) {
                    if (error instanceof Error && error.message) {
                      setLocalError(error.message);
                    }
                  }
                }}
                disabled={isAuthLoading}
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Post'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              <div className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">Posting as @{signedInHandle}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{truncateDid(signedInDid)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={onLogout}>
                  <LogOut className="h-3 w-3 mr-1" />
                  Switch
                </Button>
              </div>

              <div className="space-y-1">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(event) => {
                    const next = event.target.value;
                    onTextChange(next);
                    const caret = event.target.selectionStart ?? next.length;
                    const state = getMentionState(next, caret);
                    setMentionState(state);
                    void onMentionQuery(state?.query ?? '');
                  }}
                  onSelect={(event) => {
                    const target = event.target as HTMLTextAreaElement;
                    const caret = target.selectionStart ?? text.length;
                    const state = getMentionState(text, caret);
                    setMentionState(state);
                    void onMentionQuery(state?.query ?? '');
                  }}
                  onPaste={(event) => {
                    const files = Array.from(event.clipboardData.items)
                      .filter((item) => item.kind === 'file')
                      .map((item) => item.getAsFile())
                      .filter((file): file is File => Boolean(file));

                    if (files.length > 0) {
                      event.preventDefault();
                      void handleFiles(files);
                    }
                  }}
                  placeholder="Share what you're watching across the AtmosphereConf streams..."
                  className="w-full min-h-24 max-h-40 rounded-md border border-input bg-background px-3 py-2 text-xs leading-5 outline-none resize-y focus-visible:ring-2 focus-visible:ring-ring"
                />

                {mentionState && (mentionSuggestions.length > 0 || isMentionLoading) && (
                  <div className="rounded-md border border-border/80 bg-card shadow-sm overflow-hidden">
                    {isMentionLoading ? (
                      <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Searching users...
                      </div>
                    ) : (
                      mentionSuggestions.map((actor) => (
                        <button
                          key={actor.did}
                          type="button"
                          className="w-full px-2 py-1.5 text-left hover:bg-accent/45 transition-colors"
                          onClick={() => applyMentionSelection(actor.handle)}
                        >
                          <div className="flex items-center gap-2">
                            {actor.avatar ? (
                              <img src={actor.avatar} alt={actor.handle} className="w-5 h-5 rounded-full" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-muted" />
                            )}
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate">{actor.displayName || actor.handle}</p>
                              <p className="text-[10px] text-muted-foreground truncate">@{actor.handle}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length > 0) {
                      void handleFiles(files);
                    }
                    event.target.value = '';
                  }}
                />
                <Button type="button" variant="secondary" size="sm" className="h-7 px-2 text-[10px]" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="h-3 w-3 mr-1" />
                  Add Media
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => onTextChange(promoteText)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Promote Viewer
                </Button>

                <div className={counterClassName}>
                  {countLabel}
                </div>
              </div>

              {(facetCounts.mentions > 0 || facetCounts.links > 0 || facetCounts.tags > 0) && (
                <div className="rounded-md border border-border/70 bg-muted/25 px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-2">
                  {facetCounts.mentions > 0 && <span>@ {facetCounts.mentions}</span>}
                  {facetCounts.links > 0 && <span>links {facetCounts.links}</span>}
                  {facetCounts.tags > 0 && <span># {facetCounts.tags}</span>}
                </div>
              )}

              {hasMedia && (
                <div className="space-y-2 rounded-md border border-border/70 bg-background/65 p-2">
                  {media.map((item) => (
                    <div key={item.id} className="rounded-md border border-border/60 bg-card/80 p-2">
                      <div className="flex items-start gap-2">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {item.kind === 'image' ? (
                            <img src={item.previewUrl} alt={item.alt || 'Image preview'} className="w-full h-full object-cover" />
                          ) : (
                            <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                          )}
                        </div>

                        <div className="flex-1 space-y-1.5 min-w-0">
                          <p className="text-[10px] text-muted-foreground truncate">{item.file.name}</p>
                          <input
                            value={item.alt}
                            onChange={(event) => onUpdateMediaAlt(item.id, event.target.value)}
                            placeholder={item.kind === 'image' ? 'Alt text (recommended)' : 'Video alt text (optional)'}
                            className="w-full h-7 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>

                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveMedia(item.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(postError || localError) && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                  {postError || localError}
                </div>
              )}

              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <AtSign className="h-3 w-3" />
                Hidden tag added automatically via post metadata: #AtmosphereConf
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-8 px-3 text-[11px]" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3 text-[11px]"
                  onClick={handleSubmit}
                  disabled={isPublishDisabled}
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Publish
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
