import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const result = await query(
      'SELECT email, substring(password_hash, 1, 30) as hash_preview, created_at FROM users WHERE email = $1',
      ['demo@rehab.local']
    );
    
    if (result.length === 0) {
      return NextResponse.json({ 
        exists: false,
        message: 'Demo user not found'
      });
    }
    
    const user = result[0];
    
    // Test password verification
    const fullHashResult = await query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['demo@rehab.local']
    );
    
    const isValid = await bcrypt.compare('Demo2026!', fullHashResult[0].password_hash);
    
    return NextResponse.json({
      exists: true,
      user: user,
      passwordVerifies: isValid
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
