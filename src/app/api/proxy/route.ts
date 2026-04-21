import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { executeRequest } from '@/services/http.service';
import type { ProxyResponseBody } from '@/types';

const headerSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
});

const requestSchema = z.object({
  url: z.string().url('Invalid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.array(headerSchema).default([]),
  body: z.string().default(''),
  bypassSsl: z.boolean().default(false),
  certificate: z.string().optional(),
  credentialsSecretName: z.string().optional(),
  contentType: z.enum(['json', 'raw', 'form-data', 'x-www-form-urlencoded']).default('json'),
  files: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    content: z.string(), // Base64
    fieldName: z.string().optional(),
  })).optional(),
  formData: z.record(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  // Ensure the caller is authenticated
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Suporte a body aninhado ou plano para evitar quebras entre versões
  const requestData = (body as Record<string, any>)?.request ?? body;
  const parsed = requestSchema.safeParse(requestData);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const apiResponse = await executeRequest(parsed.data);
    const responseBody: ProxyResponseBody = { data: apiResponse };
    return NextResponse.json(responseBody);
  } catch (err) {
    return NextResponse.json({ error: 'Request execution failed' }, { status: 502 });
  }
}
