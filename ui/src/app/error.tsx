"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-6xl font-bold text-gray-400 mb-4">Oops!</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-8">
          We encountered an error while loading the cryptocurrency data. Please
          try again.
        </p>
        <button
          onClick={() => reset()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
