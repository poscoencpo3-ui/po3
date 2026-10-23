// 곡마다 다른 반주 밴드: 악기 소리 + 편곡(어느 박자에 무엇을 칠지)
const hz = (m) => 440 * 2 ** ((m - 69) / 12)

export const ARR_INFO = {
  lullaby: '🎶 오르골',
  country: '🪕 컨트리',
  spring: '🌸 봄 마림바',
  party: '🎉 파티 아코디언',
  orchestra: '🎻 오케스트라',
  sleigh: '🛷 썰매방울',
  farm: '🐮 농장 밴조',
  baroque: '🎼 하프시코드',
  elise: '🌙 피아노',
  march: '🥁 행진 밴드',
}

export function makeBand({ ctx, accBus, padBus, drumBus, leadBus, noiseBuf, pianoNote, strings }) {
  // ---------------- 악기 ----------------
  const env = (g, t, peak, a, d) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }
  const tone = (type, f, t, peak, a, d, out, { to, det = 0, filter } = {}) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d)
    o.detune.value = det
    env(g, t, peak, a, d)
    if (filter) {
      const fl = ctx.createBiquadFilter()
      fl.type = filter.type || 'lowpass'
      fl.frequency.setValueAtTime(filter.f, t)
      if (filter.to) fl.frequency.exponentialRampToValueAtTime(filter.to, t + a + d)
      fl.Q.value = filter.q || 0.7
      o.connect(fl).connect(g).connect(out)
    } else o.connect(g).connect(out)
    o.start(t)
    o.stop(t + a + d + 0.05)
  }
  const noise = (t, peak, d, out, f, type = 'highpass', q = 0.7, a = 0.002) => {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    const fl = ctx.createBiquadFilter()
    fl.type = type
    fl.frequency.value = f
    fl.Q.value = q
    const g = ctx.createGain()
    env(g, t, peak, a, d)
    s.connect(fl).connect(g).connect(out)
    s.start(t, Math.random() * 0.6)
    s.stop(t + a + d + 0.05)
  }

  const I = {
    piano: (m, t, v = 0.5) => pianoNote(m, t, v, accBus, { partials: 4 }),
    bell: (m, t, v = 0.5) => {
      // 오르골·글로켄슈필
      tone('sine', hz(m), t, 0.11 * v, 0.002, 1.1, accBus)
      tone('sine', hz(m) * 2.76, t, 0.035 * v, 0.002, 0.35, accBus)
      tone('sine', hz(m) * 5.4, t, 0.015 * v, 0.002, 0.12, accBus)
    },
    marimba: (m, t, v = 0.5) => {
      tone('sine', hz(m), t, 0.16 * v, 0.003, 0.45, accBus)
      tone('sine', hz(m) * 4, t, 0.05 * v, 0.002, 0.07, accBus)
      noise(t, 0.02 * v, 0.02, accBus, 2500, 'bandpass', 2)
    },
    pluck: (m, t, v = 0.5, bright = 2600) => {
      // 기타·밴조·우쿨렐레
      tone('sawtooth', hz(m), t, 0.07 * v, 0.003, 0.5, accBus, { filter: { f: bright, to: 300 } })
      tone('triangle', hz(m) * 2, t, 0.03 * v, 0.002, 0.15, accBus)
      if (bright > 4000) tone('triangle', hz(m) * 3, t, 0.025 * v, 0.001, 0.08, accBus) // 밴조의 '팅'
    },
    strum: (ms, t, v = 0.5, bright) => ms.forEach((m, i) => I.pluck(m, t + i * 0.012, v, bright)),
    harpsi: (m, t, v = 0.5) => {
      tone('square', hz(m), t, 0.05 * v, 0.002, 0.55, accBus, { filter: { f: 6000, to: 900 } })
      tone('sawtooth', hz(m) * 2, t, 0.02 * v, 0.002, 0.25, accBus, { filter: { f: 7000, to: 1500 } })
    },
    bass: (m, t, d, v = 0.6) => {
      // 콘트라베이스처럼 둥둥
      tone('triangle', hz(m), t, 0.3 * v, 0.006, d, accBus, { filter: { f: 900, to: 250 } })
      tone('sine', hz(m) / 2, t, 0.15 * v, 0.008, d * 0.8, accBus)
    },
    brass: (ms, t, d, v = 0.5) =>
      ms.forEach((m) => {
        tone('sawtooth', hz(m), t, 0.045 * v, 0.03, d, accBus, { filter: { f: 2400, to: 700 } })
        tone('sawtooth', hz(m), t, 0.035 * v, 0.03, d, accBus, { det: 9, filter: { f: 2000, to: 600 } })
      }),
    accordion: (ms, t, d, v = 0.5) =>
      ms.forEach((m) => {
        tone('square', hz(m), t, 0.03 * v, 0.02, d, accBus, { filter: { f: 2200 } })
        tone('sawtooth', hz(m), t, 0.025 * v, 0.02, d, accBus, { det: 12, filter: { f: 1800 } })
      }),
    flute: (m, t, d, v = 0.5) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const lfo = ctx.createOscillator()
      const lg = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = hz(m)
      lfo.frequency.value = 5.5
      lg.gain.value = hz(m) * 0.006
      lfo.connect(lg).connect(o.frequency)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.07 * v, t + 0.06)
      g.gain.setValueAtTime(0.07 * v, t + d * 0.7)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g).connect(padBus)
      o.start(t)
      lfo.start(t)
      o.stop(t + d + 0.05)
      lfo.stop(t + d + 0.05)
    },
    // ---- 타악기 (부드러운 진짜 악기 느낌) ----
    kick: (t, v = 1) => tone('sine', 120, t, 0.5 * v, 0.003, 0.22, drumBus, { to: 48 }),
    snare: (t, v = 1) => {
      noise(t, 0.22 * v, 0.12, drumBus, 1700, 'bandpass', 0.9)
      tone('triangle', 210, t, 0.12 * v, 0.002, 0.07, drumBus, { to: 150 })
    },
    brush: (t, v = 1) => noise(t, 0.09 * v, 0.14, drumBus, 3500, 'bandpass', 0.6, 0.02),
    hat: (t, v = 1, open = false) => noise(t, 0.06 * v, open ? 0.2 : 0.03, drumBus, 9000),
    shaker: (t, v = 1) => noise(t, 0.05 * v, 0.05, drumBus, 7000, 'highpass', 0.7, 0.012),
    tamb: (t, v = 1) => {
      noise(t, 0.12 * v, 0.13, drumBus, 7500)
      tone('sine', 4900, t, 0.018 * v, 0.002, 0.12, drumBus)
      tone('sine', 6300, t, 0.014 * v, 0.002, 0.1, drumBus)
    },
    clap: (t, v = 1) => [0, 0.011, 0.022].forEach((d) => noise(t + d, 0.13 * v, 0.07, drumBus, 1300, 'bandpass', 1.3)),
    block: (t, v = 1, hi = true) => tone('sine', hi ? 1250 : 880, t, 0.16 * v, 0.001, 0.05, drumBus),
    triangle: (t, v = 1) => tone('sine', 5200, t, 0.03 * v, 0.002, 0.9, drumBus),
    sleigh: (t, v = 1) => {
      for (let i = 0; i < 4; i++) {
        noise(t + i * 0.012, 0.08 * v, 0.07, drumBus, 8000)
        tone('sine', 5600 + i * 450, t + i * 0.012, 0.014 * v, 0.001, 0.09, drumBus)
      }
    },
    timpani: (m, t, v = 1) => {
      tone('sine', hz(m), t, 0.4 * v, 0.004, 0.9, drumBus, { to: hz(m) * 0.96 })
      noise(t, 0.05 * v, 0.15, drumBus, 300, 'lowpass')
    },
    crash: (t, v = 1) => noise(t, 0.08 * v, 1.3, drumBus, 5000),
    roll: (t, len, v = 1) => {
      const n = Math.floor(len / 0.05)
      for (let i = 0; i < n; i++) I.snare(t + i * 0.05, v * (0.35 + (0.65 * i) / n))
    },
  }

  // 사람이 치는 것처럼: 박자는 몇 ms씩, 세기는 조금씩 들쭉날쭉 (북은 더 정확하게)
  // [시간 인자 위치, 세기 인자 위치, 타악기?]
  const HUMAN = {
    piano: [1, 2], bell: [1, 2], marimba: [1, 2], pluck: [1, 2], harpsi: [1, 2], timpani: [1, 2],
    bass: [1, 3], brass: [1, 3], accordion: [1, 3], flute: [1, 3],
    kick: [0, 1, 1], snare: [0, 1, 1], brush: [0, 1, 1], hat: [0, 1, 1], shaker: [0, 1, 1], tamb: [0, 1, 1],
    clap: [0, 1, 1], block: [0, 1, 1], triangle: [0, 1, 1], sleigh: [0, 1, 1],
  }
  for (const [k, [ti, vi, drum]] of Object.entries(HUMAN)) {
    const f = I[k]
    I[k] = (...a) => {
      a[ti] += (Math.random() + Math.random() - 1) * (drum ? 0.004 : 0.009)
      if (a[vi] !== undefined) a[vi] *= 0.88 + Math.random() * 0.22
      return f(...a)
    }
  }

  // ---------------- 리드 악기 ----------------
  // 건반을 맞추면 피아노와 함께 밴드의 리드 악기도 같은 멜로디를 연주 → 피아노가 따로 놀지 않음
  const NONE = { release() {} }
  const held = (m, t, v, len, { waves, peak, attack = 0.04, vib = 0, cutoff = 3000, open = false }) => {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak * v, t + attack)
    g.gain.setTargetAtTime(peak * v * 0.7, t + attack, 0.25)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(open ? cutoff * 0.3 : cutoff, t)
    if (open) lp.frequency.exponentialRampToValueAtTime(cutoff, t + attack + 0.05) // 금관의 '빠-' 하고 열리는 소리
    g.connect(lp).connect(leadBus)
    const nodes = []
    let wobble = null
    if (vib) {
      // 길게 끌면 조금 늦게 생기는 떨림(비브라토)
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 5 + Math.random() * 0.8
      wobble = ctx.createGain()
      wobble.gain.setValueAtTime(0, t)
      wobble.gain.linearRampToValueAtTime(vib, t + 0.4)
      lfo.connect(wobble)
      nodes.push(lfo)
    }
    for (const [type, mul, amp, det = 0] of waves) {
      const o = ctx.createOscillator()
      const og = ctx.createGain()
      o.type = type
      o.frequency.value = hz(m) * mul
      o.detune.value = det
      og.gain.value = amp
      if (wobble) wobble.connect(o.detune)
      o.connect(og).connect(g)
      nodes.push(o)
    }
    for (const o of nodes) {
      o.start(t)
      o.stop(t + len + 2)
    }
    return {
      release(at = ctx.currentTime) {
        const when = Math.max(at, t + attack + 0.01)
        g.gain.cancelScheduledValues(when)
        g.gain.setTargetAtTime(0.0001, when, 0.06)
        for (const o of nodes) {
          try {
            o.stop(when + 0.5)
          } catch {
            // 이미 멈춤
          }
        }
      },
    }
  }
  const FIDDLE = { waves: [['sawtooth', 1, 0.6], ['sawtooth', 1, 0.4, 7], ['triangle', 2, 0.15]], peak: 0.075, attack: 0.05, vib: 14, cutoff: 3200 }
  const VIOLINS = { waves: [['sawtooth', 1, 0.4, -9], ['sawtooth', 1, 0.4], ['sawtooth', 1, 0.4, 10]], peak: 0.07, attack: 0.08, vib: 12, cutoff: 2800 }
  const FLUTE = { waves: [['sine', 1, 1], ['sine', 2, 0.12], ['triangle', 1, 0.2]], peak: 0.1, attack: 0.06, vib: 10, cutoff: 6000 }
  const ACCORDION = { waves: [['square', 1, 0.45], ['sawtooth', 1, 0.4, 13], ['sawtooth', 1, 0.35, -5]], peak: 0.065, attack: 0.025, cutoff: 2600 }
  const TRUMPET = { waves: [['sawtooth', 1, 0.7], ['sawtooth', 1, 0.4, 6]], peak: 0.075, attack: 0.03, vib: 8, cutoff: 3200, open: true }
  const ding = (m, t, v, peak, d) => {
    tone('sine', hz(m), t, peak * v, 0.002, d, leadBus)
    tone('sine', hz(m) * 2.76, t, peak * 0.28 * v, 0.002, d * 0.25, leadBus)
    tone('sine', hz(m) * 5.4, t, peak * 0.1 * v, 0.002, d * 0.1, leadBus)
    return NONE
  }
  // piano: 멜로디 피아노 크기, play: 같이 연주하는 악기
  const lead = {
    lullaby: { piano: 0.85, play: (m, t, v) => ding(m + 12, t, v, 0.1, 1.3) }, // 한 옥타브 위 오르골
    country: { piano: 0.7, play: (m, t, v, len) => held(m, t, v, len, FIDDLE) },
    spring: {
      piano: 0.75,
      play: (m, t, v, len) => {
        noise(t, 0.012 * v, 0.07, leadBus, 2600, 'bandpass', 1, 0.02) // 숨소리
        return held(m, t, v, len, FLUTE)
      },
    },
    party: { piano: 0.7, play: (m, t, v, len) => held(m, t, v, len, ACCORDION) },
    orchestra: { piano: 0.75, play: (m, t, v, len) => held(m, t, v, len, VIOLINS) },
    sleigh: { piano: 0.85, play: (m, t, v) => ding(m + 12, t, v, 0.085, 0.9) }, // 글로켄슈필
    farm: { piano: 0.7, play: (m, t, v, len) => held(m, t, v, len, FIDDLE) },
    baroque: {
      piano: 0.7,
      play: (m, t, v) => {
        tone('square', hz(m), t, 0.045 * v, 0.002, 0.7, leadBus, { filter: { f: 6500, to: 1000 } })
        tone('sawtooth', hz(m) * 2, t, 0.018 * v, 0.002, 0.3, leadBus, { filter: { f: 7000, to: 1800 } })
        return NONE
      },
    },
    elise: { piano: 1, play: null }, // 피아노 독주곡은 피아노만
    march: { piano: 0.7, play: (m, t, v, len) => held(m, t, v, len, TRUMPET) },
  }

  // ---------------- 편곡 ----------------
  // c: { t, s(마디 안 8분음표 번호), meter, B(한 박 초), bar, hot(두 번째 바퀴), intro, bass, mid, third, sym }
  const A = {
    lullaby(c) {
      const { t, s, B, bass, mid, hot } = c
      const arp = [mid[0] + 12, mid[1] + 12, mid[2] + 12, mid[0] + 24, mid[2] + 12, mid[1] + 12, mid[0] + 12, mid[2]]
      I.bell(arp[s % 8], t, s % 2 ? 0.7 : 1)
      if (s % 4 === 0) I.piano(s === 0 ? bass : bass + 7, t, 0.45)
      if (hot) {
        if (s === 0) I.triangle(t, 0.8)
        I.shaker(t, s % 2 ? 0.4 : 0.6)
        if (s % 2 === 0) I.bell(arp[(s + 2) % 8] + 12, t + B / 4, 0.4)
      }
      return 1.1
    },
    country(c) {
      const { t, s, B, bass, mid, third, hot, meter } = c
      const strum = [bass + 12, mid[0] + 12, mid[1] + 12, mid[2] + 12]
      if (s % 4 === 0) I.bass(s === 0 ? bass : bass + 7, t, B * 0.9)
      if (s % 4 === 2) {
        I.strum(strum, t, 0.75)
        I.brush(t, 0.9)
      }
      if (s % 4 === 0) I.kick(t, 0.6)
      I.hat(t, s % 2 ? 0.5 : 0.8)
      if (hot) {
        if (s % 2 === 1) I.strum(strum.slice(1), t, 0.45)
        if (s % 2 === 1) I.tamb(t, 0.7)
        if (s === meter * 2 - 1) I.bass(bass + third, t, B * 0.4, 0.5) // 다음 화음으로 걸어가기
      }
      return 0.5
    },
    spring(c) {
      const { t, s, bass, mid, hot } = c
      const pat = [0, 1, 2, 1, 0, 1, 2, 1]
      I.marimba(mid[pat[s % 8]] + 12, t, s % 2 ? 0.7 : 1)
      if (s === 0) I.marimba(bass + 12, t, 0.9)
      if (s % 4 === 0) I.piano(bass, t, 0.4)
      I.shaker(t, s % 2 ? 0.5 : 0.8)
      if (s % 4 === 0) I.kick(t, 0.5)
      if (hot) {
        if (s === 2 || s === 6) I.clap(t, 0.8)
        if (s % 4 === 0) I.flute(mid[2] + 24, t, c.B * 1.8, 0.8)
      }
      return 0.8
    },
    party(c) {
      // 3/4 쿵-짝-짝
      const { t, s, B, bass, mid, hot } = c
      if (s === 0) {
        I.bass(bass, t, B * 0.9, 0.7)
        I.kick(t, 0.6)
      }
      if (s === 2 || s === 4) {
        I.accordion(mid.map((m) => m + 12), t, B * 0.5, 0.9)
        I.tamb(t, 0.6)
      }
      if (hot) {
        if (s === 4) I.clap(t, 0.8)
        if (s === 0) I.bell(mid[2] + 24, t, 0.8)
        if (s === 1 || s === 3 || s === 5) I.shaker(t, 0.6)
      }
      return 0.6
    },
    orchestra(c) {
      const { t, s, B, bass, mid, hot, bar } = c
      if (s % 2 === 0) I.piano([bass, mid[0], mid[1], mid[2]][(s / 2) % 4] + 12, t, 0.4)
      if (s === 0) I.timpani(bass, t, 0.8)
      if (hot) {
        if (s === 4) I.timpani(bass + 7 - 12, t, 0.6)
        if (s === 0) I.brass(mid.map((m) => m + 12), t, B * 1.6, 0.9)
        if (s === 0 && bar % 4 === 0) I.crash(t, 0.7)
        if (s === 6 && bar % 4 === 3) I.roll(t, B, 0.5)
      }
      return 1.5
    },
    sleigh(c) {
      const { t, s, B, bass, mid, third, hot } = c
      const walk = [bass, bass + third, bass + 7, bass + 9]
      if (s % 2 === 0) I.bass(walk[s / 2], t, B * 0.85, 0.65)
      if (s % 2 === 1) I.piano(mid[s % 3] + 12, t, 0.35)
      if (s === 3 || s === 7) mid.forEach((m) => I.piano(m + 12, t, 0.25))
      I.sleigh(t, s % 4 === 2 ? 1 : 0.6)
      if (s === 2 || s === 6) I.brush(t, 1)
      if (s === 0 || s === 4) I.kick(t, 0.5)
      if (hot) {
        if (s % 2 === 0) I.bell(mid[(s / 2) % 3] + 24, t, 0.6)
        if (s === 2 || s === 6) I.clap(t, 0.6)
      }
      return 0.6
    },
    farm(c) {
      // 밴조 붐칙 + 말발굽
      const { t, s, B, bass, mid, hot } = c
      if (s % 2 === 0) I.pluck(s % 4 === 0 ? bass + 12 : bass + 19, t, 0.9, 5200)
      else I.strum(mid.map((m) => m + 12), t, 0.6, 5600)
      I.block(t, s % 2 ? 0.7 : 0.5, s % 2 === 1)
      if (s % 4 === 0) I.bass(s === 0 ? bass : bass + 7, t, B * 0.8, 0.6)
      if (hot) {
        if (s === 2 || s === 6) I.clap(t, 0.9)
        if (s % 2 === 1) I.tamb(t, 0.6)
      }
      return 0.4
    },
    baroque(c) {
      // 3/4 하프시코드 + 첼로
      const { t, s, B, bass, mid, hot } = c
      if (s === 0) {
        I.harpsi(bass, t, 1)
        strings([bass + 12], t, B * 3, 0.9, padBus)
      }
      if (s === 2 || s === 4) mid.forEach((m, i) => I.harpsi(m, t + i * 0.01, 0.55))
      if (hot && s % 2 === 1) I.harpsi([mid[0], mid[1], mid[2]][(s - 1) / 2] + 12, t, 0.5)
      return 0.7
    },
    elise(c) {
      // 16분음표 라-미-라 + 두 번째엔 잔잔한 비트
      const { t, s, bass, hot } = c
      const pat = [bass, bass + 7, bass + 12]
      if (s < 3) I.piano(pat[s], t, s === 0 ? 0.55 : 0.42)
      if (hot) {
        if (s === 0) I.kick(t, 0.5)
        if (s === 3) I.brush(t, 0.7)
        I.shaker(t, 0.35)
      }
      return 0.9
    },
    march(c) {
      // 2/4 행진 밴드
      const { t, s, B, bass, mid, hot, bar } = c
      if (s === 0 || s === 2) {
        I.kick(t, 0.7)
        I.brass([s === 0 ? bass : bass + 7], t, B * 0.4, 1)
      }
      if (s % 2 === 1) {
        I.snare(t, 0.55)
        I.brass(mid, t, B * 0.25, 0.7)
      }
      I.hat(t, 0.4)
      if (hot) {
        I.snare(t + B / 4, 0.3)
        if (s === 0 && bar % 4 === 0) I.crash(t, 0.6)
        if (s % 2 === 0) I.bell(mid[(s / 2) % 3] + 24, t, 0.5)
      }
      if (bar % 8 === 7 && s === 2) I.roll(t, B, 0.6)
      return 0.4
    },
  }

  return { I, A, lead }
}
