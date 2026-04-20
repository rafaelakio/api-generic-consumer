import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

const entrySchema = z.object({
  changeNumber: z.string(),
  level: z.enum(['SESSION_OPEN', 'CALL', 'SESSION_CLOSE', 'SESSION_SUMMARY', 'FULL_REPORT']),
  message: z.string(),
  timestamp: z.string(),
  table: z.array(z.record(z.unknown())).optional(),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 });
  }

  const { changeNumber, level, message, timestamp, table } = parsed.data;
  const prefix = `[${changeNumber}] [${timestamp}]`;

  switch (level) {
    case 'SESSION_OPEN':
      console.log('\n' + '═'.repeat(80));
      console.log(`${prefix} ${message}`);
      console.log('═'.repeat(80));
      break;
    case 'CALL':
      console.log(`${prefix} ${message}`);
      break;
    case 'SESSION_CLOSE':
      console.log('─'.repeat(80));
      console.log(`${prefix} ${message}`);
      break;
    case 'SESSION_SUMMARY':
      if (table && table.length > 0) {
        console.log(`${prefix} URLs consumidas:`);
        console.table(table);
      }
      console.log('═'.repeat(80) + '\n');
      break;
    case 'FULL_REPORT':
      console.log('\n' + message + '\n');
      break;
  }

  return NextResponse.json({ ok: true });
}
