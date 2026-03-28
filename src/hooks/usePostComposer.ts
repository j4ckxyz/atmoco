import { useCallback, useMemo, useRef, useState } from 'react';
import { BskyAgent, RichText, type AtpSessionData, type AppBskyFeedPost } from '@atproto/api';
import { resolvePdsFromHandle } from '@/utils/atproto';

const SESSION_STORAGE_KEY = 'atmosphereconf-post-session-v1';
const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const COMPOSER_LANG = 'en';
const HIDDEN_TAG = 'AtmosphereConf';

export interface ComposerMediaItem {
  id: string;
  kind: 'image' | 'video';
  file: File;
  previewUrl: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface MentionSuggestion {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface StoredSession {
  pds: string;
  session: AtpSessionData;
}

type PersistEvent = 'create' | 'create-failed' | 'update' | 'expired' | 'network-error';

function createAgent(service: string, persistSession?: (event: PersistEvent, session?: AtpSessionData) => void): BskyAgent {
  return new BskyAgent({ service, persistSession: persistSession as any });
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? null;
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
  try {
    const url = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to read image dimensions'));
      img.src = url;
    });
    URL.revokeObjectURL(url);

    if (!image.naturalWidth || !image.naturalHeight) {
      return undefined;
    }

    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return undefined;
  }
}

async function buildExternalEmbed(agent: BskyAgent, link: string): Promise<AppBskyFeedPost.Record['embed'] | undefined> {
  try {
    const metadataResponse = await fetch(`https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(link)}`);
    if (!metadataResponse.ok) {
      return undefined;
    }

    const metadata = (await metadataResponse.json()) as {
      title?: string;
      description?: string;
      image?: string;
    };

    const title = (metadata.title || link).slice(0, 300);
    const description = (metadata.description || '').slice(0, 300);

    let thumb: unknown;
    if (metadata.image) {
      try {
        const imageResponse = await fetch(metadata.image);
        if (imageResponse.ok) {
          const bytes = new Uint8Array(await imageResponse.arrayBuffer());
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
          const uploaded = await agent.uploadBlob(bytes, { encoding: mimeType });
          thumb = uploaded.data.blob;
        }
      } catch {
        thumb = undefined;
      }
    }

    return {
      $type: 'app.bsky.embed.external',
      external: {
        uri: link,
        title,
        description,
        ...(thumb ? { thumb } : {}),
      },
    } as AppBskyFeedPost.Record['embed'];
  } catch {
    return undefined;
  }
}

export function usePostComposer() {
  const agentRef = useRef<BskyAgent | null>(null);
  const [session, setSession] = useState<AtpSessionData | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<ComposerMediaItem[]>([]);

  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [isMentionLoading, setIsMentionLoading] = useState(false);

  const persistSession = useCallback((event: PersistEvent, data?: AtpSessionData) => {
    if (event === 'create' || event === 'update') {
      if (data && service) {
        const payload: StoredSession = { pds: service, session: data };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
        setSession(data);
      }
      return;
    }

    if (event === 'expired' || event === 'create-failed' || event === 'network-error') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
    }
  }, [service]);

  const restoreSession = useCallback(async () => {
    const stored = safeJsonParse<StoredSession>(localStorage.getItem(SESSION_STORAGE_KEY));
    if (!stored) {
      return false;
    }

    try {
      const agent = createAgent(stored.pds, persistSession);
      await agent.resumeSession(stored.session);
      agentRef.current = agent;
      setSession(agent.session ?? stored.session);
      setService(stored.pds);
      return true;
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setService(null);
      return false;
    }
  }, [persistSession]);

  const login = useCallback(async (identifier: string, appPassword: string) => {
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const { handle, pds } = await resolvePdsFromHandle(identifier);
      const agent = createAgent(pds, persistSession);
      await agent.login({ identifier: handle, password: appPassword });

      if (!agent.session) {
        throw new Error('No session returned from Bluesky');
      }

      agentRef.current = agent;
      setSession(agent.session);
      setService(pds);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ pds, session: agent.session } satisfies StoredSession));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign in';
      setAuthError(message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, [persistSession]);

  const logout = useCallback(() => {
    setSession(null);
    setService(null);
    setAuthError(null);
    setMentionSuggestions([]);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    agentRef.current = null;
  }, []);

  const addFiles = useCallback(async (fileList: File[]) => {
    const currentImages = media.filter((item) => item.kind === 'image').length;
    const currentVideos = media.filter((item) => item.kind === 'video').length;
    const next: ComposerMediaItem[] = [];

    for (const file of fileList) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        continue;
      }

      if (isImage) {
        if (currentVideos > 0 || next.some((item) => item.kind === 'video')) {
          throw new Error('You can attach either images or one video, not both.');
        }

        const imageCount = currentImages + next.filter((item) => item.kind === 'image').length;
        if (imageCount >= MAX_IMAGES) {
          throw new Error(`You can attach up to ${MAX_IMAGES} images.`);
        }

        if (file.size > MAX_IMAGE_SIZE) {
          throw new Error(`${file.name} is too large (max 8MB).`);
        }
      }

      if (isVideo) {
        if (currentVideos > 0 || next.some((item) => item.kind === 'video') || currentImages > 0 || next.some((item) => item.kind === 'image')) {
          throw new Error('You can attach only one video and no images.');
        }

        if (file.size > MAX_VIDEO_SIZE) {
          throw new Error(`${file.name} is too large (max 100MB).`);
        }
      }

      const dimensions = isImage ? await getImageDimensions(file) : undefined;
      next.push({
        id: crypto.randomUUID(),
        kind: isImage ? 'image' : 'video',
        file,
        previewUrl: URL.createObjectURL(file),
        alt: '',
        width: dimensions?.width,
        height: dimensions?.height,
      });
    }

    if (next.length > 0) {
      setMedia((prev) => [...prev, ...next]);
    }
  }, [media]);

  const removeMedia = useCallback((id: string) => {
    setMedia((prev) => {
      const item = prev.find((candidate) => candidate.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((candidate) => candidate.id !== id);
    });
  }, []);

  const updateMediaAlt = useCallback((id: string, alt: string) => {
    setMedia((prev) => prev.map((item) => (item.id === id ? { ...item, alt } : item)));
  }, []);

  const clearComposer = useCallback(() => {
    setText('');
    setPostError(null);
    setMentionSuggestions([]);
    setMedia((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, []);

  const submitPost = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || !session) {
      throw new Error('Please sign in first');
    }

    setIsPosting(true);
    setPostError(null);

    try {
      const trimmedText = text.trim();
      if (!trimmedText && media.length === 0) {
        throw new Error('Post cannot be empty');
      }

      const richText = new RichText({ text: trimmedText });
      await richText.detectFacets(agent);

      if (utf8ByteLength(richText.text) > 300) {
        throw new Error('Post text exceeds 300-byte Bluesky limit');
      }

      const hasMissingImageAlt = media.some((item) => item.kind === 'image' && !item.alt.trim());
      if (hasMissingImageAlt) {
        throw new Error('Please add alt text for each attached image');
      }

      let embed: AppBskyFeedPost.Record['embed'];
      if (media.length > 0) {
        if (media.some((item) => item.kind === 'image')) {
          const images = [] as Array<{ image: unknown; alt: string; aspectRatio?: { width: number; height: number } }>;
          for (const item of media) {
            if (item.kind !== 'image') {
              continue;
            }

            const uploaded = await agent.uploadBlob(new Uint8Array(await item.file.arrayBuffer()), {
              encoding: item.file.type || 'image/jpeg',
            });

            images.push({
              image: uploaded.data.blob,
              alt: item.alt.trim() || 'Image',
              ...(item.width && item.height ? { aspectRatio: { width: item.width, height: item.height } } : {}),
            });
          }

          embed = {
            $type: 'app.bsky.embed.images',
            images,
          } as AppBskyFeedPost.Record['embed'];
        } else {
          const video = media[0];
          const uploaded = await agent.uploadBlob(new Uint8Array(await video.file.arrayBuffer()), {
            encoding: video.file.type || 'video/mp4',
          });

          embed = {
            $type: 'app.bsky.embed.video',
            video: uploaded.data.blob,
            alt: video.alt.trim() || '',
            ...(video.width && video.height ? { aspectRatio: { width: video.width, height: video.height } } : {}),
          } as AppBskyFeedPost.Record['embed'];
        }
      } else {
        const firstLink = extractUrl(trimmedText);
        if (firstLink) {
          embed = await buildExternalEmbed(agent, firstLink);
        }
      }

      const record = {
        $type: 'app.bsky.feed.post',
        text: richText.text,
        facets: richText.facets,
        langs: [COMPOSER_LANG],
        tags: [HIDDEN_TAG],
        createdAt: new Date().toISOString(),
        ...(embed ? { embed } : {}),
      };

      await agent.post(record);
      clearComposer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish post';
      setPostError(message);
      throw error;
    } finally {
      setIsPosting(false);
    }
  }, [clearComposer, media, session, text]);

  const fetchMentionSuggestions = useCallback(async (query: string) => {
    const agent = agentRef.current;
    if (!agent || !session) {
      setMentionSuggestions([]);
      return;
    }

    const cleaned = query.trim().replace(/^@/, '');
    if (!cleaned || cleaned.length < 1) {
      try {
        const fallback = await agent.getSuggestions({ limit: 5 });
        const actors = fallback.data.actors ?? [];
        setMentionSuggestions(
          actors.map((actor) => ({
            did: actor.did,
            handle: actor.handle,
            displayName: actor.displayName,
            avatar: actor.avatar,
          })),
        );
      } catch {
        setMentionSuggestions([]);
      }
      return;
    }

    setIsMentionLoading(true);
    try {
      const response = await agent.searchActorsTypeahead({ q: cleaned, limit: 6 });
      const actors = response.data.actors ?? [];
      setMentionSuggestions(
        actors.map((actor) => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName,
          avatar: actor.avatar,
        })),
      );
    } catch {
      setMentionSuggestions([]);
    } finally {
      setIsMentionLoading(false);
    }
  }, [session]);

  const promoteText = useMemo(() => {
    return 'Watching all the talks live on the AtmosphereConf Multi-Stream Viewer: https://atmoco.pages.dev';
  }, []);

  return {
    session,
    service,
    isAuthenticated: Boolean(session),
    isAuthLoading,
    authError,
    login,
    logout,
    restoreSession,

    text,
    setText,
    media,
    addFiles,
    removeMedia,
    updateMediaAlt,
    clearComposer,

    mentionSuggestions,
    isMentionLoading,
    fetchMentionSuggestions,

    isPosting,
    postError,
    submitPost,

    promoteText,
  };
}
