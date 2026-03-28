interface FeedHeaderProps {
  postCount: number;
  isConnected: boolean;
}

export default function FeedHeader({ postCount, isConnected }: FeedHeaderProps) {
  return (
    <div className="bg-gray-800 px-3 py-2 border-b border-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Bluesky Feed - #AtmoConf
        </h2>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-400">
            {postCount} {postCount === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </div>
    </div>
  );
}
