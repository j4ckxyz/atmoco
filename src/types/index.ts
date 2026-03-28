// Jetstream event types
export interface JetstreamCommit {
  did: string;
  time_us: number;
  kind: 'commit';
  commit: {
    rev: string;
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    record?: Record<string, any>;
    cid: string;
  };
}

export interface JetstreamIdentity {
  did: string;
  time_us: number;
  kind: 'identity';
  identity: {
    did: string;
    handle: string;
    seq: number;
    time: string;
  };
}

export interface JetstreamAccount {
  did: string;
  time_us: number;
  kind: 'account';
  account: {
    active: boolean;
    did: string;
    seq: number;
    time: string;
  };
}

export type JetstreamEvent = JetstreamCommit | JetstreamIdentity | JetstreamAccount;

// Bluesky post types
export interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
    embed?: {
      $type: string;
      images?: Array<{
        thumb: string;
        fullsize: string;
        alt: string;
      }>;
      external?: {
        uri: string;
        title: string;
        description: string;
        thumb?: string;
      };
      video?: {
        playlist: string;
        thumbnail?: string;
        alt?: string;
      };
    };
    [key: string]: any;
  };
  indexedAt: string;
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
}

export interface FeedPost {
  post: BlueskyPost;
}
