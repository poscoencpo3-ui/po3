/* 새별이 커리큘럼 (6세, 파닉스 진행 중 · 듣고 따라 말하기 가능)
   회차마다: 파닉스(알파벳 소리) / 단어(그림+간단 매칭) / 알파벳 따라쓰기 / 챈트+대화(듣고 따라 말하기)
   ※ 파닉스 시작 지점은 A부터로 기본 설정했습니다. 이미 진행한 알파벳이 있다면 말씀해주시면
     시작 회차를 조정해 드릴게요.
   2일에 1회차 진행 기준, 총 8회차(약 16일) */
const CURRICULUM_SAEBYUL = [
  {
    id: 1,
    title: "1회차 · Aa, Bb, Cc",
    phonics: [
      { letter: "Aa", sound: "애", word: "apple", emoji: "🍎" },
      { letter: "Bb", sound: "브", word: "ball", emoji: "⚽" },
      { letter: "Cc", sound: "크", word: "cat", emoji: "🐱" },
    ],
    tracing: ["A", "a", "B", "b", "C", "c"],
    vocab: [
      { word: "yes", meaning: "네", emoji: "🙆" },
      { word: "no", meaning: "아니요", emoji: "🙅" },
      { word: "mom", meaning: "엄마", emoji: "👩" },
    ],
    speaking: {
      chant: "A a apple! B b ball! C c cat! 🎵",
      dialogue: [
        { speaker: "새별", line: "A, a, apple!" },
        { speaker: "새봄", line: "B, b, ball!" },
        { speaker: "새별", line: "C, c, cat!" },
      ],
      instruction: "부모님이 먼저 소리 내어 읽어주면, 새별이가 듣고 따라 말해요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🍎", options: ["apple", "ball"], answer: "apple" },
        { emoji: "⚽", options: ["cat", "ball"], answer: "ball" },
        { emoji: "🐱", options: ["cat", "apple"], answer: "cat" },
      ],
    },
  },
  {
    id: 2,
    title: "2회차 · Dd, Ee, Ff",
    phonics: [
      { letter: "Dd", sound: "드", word: "dog", emoji: "🐶" },
      { letter: "Ee", sound: "에", word: "elephant", emoji: "🐘" },
      { letter: "Ff", sound: "프", word: "fish", emoji: "🐟" },
    ],
    tracing: ["D", "d", "E", "e", "F", "f"],
    vocab: [
      { word: "dad", meaning: "아빠", emoji: "👨" },
      { word: "big", meaning: "큰", emoji: "🐋" },
      { word: "small", meaning: "작은", emoji: "🐜" },
    ],
    speaking: {
      chant: "D d dog! E e elephant! F f fish! 🎵",
      dialogue: [
        { speaker: "새별", line: "D, d, dog!" },
        { speaker: "새봄", line: "E, e, elephant!" },
        { speaker: "새별", line: "F, f, fish!" },
      ],
      instruction: "챈트를 3번 듣고, 새별이가 큰 소리로 따라 말해요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐶", options: ["dog", "fish"], answer: "dog" },
        { emoji: "🐘", options: ["elephant", "dog"], answer: "elephant" },
        { emoji: "🐟", options: ["fish", "elephant"], answer: "fish" },
      ],
    },
  },
  {
    id: 3,
    title: "3회차 · Gg, Hh, Ii",
    phonics: [
      { letter: "Gg", sound: "그", word: "giraffe", emoji: "🦒" },
      { letter: "Hh", sound: "흐", word: "hat", emoji: "🎩" },
      { letter: "Ii", sound: "이", word: "ice cream", emoji: "🍦" },
    ],
    tracing: ["G", "g", "H", "h", "I", "i"],
    vocab: [
      { word: "happy", meaning: "행복한", emoji: "😊" },
      { word: "sad", meaning: "슬픈", emoji: "😢" },
      { word: "run", meaning: "달리다", emoji: "🏃" },
    ],
    speaking: {
      chant: "G g giraffe! H h hat! I i ice cream! 🎵",
      dialogue: [
        { speaker: "새봄", line: "G, g, giraffe!" },
        { speaker: "새별", line: "H, h, hat!" },
        { speaker: "새봄", line: "I, i, ice cream!" },
      ],
      instruction: "손가락으로 글자를 짚으며 소리 내어 말해요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🦒", options: ["giraffe", "hat"], answer: "giraffe" },
        { emoji: "🎩", options: ["hat", "giraffe"], answer: "hat" },
        { emoji: "🍦", options: ["ice cream", "hat"], answer: "ice cream" },
      ],
    },
  },
  {
    id: 4,
    title: "4회차 · Jj, Kk, Ll",
    phonics: [
      { letter: "Jj", sound: "즈", word: "juice", emoji: "🧃" },
      { letter: "Kk", sound: "크", word: "kite", emoji: "🪁" },
      { letter: "Ll", sound: "르", word: "lion", emoji: "🦁" },
    ],
    tracing: ["J", "j", "K", "k", "L", "l"],
    vocab: [
      { word: "red", meaning: "빨간색", emoji: "🔴" },
      { word: "blue", meaning: "파란색", emoji: "🔵" },
      { word: "yellow", meaning: "노란색", emoji: "🟡" },
    ],
    speaking: {
      chant: "J j juice! K k kite! L l lion! 🎵",
      dialogue: [
        { speaker: "새별", line: "J, j, juice!" },
        { speaker: "새봄", line: "K, k, kite!" },
        { speaker: "새별", line: "L, l, lion!" },
      ],
      instruction: "새봄이와 번갈아 가며 한 단어씩 말해요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🧃", options: ["juice", "kite"], answer: "juice" },
        { emoji: "🪁", options: ["kite", "lion"], answer: "kite" },
        { emoji: "🦁", options: ["lion", "juice"], answer: "lion" },
      ],
    },
  },
  {
    id: 5,
    title: "5회차 · Mm, Nn, Oo",
    phonics: [
      { letter: "Mm", sound: "므", word: "monkey", emoji: "🐵" },
      { letter: "Nn", sound: "느", word: "nest", emoji: "🪺" },
      { letter: "Oo", sound: "아", word: "orange", emoji: "🍊" },
    ],
    tracing: ["M", "m", "N", "n", "O", "o"],
    vocab: [
      { word: "one", meaning: "하나", emoji: "1️⃣" },
      { word: "two", meaning: "둘", emoji: "2️⃣" },
      { word: "three", meaning: "셋", emoji: "3️⃣" },
    ],
    speaking: {
      chant: "M m monkey! N n nest! O o orange! 🎵",
      dialogue: [
        { speaker: "새봄", line: "M, m, monkey!" },
        { speaker: "새별", line: "N, n, nest!" },
        { speaker: "새봄", line: "O, o, orange!" },
      ],
      instruction: "원숭이 흉내를 내며 재미있게 말해봐요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐵", options: ["monkey", "nest"], answer: "monkey" },
        { emoji: "🪺", options: ["nest", "orange"], answer: "nest" },
        { emoji: "🍊", options: ["orange", "monkey"], answer: "orange" },
      ],
    },
  },
  {
    id: 6,
    title: "6회차 · Pp, Qq, Rr",
    phonics: [
      { letter: "Pp", sound: "프", word: "pig", emoji: "🐷" },
      { letter: "Qq", sound: "크우", word: "queen", emoji: "👸" },
      { letter: "Rr", sound: "르", word: "rabbit", emoji: "🐰" },
    ],
    tracing: ["P", "p", "Q", "q", "R", "r"],
    vocab: [
      { word: "hot", meaning: "더운", emoji: "🥵" },
      { word: "cold", meaning: "추운", emoji: "🥶" },
      { word: "good", meaning: "좋은", emoji: "👍" },
    ],
    speaking: {
      chant: "P p pig! Q q queen! R r rabbit! 🎵",
      dialogue: [
        { speaker: "새별", line: "P, p, pig!" },
        { speaker: "새봄", line: "Q, q, queen!" },
        { speaker: "새별", line: "R, r, rabbit!" },
      ],
      instruction: "rabbit을 듣고 그림책에서 토끼를 찾아보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐷", options: ["pig", "queen"], answer: "pig" },
        { emoji: "👸", options: ["queen", "rabbit"], answer: "queen" },
        { emoji: "🐰", options: ["rabbit", "pig"], answer: "rabbit" },
      ],
    },
  },
  {
    id: 7,
    title: "7회차 · Ss, Tt, Uu",
    phonics: [
      { letter: "Ss", sound: "스", word: "sun", emoji: "☀️" },
      { letter: "Tt", sound: "트", word: "tiger", emoji: "🐯" },
      { letter: "Uu", sound: "어", word: "umbrella", emoji: "☂️" },
    ],
    tracing: ["S", "s", "T", "t", "U", "u"],
    vocab: [
      { word: "up", meaning: "위로", emoji: "⬆️" },
      { word: "down", meaning: "아래로", emoji: "⬇️" },
      { word: "jump", meaning: "뛰다", emoji: "🤸" },
    ],
    speaking: {
      chant: "S s sun! T t tiger! U u umbrella! 🎵",
      dialogue: [
        { speaker: "새봄", line: "S, s, sun!" },
        { speaker: "새별", line: "T, t, tiger!" },
        { speaker: "새봄", line: "U, u, umbrella!" },
      ],
      instruction: "호랑이처럼 크게 그르렁 소리를 내며 말해봐요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "☀️", options: ["sun", "tiger"], answer: "sun" },
        { emoji: "🐯", options: ["tiger", "umbrella"], answer: "tiger" },
        { emoji: "☂️", options: ["umbrella", "sun"], answer: "umbrella" },
      ],
    },
  },
  {
    id: 8,
    title: "8회차 · Vv, Ww, Xx, Yy, Zz (복습)",
    phonics: [
      { letter: "Vv", sound: "브", word: "violin", emoji: "🎻" },
      { letter: "Ww", sound: "워", word: "watermelon", emoji: "🍉" },
      { letter: "Xx", sound: "스", word: "box", emoji: "📦" },
      { letter: "Yy", sound: "여", word: "yo-yo", emoji: "🪀" },
      { letter: "Zz", sound: "즈", word: "zebra", emoji: "🦓" },
    ],
    tracing: ["V", "v", "W", "w", "X", "x", "Y", "y", "Z", "z"],
    vocab: [
      { word: "love", meaning: "사랑하다", emoji: "❤️" },
      { word: "friend", meaning: "친구", emoji: "🧑‍🤝‍🧑" },
      { word: "fun", meaning: "재미있는", emoji: "🎉" },
    ],
    speaking: {
      chant: "V v violin! W w watermelon! X, box! Y y yo-yo! Z z zebra! 🎵",
      dialogue: [
        { speaker: "새별", line: "V, v, violin!" },
        { speaker: "새봄", line: "W, w, watermelon!" },
        { speaker: "새별", line: "Y, y, yo-yo!" },
        { speaker: "새봄", line: "Z, z, zebra!" },
      ],
      instruction: "A부터 Z까지 다 함께 처음부터 끝까지 말해보아요. 이번 회차로 알파벳 소리 한 바퀴 완성!",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🍉", options: ["watermelon", "zebra"], answer: "watermelon" },
        { emoji: "🪀", options: ["yo-yo", "violin"], answer: "yo-yo" },
        { emoji: "🦓", options: ["zebra", "box"], answer: "zebra" },
      ],
    },
  },
];
