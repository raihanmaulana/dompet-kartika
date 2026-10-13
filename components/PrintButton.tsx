'use client'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return <button type="button" className="btn small no-print" onClick={() => window.print()}><Printer aria-hidden size={16} /> Cetak / simpan PDF</button>
}
