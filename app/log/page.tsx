'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  category: string;
  is_rehab: boolean;
}

interface SessionSet {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number | null;
  pain_level: number | null;
  notes: string;
}

export default function LogSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sessionType, setSessionType] = useState<'rehab' | 'gym'>('rehab');
  const [sessionNotes, setSessionNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SessionSet[]>([
    { exercise_id: '', set_number: 1, reps: 0, weight: null, pain_level: null, notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchExercises();
    }
  }, [session]);

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises');
      if (response.ok) {
        const data = await response.json();
        setExercises(data.exercises);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const addSet = () => {
    const newSetNumber = sets.length + 1;
    const lastSet = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        exercise_id: lastSet.exercise_id, // Copy last exercise
        set_number: newSetNumber,
        reps: 0,
        weight: null,
        pain_level: null,
        notes: ''
      }
    ]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof SessionSet, value: any) => {
    const updatedSets = [...sets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setSets(updatedSets);
  };

  const validateForm = (): boolean => {
    // Check that all sets have required fields
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      if (!set.exercise_id) {
        setError(`Set ${i + 1}: Please select an exercise`);
        return false;
      }
      if (!set.reps || set.reps <= 0) {
        setError(`Set ${i + 1}: Reps must be greater than 0`);
        return false;
      }
      if (set.pain_level !== null && (set.pain_level < 0 || set.pain_level > 10)) {
        setError(`Set ${i + 1}: Pain level must be between 0 and 10`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create session
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: sessionType,
          notes: sessionNotes || null,
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.session.id;

      // 2. Create all sets
      for (const set of sets) {
        const setResponse = await fetch(`/api/sessions/${sessionId}/sets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            reps: set.reps,
            weight: set.weight,
            pain_level: set.pain_level,
            notes: set.notes || null,
          }),
        });

        if (!setResponse.ok) {
          const errorData = await setResponse.json();
          throw new Error(errorData.error || 'Failed to create set');
        }
      }

      setSuccess(true);
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('Submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to log session');
    } finally {
      setIsSubmitting(false);
    }
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
              <Link href="/dashboard" className="text-xl font-bold">
                Rehab Tracker
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/log" className="text-blue-600 font-semibold">
                Log Session
              </Link>
              <Link href="/progress" className="text-gray-700 hover:text-gray-900">
                Progress
              </Link>
              <Link href="/coaching" className="text-gray-700 hover:text-gray-900">
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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Log Session</h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">✓ Session logged successfully! Redirecting...</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Session Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setSessionType('rehab')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium ${
                      sessionType === 'rehab'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Rehab
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionType('gym')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium ${
                      sessionType === 'gym'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Gym
                  </button>
                </div>
              </div>

              {/* Session Notes */}
              <div className="mb-6">
                <label htmlFor="sessionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Notes
                </label>
                <textarea
                  id="sessionNotes"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How did the session go?"
                />
              </div>

              {/* Sets */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Exercises & Sets</h3>
                  <button
                    type="button"
                    onClick={addSet}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
                  >
                    + Add Set
                  </button>
                </div>

                <div className="space-y-4">
                  {sets.map((set, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">Set {set.set_number}</h4>
                        {sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSet(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Exercise */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Exercise <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={set.exercise_id}
                            onChange={(e) => updateSet(index, 'exercise_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select an exercise</option>
                            {exercises.map((exercise) => (
                              <option key={exercise.id} value={exercise.id}>
                                {exercise.name} {exercise.is_rehab ? '(Rehab)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Reps */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reps <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => updateSet(index, 'reps', parseInt(e.target.value) || 0)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) => updateSet(index, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                            step="0.5"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </div>

                        {/* Pain Level */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pain Level (0-10)
                          </label>
                          <input
                            type="number"
                            value={set.pain_level ?? ''}
                            onChange={(e) => updateSet(index, 'pain_level', e.target.value ? parseInt(e.target.value) : null)}
                            min="0"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={set.notes}
                            onChange={(e) => updateSet(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isSubmitting || success}
                  className="flex-1 py-3 px-6 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Logging Session...' : 'Log Session'}
                </button>
                <Link
                  href="/dashboard"
                  className="py-3 px-6 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
