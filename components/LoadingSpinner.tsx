export default function LoadingSpinner() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600"
        aria-label="Loading"
      />
    </div>
  );
}
