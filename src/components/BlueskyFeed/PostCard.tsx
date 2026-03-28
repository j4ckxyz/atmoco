import type { BlueskyPost } from '../../types';
import { MessageCircle, Repeat2, Heart, ExternalLink, CornerDownRight, Quote, Play, GitBranch } from 'lucide-react';
import type { MediaPreview } from '../../types';

interface PostCardProps {
  post: BlueskyPost;
  onPreviewMedia?: (media: MediaPreview) => void;
}

export default function PostCard({ post, onPreviewMedia }: PostCardProps) {
  const { author, record, uri, likeCount, repostCount, replyCount, embed } = post;
  
  // Create Bluesky web URL from AT URI
  const getPostUrl = (atUri: string) => {
    // at://did:plc:xxx/app.bsky.feed.post/yyy -> https://bsky.app/profile/did:plc:xxx/post/yyy
    const parts = atUri.replace('at://', '').split('/');
    if (parts.length >= 3) {
      const did = parts[0];
      const rkey = parts[2];
      return `https://bsky.app/profile/${did}/post/${rkey}`;
    }
    return '#';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const embedType = embed?.$type as string | undefined;
  const isImages = embedType === 'app.bsky.embed.images#view';
  const isExternal = embedType === 'app.bsky.embed.external#view';
  const isVideo = embedType === 'app.bsky.embed.video#view';
  const isRecordWithMedia = embedType === 'app.bsky.embed.recordWithMedia#view';
  const isRecord = embedType === 'app.bsky.embed.record#view';

  const mediaEmbed = isRecordWithMedia ? embed?.media : embed;
  const mediaType = mediaEmbed?.$type as string | undefined;
  const mediaIsImages = mediaType === 'app.bsky.embed.images#view';
  const mediaIsExternal = mediaType === 'app.bsky.embed.external#view';
  const mediaIsVideo = mediaType === 'app.bsky.embed.video#view';
  const quotedRecord = isRecordWithMedia ? embed?.record?.record : isRecord ? embed?.record : undefined;

  const isReply = Boolean(record?.reply?.parent?.uri);
  const quotedText = quotedRecord?.value?.text;
  const quotedEmbeds = quotedRecord?.embeds ?? [];
  const quotedHasMedia = quotedEmbeds.length > 0;

  return (
    <div className="p-2 hover:bg-accent/35 transition-colors duration-150">
      {isReply && (
        <div className="ml-9 mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <CornerDownRight className="h-2.5 w-2.5" />
          <span>Reply in thread</span>
        </div>
      )}

      {/* Author info */}
      <div className="flex items-start gap-2 mb-1.5">
        {author.avatar ? (
          <img
            src={author.avatar}
            alt={author.handle}
            className="w-7 h-7 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0"></div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-semibold text-xs truncate">
              {author.displayName || author.handle}
            </span>
            <span className="text-muted-foreground text-[10px] truncate">
              @{author.handle}
            </span>
            <span className="text-muted-foreground text-[10px]">
              · {formatTime(record.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Post text */}
      {record.text && (
        <div className="text-xs mb-1 whitespace-pre-wrap break-words ml-9 -mt-1">
          {record.text}
        </div>
      )}

      {/* Media embeds */}
      {embed && (
        <div className="ml-9 mb-1.5">
          {/* Images */}
          {(isImages || mediaIsImages) && (mediaEmbed?.images || embed?.images) && (
            <div className={`grid gap-1 ${
              (mediaEmbed?.images || embed?.images).length === 1 ? 'grid-cols-1' : 
              (mediaEmbed?.images || embed?.images).length === 2 ? 'grid-cols-2' :
              (mediaEmbed?.images || embed?.images).length === 3 ? 'grid-cols-3' :
              'grid-cols-2'
            }`}>
              {(mediaEmbed?.images || embed?.images).map((img: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  className="relative overflow-hidden rounded border bg-muted text-left w-full focus-visible:ring-2 ring-ring"
                  onClick={() => {
                    if (onPreviewMedia) {
                      onPreviewMedia({
                        type: 'image',
                        src: img.fullsize || img.thumb,
                        alt: img.alt || 'Image preview',
                      });
                    }
                  }}
                >
                  <img
                    src={img.thumb}
                    alt={img.alt || 'Image'}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* External link preview */}
          {(isExternal || mediaIsExternal) && (mediaEmbed?.external || embed?.external) && (
            <a
              href={(mediaEmbed?.external || embed?.external).uri}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-md overflow-hidden hover:bg-accent/50 transition-colors bg-muted/20"
            >
              {(mediaEmbed?.external || embed?.external).thumb && (
                <img
                  src={(mediaEmbed?.external || embed?.external).thumb}
                  alt={(mediaEmbed?.external || embed?.external).title}
                  className="w-full h-20 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-1.5 space-y-0.5">
                <div className="text-[10px] text-muted-foreground truncate">
                  {getDomain((mediaEmbed?.external || embed?.external).uri)}
                </div>
                <div className="text-xs font-medium line-clamp-2 leading-tight">
                  {(mediaEmbed?.external || embed?.external).title}
                </div>
                {(mediaEmbed?.external || embed?.external).description && (
                  <div className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                    {(mediaEmbed?.external || embed?.external).description}
                  </div>
                )}
              </div>
            </a>
          )}

          {/* Video - show thumbnail with play indicator */}
          {(isVideo || mediaIsVideo) && (mediaEmbed || embed) && (
            <button
              type="button"
              className="relative overflow-hidden rounded border bg-muted w-full text-left focus-visible:ring-2 ring-ring"
              onClick={() => {
                if (onPreviewMedia && (mediaEmbed || embed).playlist) {
                  onPreviewMedia({
                    type: 'video',
                    src: (mediaEmbed || embed).playlist,
                    alt: (mediaEmbed || embed).alt || 'Video preview',
                    poster: (mediaEmbed || embed).thumbnail,
                  });
                }
              }}
            >
              {(mediaEmbed || embed).thumbnail && (
                <img
                  src={(mediaEmbed || embed).thumbnail}
                  alt={(mediaEmbed || embed).alt || 'Video'}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-4 w-4 text-black fill-black ml-0.5" />
                </div>
              </div>
            </button>
          )}

          {/* Quoted post */}
          {quotedRecord?.$type === 'app.bsky.embed.record#viewRecord' && (
            <div className="mt-1.5 pl-2 border-l border-border/80">
              <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <GitBranch className="h-2.5 w-2.5" />
                <span>Quoted thread</span>
              </div>
              <a
                href={getPostUrl(quotedRecord.uri)}
                target="_blank"
                rel="noopener noreferrer"
                className="block border rounded-md p-2 bg-muted/25 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                  <Quote className="h-2.5 w-2.5" />
                  <span>Original post</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  {quotedRecord.author?.avatar ? (
                    <img
                      src={quotedRecord.author.avatar}
                      alt={quotedRecord.author.handle}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-muted" />
                  )}
                  <span className="text-[11px] font-medium truncate">
                    {quotedRecord.author?.displayName || quotedRecord.author?.handle}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    @{quotedRecord.author?.handle}
                  </span>
                </div>
                <div className="text-[11px] line-clamp-3 whitespace-pre-wrap break-words leading-tight">
                  {quotedText || (quotedHasMedia ? '[Media attachment]' : 'Quoted post')}
                </div>
              </a>
            </div>
          )}

          {(quotedRecord?.$type === 'app.bsky.embed.record#viewNotFound' ||
            quotedRecord?.$type === 'app.bsky.embed.record#viewBlocked' ||
            quotedRecord?.$type === 'app.bsky.embed.record#viewDetached') && (
            <div className="mt-1.5 border rounded-md p-2 bg-muted/25 text-[10px] text-muted-foreground">
              Quoted post unavailable
            </div>
          )}
        </div>
      )}

      {/* Engagement stats - more compact */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground ml-9 mt-0.5">
        {(replyCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageCircle className="h-2.5 w-2.5" />
            {replyCount}
          </span>
        )}
        {(repostCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5">
            <Repeat2 className="h-2.5 w-2.5" />
            {repostCount}
          </span>
        )}
        {(likeCount ?? 0) > 0 && (
          <span className="flex items-center gap-0.5">
            <Heart className="h-2.5 w-2.5" />
            {likeCount}
          </span>
        )}
        <a
          href={getPostUrl(uri)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 hover:text-primary ml-auto transition-colors"
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </div>
  );
}
