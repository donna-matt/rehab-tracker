import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from email
    const userResult = await query<{ id: string }>(
      'SELECT id FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = $1)',
      [session.user.email]
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult[0].id;

    // Get pain level over time (average pain per session)
    const painData = await query<{ date: string; avg_pain: number }>(
      `SELECT 
        DATE(s.date) as date,
        AVG(ss.pain_level) as avg_pain
       FROM sessions s
       LEFT JOIN session_sets ss ON s.id = ss.session_id
       WHERE s.user_id = $1 AND ss.pain_level IS NOT NULL
       GROUP BY DATE(s.date)
       ORDER BY date ASC`,
      [userId]
    );

    // Get session frequency (sessions per day for calendar heatmap)
    const sessionFrequency = await query<{ date: string; count: number }>(
      `SELECT 
        DATE(date) as date,
        COUNT(*) as count
       FROM sessions
       WHERE user_id = $1
       GROUP BY DATE(date)
       ORDER BY date ASC`,
      [userId]
    );

    // Get exercise volume trends (total reps per day)
    const volumeData = await query<{ date: string; total_reps: number; total_weight: number }>(
      `SELECT 
        DATE(s.date) as date,
        SUM(ss.reps) as total_reps,
        SUM(ss.reps * COALESCE(ss.weight_kg, 0)) as total_weight
       FROM sessions s
       LEFT JOIN session_sets ss ON s.id = ss.session_id
       WHERE s.user_id = $1 AND ss.reps IS NOT NULL
       GROUP BY DATE(s.date)
       ORDER BY date ASC`,
      [userId]
    );

    // Calculate streak (consecutive days with sessions)
    const streakResult = await query<{ current_streak: number }>(
      `WITH session_dates AS (
        SELECT DISTINCT DATE(date) as session_date
        FROM sessions
        WHERE user_id = $1
        ORDER BY session_date DESC
      ),
      streak_calc AS (
        SELECT 
          session_date,
          session_date - (ROW_NUMBER() OVER (ORDER BY session_date DESC))::integer AS grp
        FROM session_dates
      )
      SELECT COUNT(*) as current_streak
      FROM streak_calc
      WHERE grp = (
        SELECT session_date - (ROW_NUMBER() OVER (ORDER BY session_date DESC))::integer
        FROM session_dates
        LIMIT 1
      )
      AND session_date <= CURRENT_DATE`,
      [userId]
    );

    const streak = streakResult.length > 0 ? streakResult[0].current_streak : 0;

    // Get total sessions count
    const totalSessions = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1',
      [userId]
    );

    return NextResponse.json({
      painOverTime: painData.map(d => ({
        date: d.date,
        avgPain: parseFloat(d.avg_pain.toFixed(1))
      })),
      sessionFrequency: sessionFrequency.map(d => ({
        date: d.date,
        count: parseInt(d.count.toString())
      })),
      volumeTrends: volumeData.map(d => ({
        date: d.date,
        totalReps: parseInt(d.total_reps?.toString() || '0'),
        totalWeight: parseFloat(d.total_weight?.toString() || '0')
      })),
      streak: parseInt(streak.toString()),
      totalSessions: parseInt(totalSessions[0]?.count?.toString() || '0')
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
}
