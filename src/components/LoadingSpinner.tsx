export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
    </div>
  );
}
