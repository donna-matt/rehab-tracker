import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: sessionId } = await params;
    const body = await request.json();
    const { exercise_id, set_number, reps, weight, pain_level, notes } = body;

    // Verify session belongs to user
    const sessionCheck = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (!sessionCheck) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionCheck.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate required fields
    if (!exercise_id || !set_number || !reps) {
      return NextResponse.json(
        { error: 'Missing required fields: exercise_id, set_number, reps' },
        { status: 400 }
      );
    }

    // Validate pain_level if provided
    if (pain_level !== undefined && pain_level !== null) {
      const painNum = Number(pain_level);
      if (isNaN(painNum) || painNum < 0 || painNum > 10) {
        return NextResponse.json(
          { error: 'pain_level must be between 0 and 10' },
          { status: 400 }
        );
      }
    }

    // Create session set
    const newSet = await queryOne(
      `INSERT INTO session_sets (session_id, exercise_id, set_number, reps, weight_kg, pain_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, session_id, exercise_id, set_number, reps, weight_kg, pain_level, notes, created_at`,
      [
        sessionId,
        exercise_id,
        set_number,
        reps,
        weight || null,
        pain_level !== undefined && pain_level !== null ? pain_level : null,
        notes || null
      ]
    );

    return NextResponse.json({
      success: true,
      set: newSet,
    }, { status: 201 });
  } catch (error) {
    console.error('Session set creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session set', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: sessionId } = await params;

    // Verify session belongs to user
    const sessionCheck = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (!sessionCheck) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionCheck.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all sets for the session
    const sets = await query(
      `SELECT ss.*, e.name as exercise_name, e.category
       FROM session_sets ss
       JOIN exercises e ON ss.exercise_id = e.id
       WHERE ss.session_id = $1
       ORDER BY ss.set_number ASC`,
      [sessionId]
    );

    return NextResponse.json({ sets }, { status: 200 });
  } catch (error) {
    console.error('Session sets fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session sets' },
      { status: 500 }
    );
  }
}
