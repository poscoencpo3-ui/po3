// 누구나 아는 곡 (모두 저작권이 끝난 곡이에요)
// 멜로디 표기: "음이름옥타브:박자" (R = 쉼표), | 는 마디 구분(읽기 편하라고)
// beat: 이 곡에서 한 박의 길이 단위 (4 = 4분음표, 8 = 8분음표)

export const SONGS = [
  {
    id: 'twinkle',
    title: '작은 별',
    by: '프랑스 민요 · 모차르트',
    level: 1,
    bpm: 104,
    meter: 4,
    style: 'pop',
    chords: 'C C F C F C G C C F C G C F C G C C F C F C G C',
    chordBeats: 2,
    melody: `C5:1 C5:1 G5:1 G5:1 | A5:1 A5:1 G5:2 | F5:1 F5:1 E5:1 E5:1 | D5:1 D5:1 C5:2 |
             G5:1 G5:1 F5:1 F5:1 | E5:1 E5:1 D5:2 | G5:1 G5:1 F5:1 F5:1 | E5:1 E5:1 D5:2 |
             C5:1 C5:1 G5:1 G5:1 | A5:1 A5:1 G5:2 | F5:1 F5:1 E5:1 E5:1 | D5:1 D5:1 C5:2`,
  },
  {
    id: 'airplane',
    title: '떴다 떴다 비행기',
    by: '미국 민요',
    level: 1,
    bpm: 112,
    meter: 4,
    style: 'pop',
    chords: 'C C G C C C G C',
    chordBeats: 4,
    melody: `E5:1 D5:1 C5:1 D5:1 | E5:1 E5:1 E5:2 | D5:1 D5:1 D5:2 | E5:1 G5:1 G5:2 |
             E5:1 D5:1 C5:1 D5:1 | E5:1 E5:1 E5:2 | D5:1 D5:1 E5:1 D5:1 | C5:4`,
  },
  {
    id: 'butterfly',
    title: '나비야',
    by: '독일 민요',
    level: 1,
    rounds: 1,
    bpm: 108,
    meter: 4,
    style: 'pop',
    chords: 'C G C C C G C C G G C C C G C C',
    chordBeats: 4,
    melody: `G5:1 E5:1 E5:2 | F5:1 D5:1 D5:2 | C5:1 D5:1 E5:1 F5:1 | G5:1 G5:1 G5:2 |
             G5:1 E5:1 E5:1 E5:1 | F5:1 D5:1 D5:1 D5:1 | C5:1 E5:1 G5:1 G5:1 | E5:1 E5:1 E5:2 |
             D5:1 D5:1 D5:1 D5:1 | D5:1 E5:1 F5:2 | E5:1 E5:1 E5:1 E5:1 | E5:1 F5:1 G5:2 |
             G5:1 E5:1 E5:2 | F5:1 D5:1 D5:2 | C5:1 E5:1 G5:1 G5:1 | C5:4`,
  },
  {
    id: 'birthday',
    title: '생일 축하합니다',
    by: '힐 자매',
    level: 2,
    bpm: 104,
    meter: 3,
    style: 'waltz',
    pickup: 1,
    chords: 'C G G C C F C C',
    chordBeats: 3,
    melody: `G4:0.75 G4:0.25 | A4:1 G4:1 C5:1 | B4:2 G4:0.75 G4:0.25 | A4:1 G4:1 D5:1 | C5:2 G4:0.75 G4:0.25 |
             G5:1 E5:1 C5:1 | B4:1 A4:1 F5:0.75 F5:0.25 | E5:1 C5:1 D5:1 | C5:3`,
  },
  {
    id: 'joy',
    title: '환희의 송가',
    by: '베토벤',
    level: 2,
    bpm: 120,
    meter: 4,
    style: 'pop',
    chords: 'C G C G C G C C G C G G C G C C',
    chordBeats: 4,
    melody: `E5:1 E5:1 F5:1 G5:1 | G5:1 F5:1 E5:1 D5:1 | C5:1 C5:1 D5:1 E5:1 | E5:1.5 D5:0.5 D5:2 |
             E5:1 E5:1 F5:1 G5:1 | G5:1 F5:1 E5:1 D5:1 | C5:1 C5:1 D5:1 E5:1 | D5:1.5 C5:0.5 C5:2 |
             D5:1 D5:1 E5:1 C5:1 | D5:1 E5:0.5 F5:0.5 E5:1 C5:1 | D5:1 E5:0.5 F5:0.5 E5:1 D5:1 | C5:1 D5:1 G4:2 |
             E5:1 E5:1 F5:1 G5:1 | G5:1 F5:1 E5:1 D5:1 | C5:1 C5:1 D5:1 E5:1 | D5:1.5 C5:0.5 C5:2`,
  },
  {
    id: 'jingle',
    title: '징글벨',
    by: '피어폰트',
    level: 2,
    bpm: 140,
    meter: 4,
    style: 'pop',
    chords: 'C C C C F C D G C C C C F C G C',
    chordBeats: 4,
    melody: `E5:1 E5:1 E5:2 | E5:1 E5:1 E5:2 | E5:1 G5:1 C5:1.5 D5:0.5 | E5:4 |
             F5:1 F5:1 F5:1.5 F5:0.5 | F5:1 E5:1 E5:1 E5:0.5 E5:0.5 | E5:1 D5:1 D5:1 E5:1 | D5:2 G5:2 |
             E5:1 E5:1 E5:2 | E5:1 E5:1 E5:2 | E5:1 G5:1 C5:1.5 D5:0.5 | E5:4 |
             F5:1 F5:1 F5:1.5 F5:0.5 | F5:1 E5:1 E5:1 E5:0.5 E5:0.5 | G5:1 G5:1 F5:1 D5:1 | C5:4`,
  },
  {
    id: 'minuet',
    title: '미뉴에트 G장조',
    by: '바흐 노트북',
    level: 3,
    bpm: 132,
    meter: 3,
    style: 'waltz',
    chords: 'G G C G C G D D G G C G C G D G',
    chordBeats: 3,
    melody: `D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5:1 G4:1 G4:1 | E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5:1 G4:1 G4:1 |
             C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | F#4:1 G4:0.5 A4:0.5 B4:0.5 G4:0.5 | A4:3 |
             D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5:1 G4:1 G4:1 | E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5:1 G4:1 G4:1 |
             C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | A4:1 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 | G4:3`,
  },
  {
    id: 'elise',
    title: '엘리제를 위하여',
    by: '베토벤',
    level: 3,
    rounds: 3,
    bpm: 180,
    meter: 3,
    style: 'arp',
    pickup: 1,
    chords: 'Am Am E Am Am Am E Am',
    chordBeats: 3,
    melody: `E5:0.5 D#5:0.5 |
             E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 | A4:1 R:0.5 C4:0.5 E4:0.5 A4:0.5 | B4:1 R:0.5 E4:0.5 G#4:0.5 B4:0.5 | C5:1 R:0.5 E4:0.5 E5:0.5 D#5:0.5 |
             E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 | A4:1 R:0.5 C4:0.5 E4:0.5 A4:0.5 | B4:1 R:0.5 E4:0.5 C5:0.5 B4:0.5 | A4:2 R:1`,
  },
  {
    id: 'turkish',
    title: '터키 행진곡',
    by: '모차르트',
    level: 3,
    rounds: 3,
    bpm: 100,
    meter: 2,
    style: 'march',
    pickup: 1,
    chords: 'Am E Am Am C Am B Em',
    chordBeats: 2,
    melody: `B4:0.25 A4:0.25 G#4:0.25 A4:0.25 |
             C5:0.5 R:0.5 D5:0.25 C5:0.25 B4:0.25 C5:0.25 | E5:0.5 R:0.5 F5:0.25 E5:0.25 D#5:0.25 E5:0.25 |
             B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 | C6:1 A5:0.5 C6:0.5 |
             B5:0.5 A5:0.5 G5:0.5 A5:0.5 | B5:0.5 A5:0.5 G5:0.5 A5:0.5 | B5:0.5 A5:0.5 G5:0.5 F#5:0.5 | E5:1 R:0.25 B4:0.25 A4:0.25 G#4:0.25 A4:0.25`,
  },
]

export const LEVEL_INFO = {
  1: { name: '1단계', sub: '쉬움', fall: 2.3 },
  2: { name: '2단계', sub: '보통', fall: 1.9 },
  3: { name: '3단계', sub: '어려움', fall: 1.55 },
}

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function midiOf(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)
  if (!m) throw new Error('음 이름 오류: ' + name)
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}

const ROOTS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function chordNotes(sym) {
  const minor = sym.endsWith('m')
  const root = ROOTS[sym[0]] + (sym[1] === '#' ? 1 : 0)
  // E, B 는 장조로 (단조 곡의 딸림화음)
  return [root, root + (minor ? 3 : 4), root + 7]
}

// 곡 → 시간표. 멜로디를 두 번 (두 번째는 반주가 더 신나게, 사이에 한 마디 쉼)
export function buildSong(song, rounds = 2) {
  const beatSec = 60 / song.bpm
  const toks = song.melody.split(/[\s|]+/).filter(Boolean)
  const one = []
  let b = 0
  for (const tk of toks) {
    const [n, d] = tk.split(':')
    const dur = Number(d)
    if (n !== 'R') one.push({ beat: b, midi: midiOf(n), dur })
    b += dur
  }
  const pickup = song.pickup || 0
  const bars = Math.ceil((b - pickup) / song.meter - 1e-6)
  const roundLen = (bars + 1) * song.meter // 한 바퀴 + 쉬는 한 마디
  const notes = []
  for (let r = 0; r < rounds; r++) {
    for (const n of one) notes.push({ ...n, beat: n.beat + r * roundLen, round: r })
  }
  const chords = song.chords.split(/\s+/)
  const totalBeats = pickup + roundLen * rounds - song.meter
  return { beatSec, notes, chords, bars, pickup, roundLen, totalBeats, rounds }
}

// 반주용: 곡 시작(박) 기준으로 지금 화음
export function chordAt(song, s, beat) {
  const b = beat - s.pickup
  if (b < 0) return song.chords.split(/\s+/)[0]
  const inRound = b % s.roundLen
  const barBeats = s.bars * song.meter
  const k = inRound >= barBeats ? s.chords.length - 1 : Math.floor(inRound / song.chordBeats)
  return s.chords[Math.min(k, s.chords.length - 1)]
}

// 멜로디 → 4줄 건반. 음이 올라가면 오른쪽, 내려가면 왼쪽, 같은 음이면 같은 줄
export function makeChart(song, rounds = song.rounds || 2) {
  const s = buildSong(song, rounds)
  const intro = song.meter * 2 // 반주만 나오는 앞부분 (2마디)
  let lane = 1
  let prev = null
  const notes = s.notes.map((n, i) => {
    if (prev !== null) {
      const d = n.midi - prev
      const step = d === 0 ? 0 : Math.sign(d) * (Math.abs(d) > 4 ? 2 : 1)
      let next = lane + step
      if (next > 3) next = lane === 3 ? 2 : 3
      if (next < 0) next = lane === 0 ? 1 : 0
      lane = next
    } else lane = n.midi >= 72 ? 2 : 1
    prev = n.midi
    const t = (intro + n.beat) * s.beatSec
    const len = n.dur * s.beatSec
    const hold = len >= 0.75
    return { i, lane, t, end: hold ? t + len * 0.8 : t, hold, midi: n.midi, len }
  })
  return { ...s, intro, notes, duration: (intro + s.totalBeats) * s.beatSec + 1.5 }
}
