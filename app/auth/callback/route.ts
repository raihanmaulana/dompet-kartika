import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const url = req.nextUrl.clone()
  url.search = ''
  if (code) {
    const sb = await supabaseServer()
    const { error } = await sb.auth.exchangeCodeForSession(code)
    url.pathname = error ? '/masuk' : '/'
    return NextResponse.redirect(url)
  }
  url.pathname = '/masuk'
  return NextResponse.redirect(url)
}
