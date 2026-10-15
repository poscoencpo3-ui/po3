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
})();
