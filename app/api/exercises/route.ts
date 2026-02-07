import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all exercises (public + user's custom ones)
    const exercises = await query(
      `SELECT id, name, category, is_rehab
       FROM exercises
       ORDER BY is_rehab DESC, name ASC`
    );

    return NextResponse.json({ exercises }, { status: 200 });
  } catch (error) {
    console.error('Exercises fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}
