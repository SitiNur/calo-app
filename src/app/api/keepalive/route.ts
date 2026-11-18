import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function trimEnv(value: string | undefined): string {
  return (value || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * GET /api/keepalive
 * Ping DB agar Supabase Free Plan tidak pause (~7 hari idle).
 * Opsional: set header `x-keepalive-secret` jika KEEPALIVE_SECRET diisi di env.
 */
export async function GET(req: NextRequest) {
  const expected = trimEnv(process.env.KEEPALIVE_SECRET);
  if (expected) {
    const got = req.headers.get('x-keepalive-secret') || req.nextUrl.searchParams.get('secret');
    if (got !== expected) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'missing_supabase_env' }, { status: 500 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Prefer RPC (writes timestamp = aktivitas DB yang jelas)
    const { data: touched, error: rpcError } = await supabase.rpc('touch_keepalive');
    if (!rpcError && touched) {
      return NextResponse.json({
        ok: true,
        method: 'rpc',
        updated_at: touched,
        at: new Date().toISOString(),
      });
    }

    // Fallback: SELECT tabel keepalive
    const { data, error } = await supabase
      .from('keepalive')
      .select('id, ping, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint: 'Jalankan supabase/keepalive.sql di SQL Editor dulu.',
        },
        { status: 502 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: 'keepalive_row_missing',
          hint: 'Jalankan supabase/keepalive.sql di SQL Editor dulu.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      method: 'select',
      row: data,
      at: new Date().toISOString(),
      note: rpcError ? `rpc_fallback: ${rpcError.message}` : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'keepalive_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
