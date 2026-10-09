'use client'
import { useActionState, useState } from 'react'
import { useBusyFlag } from './Busy'
import { authenticate, type AuthState } from '@/lib/auth-actions'

export function AuthForm() {
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk')
  const [st, act, pending] = useActionState<AuthState, FormData>(authenticate, null)
  useBusyFlag(pending)
  return (
    <div className="auth-card">
      <div className="seg" role="group" aria-label="Masuk atau daftar">
        <button type="button" aria-pressed={mode === 'masuk'} onClick={() => setMode('masuk')}>Masuk</button>
        <button type="button" aria-pressed={mode === 'daftar'} onClick={() => setMode('daftar')}>Daftar</button>
      </div>
      <form action={act} className="stack" key={mode}>
        <input type="hidden" name="mode" value={mode} />
        {mode === 'daftar' ? <label className="field"><span>Nama panggilan</span><input className="input" name="nama" autoComplete="nickname" required maxLength={40} /></label> : null}
        <label className="field"><span>Email</span><input className="input" type="email" name="email" autoComplete="email" required /></label>
        <label className="field"><span>Kata sandi</span><input className="input" type="password" name="password" autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} required minLength={mode === 'daftar' ? 8 : undefined} /></label>
        {mode === 'daftar' ? <p className="hint">Minimal 8 karakter.</p> : null}
        {st?.error ? <p className="form-msg err" role="alert">{st.error}</p> : null}
        {st?.info ? <p className="form-msg info" role="status">{st.info}</p> : null}
        <button className="btn full" type="submit" aria-busy={pending} disabled={pending}>{pending ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : 'Buat akun'}</button>
      </form>
    </div>
  )
}
