/* WebAudio 로 합성한 효과음 (외부 파일 없음) */
(function () {
  let ctx = null;
  let muted = false;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(a, seconds) {
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const a = ac();
    if (!a || muted) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.3, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, q, attack) {
    const a = ac();
    if (!a || muted) return;
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a, dur);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq || 1000;
    f.Q.value = q || 1;
    const g = a.createGain();
    const t = a.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }

  const Sfx = {
    unlock: ac,
    toggle() {
      muted = !muted;
      return muted;
    },
    hit(tier) {
      tone(tier === 'fire' ? 520 : 900, 0.07, 'triangle', 0.45, 300);
      noise(0.05, 0.3, 2500, 2);
      if (tier === 'fire') {
        noise(0.5, 0.35, 600, 0.6, 0.02);
        tone(120, 0.4, 'sawtooth', 0.15, 50);
      } else if (tier === 'gold') {
        tone(1400, 0.18, 'sine', 0.15, 2200);
      }
    },
    bounce() {
      tone(1200, 0.05, 'sine', 0.3, 700);
    },
    net() {
      noise(0.12, 0.25, 400, 1.5);
    },
    whiff() {
      noise(0.18, 0.15, 1800, 0.8, 0.04);
    },
    cheer(big) {
      noise(big ? 2.2 : 1.4, big ? 0.35 : 0.22, 1100, 0.4, 0.25);
      noise(big ? 2.0 : 1.2, 0.15, 2600, 0.6, 0.3);
    },
    whistle() {
      tone(2600, 0.25, 'square', 0.08, 2500);
    },
    toss() {
      tone(500, 0.08, 'sine', 0.12, 800);
    },
  };
  window.Sfx = Sfx;

  /*
   * 배경음악: 경쾌한 스포츠 경기장 풍 루프 (WebAudio 로 실시간 합성, 음원 파일 없음)
   * 코드 진행 C - Am - F - G, 112 BPM. 관중 웅성거림(앰비언스)도 함께 깔린다.
   */
  const BPM = 112;
  const STEP = 60 / BPM / 2; // 8분음표
  const CHORDS = [
    [48, 52, 55, 60], // C
    [45, 48, 52, 57], // Am
    [41, 45, 48, 53], // F
    [43, 47, 50, 55], // G
  ];
  const MELODY = [0, 2, 3, 2, 1, 2, 3, -1, 3, 2, 1, 0, 1, 2, -1, 2];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const Music = {
    on: false,
    master: null,
    crowdGain: null,
    timer: null,
    nextTime: 0,
    step: 0,
    intensity: 0, // 0..1 (듀스 등 긴장감)
    enabled: (function () {
      try {
        return localStorage.getItem('pp_bgm') !== 'off';
      } catch (e) {
        return true;
      }
    })(),

    note(freq, t, dur, type, vol, dest) {
      const a = ctx;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(dest || this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    drum(t, kind) {
      const a = ctx;
      if (kind === 'kick') {
        const o = a.createOscillator();
        const g = a.createGain();
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 0.2);
        return;
      }
      const src = a.createBufferSource();
      src.buffer = this.noise;
      const f = a.createBiquadFilter();
      f.type = kind === 'hat' ? 'highpass' : 'bandpass';
      f.frequency.value = kind === 'hat' ? 7000 : 1800;
      const g = a.createGain();
      const dur = kind === 'hat' ? 0.04 : 0.12;
      g.gain.setValueAtTime(kind === 'hat' ? 0.18 : 0.45, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t, Math.random() * 0.5, dur + 0.02);
    },

    schedule() {
      const a = ctx;
      while (this.nextTime < a.currentTime + 0.25) {
        const t = this.nextTime;
        const i = this.step % 64; // 4마디 x 16스텝(8분음표 기준 2마디씩)
        const bar = Math.floor(i / 16);
        const chord = CHORDS[bar];
        const beat = i % 16;
        // 드럼
        if (beat % 4 === 0) this.drum(t, 'kick');
        if (beat % 4 === 2) this.drum(t, 'snare');
        this.drum(t, 'hat');
        if (this.intensity > 0.5 && beat % 2 === 1) this.drum(t + STEP / 2, 'hat');
        // 베이스 (8분음표 옥타브 왕복)
        this.note(midi(chord[0] - 12 + (beat % 2 ? 12 : 0)), t, STEP * 0.9, 'triangle', 0.32);
        // 코드 스탭 (엇박)
        if (beat % 2 === 1) for (const n of chord.slice(1)) this.note(midi(n), t, STEP * 0.6, 'square', 0.035);
        // 멜로디
        const m = MELODY[beat];
        if (m >= 0) this.note(midi(chord[m] + 12), t, STEP * 1.6, 'triangle', 0.12);
        this.nextTime += STEP;
        this.step++;
      }
    },

    start() {
      if (!this.enabled || this.on) return;
      const a = ac();
      if (!a) return;
      this.on = true;
      if (!this.master) {
        this.master = a.createGain();
        this.master.gain.value = 0.11;
        this.master.connect(a.destination);
        this.noise = noiseBuffer(a, 1);
        // 관중 웅성거림 (계속 흐르는 필터 노이즈)
        const src = a.createBufferSource();
        src.buffer = noiseBuffer(a, 3);
        src.loop = true;
        const f = a.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 650;
        f.Q.value = 0.6;
        this.crowdGain = a.createGain();
        this.crowdGain.gain.value = 0;
        src.connect(f).connect(this.crowdGain).connect(a.destination);
        src.start();
      }
      this.master.gain.setTargetAtTime(0.11, a.currentTime, 0.3);
      this.crowdGain.gain.setTargetAtTime(0.035, a.currentTime, 0.5);
      this.nextTime = a.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 60);
    },

    stop() {
      if (!this.on) return;
      this.on = false;
      clearInterval(this.timer);
      if (ctx && this.master) {
        this.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
        this.crowdGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      }
    },

    toggle() {
      this.enabled = !this.enabled;
      try {
        localStorage.setItem('pp_bgm', this.enabled ? 'on' : 'off');
      } catch (e) {
        /* 무시 */
      }
      if (this.enabled) this.start();
      else this.stop();
      return this.enabled;
    },

    // 득점 순간 관중 소리가 잠깐 커진다
    swell() {
      if (!this.crowdGain || !this.on) return;
      const t = ctx.currentTime;
      this.crowdGain.gain.cancelScheduledValues(t);
      this.crowdGain.gain.setTargetAtTime(0.12, t, 0.05);
      this.crowdGain.gain.setTargetAtTime(0.035, t + 0.8, 0.6);
    },
  };
  window.Music = Music;
})();
