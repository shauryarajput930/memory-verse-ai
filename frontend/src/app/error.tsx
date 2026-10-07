"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught Client Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md spatial-glass p-8 rounded-3xl border border-white/10">
        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-bold mb-2">Application Notice</h2>
        <p className="text-sm text-white/60 mb-6">
          {error?.message || "An unexpected client-side runtime error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all text-sm cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
