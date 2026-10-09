'use client'
// Suara perayaan buatan sendiri (Web Audio): letupan confetti + dentingan naik. Tanpa berkas audio.
let ctx: AudioContext | null = null

/** Panggil di dalam klik pengguna supaya browser mengizinkan suara yang diputar belakangan. */
export function primeAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* tanpa suara */ }
}

export function playCelebration() {
  try {
    primeAudio()
    const c = ctx
    if (!c || c.state !== 'running') return
    const t0 = c.currentTime + 0.02
    const master = c.createGain()
    master.gain.value = 0.5
    master.connect(c.destination)

    // letupan "pop": noise pendek yang disaring
    const len = Math.floor(c.sampleRate * 0.18)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const noise = c.createBufferSource(); noise.buffer = buf
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.8
    const ng = c.createGain(); ng.gain.setValueAtTime(0.9, t0); ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18)
    noise.connect(f).connect(ng).connect(master); noise.start(t0)

    // dentingan arpeggio C-E-G-C-E (pentatonik ceria)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((hz, i) => {
      const t = t0 + 0.08 + i * 0.075
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = hz
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz * 2
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
      const g2 = c.createGain(); g2.gain.value = 0.25
      o.connect(g).connect(master); o2.connect(g2).connect(g)
      o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6)
    })

    // kilau akhir: percikan nada tinggi acak
    for (let i = 0; i < 7; i++) {
      const t = t0 + 0.5 + i * 0.045
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2400 + Math.random() * 1800
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.2)
    }
  } catch { /* tanpa suara */ }
}
