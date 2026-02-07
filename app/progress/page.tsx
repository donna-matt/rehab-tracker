'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ProgressData {
  painOverTime: Array<{ date: string; avgPain: number }>;
  sessionFrequency: Array<{ date: string; count: number }>;
  volumeTrends: Array<{ date: string; totalReps: number; totalWeight: number }>;
  streak: number;
  totalSessions: number;
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProgressData();
    }
  }, [status]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/progress');
      
      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }
      
      const data = await response.json();
      setProgressData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading progress data...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchProgressData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (progressData && progressData.totalSessions === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/dashboard" className="text-xl font-bold">Rehab Tracker</Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/log" className="text-gray-700 hover:text-gray-900">
                  Log Session
                </Link>
                <Link href="/progress" className="text-blue-600 font-semibold">
                  Progress
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-4">No Progress Data Yet</h2>
              <p className="text-gray-600 mb-6">
                Start logging your rehab sessions to see your progress over time!
              </p>
              <Link
                href="/log"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Log Your First Session
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Format dates for better display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const painChartData = progressData?.painOverTime.map(d => ({
    date: formatDate(d.date),
    pain: d.avgPain
  })) || [];

  const sessionFreqData = progressData?.sessionFrequency.map(d => ({
    date: formatDate(d.date),
    sessions: d.count
  })) || [];

  const volumeChartData = progressData?.volumeTrends.map(d => ({
    date: formatDate(d.date),
    reps: d.totalReps,
    weight: d.totalWeight
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold">Rehab Tracker</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/log" className="text-gray-700 hover:text-gray-900">
                Log Session
              </Link>
              <Link href="/progress" className="text-blue-600 font-semibold">
                Progress
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sessions</h3>
              <p className="text-3xl font-bold text-blue-600">{progressData?.totalSessions || 0}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Current Streak</h3>
              <p className="text-3xl font-bold text-green-600">{progressData?.streak || 0}</p>
              <p className="text-sm text-gray-500 mt-1">consecutive days</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Latest Pain Level</h3>
              <p className="text-3xl font-bold text-purple-600">
                {painChartData.length > 0 ? painChartData[painChartData.length - 1].pain : '-'}
              </p>
              <p className="text-sm text-gray-500 mt-1">out of 10</p>
            </div>
          </div>

          {/* Pain Level Over Time */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Pain Level Over Time</h2>
            {painChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={painChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pain" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Average Pain Level"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No pain data recorded yet</p>
            )}
          </div>

          {/* Session Frequency */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Session Frequency</h2>
            {sessionFreqData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionFreqData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" fill="#3b82f6" name="Sessions per Day" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No session data available</p>
            )}
          </div>

          {/* Exercise Volume Trends */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Exercise Volume Trends</h2>
            {volumeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="reps" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Total Reps"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Total Weight (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No exercise volume data available</p>
            )}
          </div>

          {/* Tips Section */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Progress</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Log your sessions consistently to track trends accurately</li>
              <li>• Record pain levels after each exercise for better insights</li>
              <li>• Aim to maintain your streak for consistent recovery</li>
              <li>• Gradually increase volume as pain levels decrease</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
