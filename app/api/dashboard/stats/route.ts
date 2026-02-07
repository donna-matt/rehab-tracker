import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/db';

interface LastSessionData {
  date: string;
  session_type: string;
  exercise_count: number;
}

interface PainTrendData {
  recent_avg: number | null;
  previous_avg: number | null;
  trend: 'improving' | 'worsening' | 'stable' | 'no_data';
}

interface RecentSession {
  id: string;
  date: string;
  session_type: string;
  notes: string | null;
  exercise_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get last session
    const lastSession = await queryOne<LastSessionData>(
      `SELECT s.date, s.session_type, COUNT(DISTINCT ss.exercise_id) as exercise_count
       FROM sessions s
       LEFT JOIN session_sets ss ON s.id = ss.session_id
       WHERE s.user_id = $1
       GROUP BY s.id, s.date, s.session_type
       ORDER BY s.date DESC
       LIMIT 1`,
      [userId]
    );

    // Calculate pain trend (last 7 days vs previous 7 days)
    const painTrendData = await query<{ period: string; avg_pain: number | null }>(
      `SELECT 
        CASE 
          WHEN s.date >= NOW() - INTERVAL '7 days' THEN 'recent'
          ELSE 'previous'
        END as period,
        AVG(ss.pain_level) as avg_pain
       FROM sessions s
       JOIN session_sets ss ON s.id = ss.session_id
       WHERE s.user_id = $1 
         AND s.date >= NOW() - INTERVAL '14 days'
         AND ss.pain_level IS NOT NULL
       GROUP BY period`,
      [userId]
    );

    const recentPain = painTrendData.find(p => p.period === 'recent')?.avg_pain || null;
    const previousPain = painTrendData.find(p => p.period === 'previous')?.avg_pain || null;
    
    let trend: PainTrendData['trend'] = 'no_data';
    if (recentPain !== null && previousPain !== null) {
      const diff = recentPain - previousPain;
      if (Math.abs(diff) < 0.5) {
        trend = 'stable';
      } else if (diff < 0) {
        trend = 'improving';
      } else {
        trend = 'worsening';
      }
    } else if (recentPain !== null) {
      trend = 'stable';
    }

    const painTrend: PainTrendData = {
      recent_avg: recentPain,
      previous_avg: previousPain,
      trend
    };

    // Calculate streak (consecutive days with sessions)
    const streakData = await query<{ date: string }>(
      `SELECT DISTINCT DATE(s.date) as date
       FROM sessions s
       WHERE s.user_id = $1
       ORDER BY date DESC`,
      [userId]
    );

    let streak = 0;
    if (streakData.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < streakData.length; i++) {
        const sessionDate = new Date(streakData[i].date);
        sessionDate.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);
        
        if (sessionDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else if (i === 0 && sessionDate.getTime() === new Date(today.setDate(today.getDate() - 1)).getTime()) {
          // Allow streak to continue if last session was yesterday
          streak++;
          today.setDate(today.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Get recent sessions (last 5)
    const recentSessions = await query<RecentSession>(
      `SELECT s.id, s.date, s.session_type, s.notes,
              COUNT(DISTINCT ss.exercise_id) as exercise_count
       FROM sessions s
       LEFT JOIN session_sets ss ON s.id = ss.session_id
       WHERE s.user_id = $1
       GROUP BY s.id, s.date, s.session_type, s.notes
       ORDER BY s.date DESC
       LIMIT 5`,
      [userId]
    );

    return NextResponse.json({
      lastSession,
      painTrend,
      streak,
      recentSessions,
      hasData: recentSessions.length > 0
    }, { status: 200 });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
