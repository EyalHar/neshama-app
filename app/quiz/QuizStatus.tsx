export function QuizSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <svg className="animate-spin h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-stone-400 text-sm">מכין שאלה...</p>
    </div>
  );
}

export function QuizError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{message}</p>
      <button onClick={onRetry} className="bg-amber-700 text-white px-6 py-3 rounded-xl hover:bg-amber-800 transition-colors">
        נסה שוב
      </button>
    </div>
  );
}
