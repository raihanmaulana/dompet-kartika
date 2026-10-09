'use server'

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { supabaseServer } from './supabase/server.ts'

export type AuthState = { error?: string; info?: string } | null

const clean = (v: FormDataEntryValue | null) => String(v ?? '').trim()

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = clean(fd.get('email')).toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!email || !password) return { error: 'Isi email dan kata sandi dulu ya.' }
  const sb = await supabaseServer()
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: /confirm/i.test(error.message) ? 'Email belum dikonfirmasi. Cek kotak masuk kamu.' : 'Email atau kata sandi belum cocok.' }
  }
  redirect('/')
}

export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = clean(fd.get('email')).toLowerCase()
  const password = String(fd.get('password') ?? '')
  const nama = clean(fd.get('nama')).slice(0, 40)
  if (!nama || !email) return { error: 'Nama dan email wajib diisi.' }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }
  const h = await headers()
  const origin = h.get('origin') ?? `https://${h.get('host')}`
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { nama }, emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: /registered|exists/i.test(error.message) ? 'Email ini sudah terdaftar. Coba masuk.' : 'Pendaftaran belum berhasil. Coba lagi sebentar.' }
  if (!data.session) return { info: 'Hampir selesai! Kami kirim tautan konfirmasi ke emailmu. Klik tautannya, lalu masuk.' }
  redirect('/')
}

export async function signOut() {
  const sb = await supabaseServer()
  await sb.auth.signOut()
  ;(await cookies()).delete('view_as')
  redirect('/masuk')
}

/** Satu pintu untuk form masuk/daftar: mode dibaca dari isian form, jadi tidak bisa tertukar. */
export async function authenticate(prev: AuthState, fd: FormData): Promise<AuthState> {
  return fd.get('mode') === 'daftar' ? signUp(prev, fd) : signIn(prev, fd)
}
