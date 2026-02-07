import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { session_type, notes } = body;

    // Validate required fields
    if (!session_type || !['rehab', 'gym'].includes(session_type)) {
      return NextResponse.json(
        { error: 'Invalid session_type. Must be "rehab" or "gym"' },
        { status: 400 }
      );
    }

    // Create session
    const newSession = await queryOne<{ id: string; user_id: string; session_type: string; date: string; notes: string | null }>(
      `INSERT INTO sessions (user_id, session_type, notes, date)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, user_id, session_type, date, notes`,
      [userId, session_type, notes || null]
    );

    return NextResponse.json({
      success: true,
      session: newSession,
    }, { status: 201 });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all sessions for the user
    const sessions = await query(
      `SELECT s.id, s.session_type, s.date, s.notes,
              COUNT(ss.id) as set_count
       FROM sessions s
       LEFT JOIN session_sets ss ON s.id = ss.session_id
       WHERE s.user_id = $1
       GROUP BY s.id, s.session_type, s.date, s.notes
       ORDER BY s.date DESC`,
      [userId]
    );

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
