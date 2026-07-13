"use client";

import { getGoogleAuthUrl } from "@/lib/api";

export default function Home() {
  const handleLogin = async () => {
    const { auth_url } = await getGoogleAuthUrl();
    window.location.href = auth_url;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white text-black px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">Glimps</h1>
        <p className="text-xl text-gray-600">
          Smart photo proofing for photographers. Share albums, let clients pick
          their favorites — powered by AI.
        </p>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleLogin}
            className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-full text-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
          <p className="text-sm text-gray-400">
            For photographers — one click connects your Google Drive
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-12 text-left">
          <div>
            <h3 className="font-semibold mb-1">Share</h3>
            <p className="text-sm text-gray-500">
              Paste your Google Drive folder link. We handle the rest.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Select</h3>
            <p className="text-sm text-gray-500">
              Clients browse and pick photos through a clean interface.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">AI Match</h3>
            <p className="text-sm text-gray-500">
              Face recognition finds each person&apos;s photos instantly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
