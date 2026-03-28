import type { BlueskyPost } from '../../types';
import { MessageCircle, Repeat2, Heart, ExternalLink } from 'lucide-react';

interface PostCardProps {
  post: BlueskyPost;
}

export default function PostCard({ post }: PostCardProps) {
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

  const embedType = embed?.$type as string | undefined;
  const isImages = embedType === 'app.bsky.embed.images#view';
  const isExternal = embedType === 'app.bsky.embed.external#view';
  const isVideo = embedType === 'app.bsky.embed.video#view';
  const isRecordWithMedia = embedType === 'app.bsky.embed.recordWithMedia#view';

  const mediaEmbed = isRecordWithMedia ? embed?.media : embed;
  const mediaType = mediaEmbed?.$type as string | undefined;
  const mediaIsImages = mediaType === 'app.bsky.embed.images#view';
  const mediaIsExternal = mediaType === 'app.bsky.embed.external#view';
  const mediaIsVideo = mediaType === 'app.bsky.embed.video#view';

  return (
    <div className="p-2 hover:bg-accent/50 transition-colors">
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
      <div className="text-xs mb-1.5 whitespace-pre-wrap break-words ml-9">
        {record.text}
      </div>

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
                <div key={idx} className="relative overflow-hidden rounded border bg-muted">
                  <img
                    src={img.thumb}
                    alt={img.alt || 'Image'}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {/* External link preview */}
          {(isExternal || mediaIsExternal) && (mediaEmbed?.external || embed?.external) && (
            <a
              href={(mediaEmbed?.external || embed?.external).uri}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded overflow-hidden hover:bg-accent/50 transition-colors"
            >
              {(mediaEmbed?.external || embed?.external).thumb && (
                <img
                  src={(mediaEmbed?.external || embed?.external).thumb}
                  alt={(mediaEmbed?.external || embed?.external).title}
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-2">
                <div className="text-xs font-medium line-clamp-1">
                  {(mediaEmbed?.external || embed?.external).title}
                </div>
                {(mediaEmbed?.external || embed?.external).description && (
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {(mediaEmbed?.external || embed?.external).description}
                  </div>
                )}
              </div>
            </a>
          )}

          {/* Video - show thumbnail with play indicator */}
          {(isVideo || mediaIsVideo) && (mediaEmbed || embed) && (
            <div className="relative overflow-hidden rounded border bg-muted">
              {(mediaEmbed || embed).thumbnail && (
                <img
                  src={(mediaEmbed || embed).thumbnail}
                  alt={(mediaEmbed || embed).alt || 'Video'}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <div className="w-0 h-0 border-l-8 border-l-black border-y-6 border-y-transparent ml-1"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Engagement stats - more compact */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground ml-9">
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
          className="flex items-center gap-0.5 hover:text-primary ml-auto"
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </div>
  );
}
