import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SessionData {
  session_id: string;
  date: string;
  session_type: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  pain_level: number | null;
  notes: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch last 15 sessions with all sets and exercises
    const sessions = await query<SessionData>(`
      SELECT 
        s.id as session_id,
        s.date,
        s.session_type,
        e.name as exercise_name,
        ss.set_number,
        ss.reps,
        ss.weight_kg,
        ss.duration_seconds,
        ss.pain_level,
        ss.notes
      FROM sessions s
      LEFT JOIN session_sets ss ON s.id = ss.session_id
      LEFT JOIN exercises e ON ss.exercise_id = e.id
      WHERE s.user_id = $1
      ORDER BY s.date DESC, ss.set_number ASC
      LIMIT 150
    `, [userId]);

    if (sessions.length === 0) {
      return NextResponse.json({
        error: 'No session data found. Please log at least a few sessions before requesting coaching advice.',
      }, { status: 400 });
    }

    // Format session data for AI analysis
    const sessionSummary = formatSessionData(sessions);

    // Call Claude API
    const aiResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `You are a knee rehab coach analyzing a patient's workout history. Analyze this data and provide personalized advice.

Session Data:
${sessionSummary}

Provide your analysis in the following structured format:

## Pain Progression
[Brief summary of pain trends over time]

## Exercise Recommendations
[Specific recommendations to increase/decrease intensity, add/remove exercises]

## Form Warnings
[If pain increased after certain exercises, warn about possible form issues]

## Recovery Suggestions
[Advice on rest, recovery, and next steps]

Keep your response concise (under 5KB), actionable, and encouraging.`
      }]
    });

    const recommendationText = aiResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Ensure response isn't too large
    if (recommendationText.length > 5000) {
      return NextResponse.json({
        error: 'AI response too large. Please try again.',
      }, { status: 500 });
    }

    // Store recommendation in coaching_logs
    const context = {
      sessions_analyzed: sessions.length,
      model: 'claude-3-5-sonnet-20241022',
      timestamp: new Date().toISOString(),
    };

    await query(`
      INSERT INTO coaching_logs (athlete_id, recommendation, context)
      VALUES ($1, $2, $3)
    `, [userId, recommendationText, JSON.stringify(context)]);

    return NextResponse.json({
      success: true,
      recommendation: recommendationText,
      sessionsAnalyzed: sessions.length,
    });

  } catch (error: any) {
    console.error('Coaching analysis error:', error);
    
    // Handle specific Anthropic errors
    if (error.status === 401) {
      return NextResponse.json({
        error: 'API authentication failed. Please check ANTHROPIC_API_KEY.',
      }, { status: 500 });
    }

    return NextResponse.json({
      error: error.message || 'Failed to generate coaching recommendations',
    }, { status: 500 });
  }
}

function formatSessionData(sessions: SessionData[]): string {
  const grouped = sessions.reduce((acc, row) => {
    const key = `${row.session_id}-${row.date}`;
    if (!acc[key]) {
      acc[key] = {
        date: new Date(row.date).toLocaleDateString(),
        type: row.session_type,
        exercises: [],
      };
    }
    if (row.exercise_name) {
      acc[key].exercises.push({
        name: row.exercise_name,
        set: row.set_number,
        reps: row.reps,
        weight: row.weight_kg,
        duration: row.duration_seconds,
        pain: row.pain_level,
        notes: row.notes,
      });
    }
    return acc;
  }, {} as Record<string, any>);

  let output = '';
  for (const [, session] of Object.entries(grouped)) {
    output += `\n📅 ${session.date} (${session.type})\n`;
    for (const ex of session.exercises) {
      output += `  - ${ex.name}: `;
      if (ex.reps) output += `${ex.reps} reps`;
      if (ex.weight) output += ` @ ${ex.weight}kg`;
      if (ex.duration) output += `${ex.duration}s`;
      if (ex.pain !== null) output += ` | Pain: ${ex.pain}/10`;
      if (ex.notes) output += ` | Note: ${ex.notes}`;
      output += '\n';
    }
  }

  return output;
}
