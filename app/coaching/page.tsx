'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CoachingLog {
  id: string;
  recommendation: string;
  created_at: string;
  context: {
    sessions_analyzed: number;
    model: string;
  };
}

export default function CoachingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRecommendation, setCurrentRecommendation] = useState<string | null>(null);
  const [history, setHistory] = useState<CoachingLog[]>([]);
  const [sessionsAnalyzed, setSessionsAnalyzed] = useState<number>(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadHistory();
    }
  }, [session]);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/coaching/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const analyzeProgress = async () => {
    setLoading(true);
    setError(null);
    setCurrentRecommendation(null);

    try {
      const response = await fetch('/api/coaching/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze progress');
      }

      setCurrentRecommendation(data.recommendation);
      setSessionsAnalyzed(data.sessionsAnalyzed);
      
      // Reload history to show new recommendation
      await loadHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRecommendation = (text: string) => {
    // Simple markdown-like formatting
    return text
      .split('\n')
      .map((line, idx) => {
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-blue-900">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={idx} className="text-xl font-bold mt-6 mb-3 text-blue-900">{line.slice(2)}</h2>;
        }
        if (line.trim() === '') {
          return <br key={idx} />;
        }
        return <p key={idx} className="mb-2 text-gray-700">{line}</p>;
      });
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Rehab Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/log" className="text-gray-700 hover:text-gray-900">
                Log Session
              </Link>
              <Link href="/progress" className="text-gray-700 hover:text-gray-900">
                Progress
              </Link>
              <Link href="/coaching" className="text-blue-600 font-semibold">
                AI Coaching
              </Link>
              <button
                onClick={handleSignOut}
                className="text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Coaching</h2>
                <p className="text-gray-600 mt-1">Get personalized recommendations based on your session history</p>
              </div>
              <button
                onClick={analyzeProgress}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  loading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  '🤖 Analyze My Progress'
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium">⚠️ {error}</p>
              </div>
            )}

            {currentRecommendation && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-6">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">🎯</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Your Latest Coaching Report</h3>
                    <p className="text-sm text-gray-600">Based on {sessionsAnalyzed} recent data points</p>
                  </div>
                </div>
                <div className="prose prose-blue max-w-none">
                  {formatRecommendation(currentRecommendation)}
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">📜 Coaching History</h3>
              <div className="space-y-4">
                {history.map((log) => (
                  <details key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <summary className="cursor-pointer font-medium text-gray-900">
                      {new Date(log.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <span className="text-sm text-gray-500 ml-2">
                        ({log.context?.sessions_analyzed || 0} sessions analyzed)
                      </span>
                    </summary>
                    <div className="mt-4 pt-4 border-t border-gray-200 prose prose-sm max-w-none">
                      {formatRecommendation(log.recommendation)}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {history.length === 0 && !currentRecommendation && !loading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <span className="text-6xl mb-4 block">🏋️</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Coaching History Yet</h3>
              <p className="text-gray-600">
                Click "Analyze My Progress" to get your first personalized coaching recommendations!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
