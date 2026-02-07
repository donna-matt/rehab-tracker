import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

interface CoachingLog {
  id: string;
  recommendation: string;
  context: any;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch coaching logs for this user
    const logs = await query<CoachingLog>(`
      SELECT 
        id,
        recommendation,
        context,
        created_at
      FROM coaching_logs
      WHERE athlete_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    return NextResponse.json({
      success: true,
      logs: logs,
    });

  } catch (error: any) {
    console.error('Coaching history error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch coaching history',
    }, { status: 500 });
  }
}
