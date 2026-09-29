/* 새별이 커리큘럼 (7~8세 수준, 파닉스 진행 중 · 듣고 따라 말하기 가능)
   회차마다: 파닉스(알파벳 소리) / 단어 5개(그림+간단 매칭) / 알파벳 따라쓰기 /
   사이트워드 3개(Dolch pre-primer 단어) / 오늘의 문장 2개(패턴 문장 따라쓰기 — 기본 문장 +
   조금 더 길고 복잡한 문장) / 빈칸 채우기(단어은행에서 골라 문장 완성) / 챈트+대화(듣고 따라 말하기) /
   그림 보고 단어 찾기 5개
   미국 유치원~1학년 교재(Handwriting Without Tears 글자→단어→문장 따라쓰기 순서, Dolch 사이트워드,
   "I see a ___." 류 패턴리더 문장)를 참고하되, 7~8세 수준에 맞게 단어량과 문장 길이·문형(있다/가지다,
   전치사구 포함 문장 등)을 늘려 문법 용어 없이도 더 풍부한 문장을 읽고 쓰도록 구성했습니다.
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
      { word: "dad", meaning: "아빠", emoji: "👨" },
      { word: "hello", meaning: "안녕", emoji: "👋" },
    ],
    sightWords: [
      { word: "I", meaning: "나는", emoji: "🙋" },
      { word: "see", meaning: "보다", emoji: "👀" },
      { word: "a", meaning: "하나의", emoji: "🔤" },
    ],
    pattern: {
      sentence: "I see a cat.",
      korean: "나는 고양이를 봐요.",
      emoji: "🐱",
    },
    pattern2: {
      sentence: "I see a ball and a cat.",
      korean: "나는 공과 고양이를 봐요.",
      emoji: "⚽🐱",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["apple", "ball", "cat"],
      items: [
        { sentence: "I see a ___.", emoji: "🍎", answer: "apple" },
        { sentence: "I see a ___.", emoji: "🐱", answer: "cat" },
      ],
    },
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
        { emoji: "👩", options: ["mom", "dad"], answer: "mom" },
        { emoji: "👨", options: ["dad", "mom"], answer: "dad" },
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
      { word: "hungry", meaning: "배고픈", emoji: "🤤" },
      { word: "play", meaning: "놀다", emoji: "🤾" },
    ],
    sightWords: [
      { word: "a", meaning: "하나의", emoji: "🔤" },
      { word: "the", meaning: "그(특정한 것)", emoji: "👉" },
      { word: "have", meaning: "가지고 있다", emoji: "🤲" },
    ],
    pattern: {
      sentence: "I see the dog.",
      korean: "나는 그 강아지를 봐요.",
      emoji: "🐶",
    },
    pattern2: {
      sentence: "I have a big dog.",
      korean: "나는 큰 개가 있어요.",
      emoji: "🐶",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["dog", "elephant", "fish"],
      items: [
        { sentence: "I see the ___.", emoji: "🐶", answer: "dog" },
        { sentence: "I have a ___.", emoji: "🐟", answer: "fish" },
      ],
    },
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
        { emoji: "🤤", options: ["hungry", "play"], answer: "hungry" },
        { emoji: "🤾", options: ["play", "hungry"], answer: "play" },
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
      { word: "tall", meaning: "키가 큰", emoji: "📏" },
      { word: "eat", meaning: "먹다", emoji: "🍽️" },
    ],
    sightWords: [
      { word: "like", meaning: "좋아하다", emoji: "❤️" },
      { word: "my", meaning: "나의", emoji: "🙋" },
      { word: "it", meaning: "그것", emoji: "👉" },
    ],
    pattern: {
      sentence: "I like my hat.",
      korean: "나는 내 모자를 좋아해요.",
      emoji: "🎩",
    },
    pattern2: {
      sentence: "It is my hat.",
      korean: "그것은 내 모자예요.",
      emoji: "🎩",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["giraffe", "hat", "ice cream"],
      items: [
        { sentence: "I like my ___.", emoji: "🎩", answer: "hat" },
        { sentence: "I see a ___.", emoji: "🦒", answer: "giraffe" },
      ],
    },
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
        { emoji: "📏", options: ["tall", "eat"], answer: "tall" },
        { emoji: "🍽️", options: ["eat", "tall"], answer: "eat" },
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
      { word: "fly", meaning: "날다", emoji: "🕊️" },
      { word: "drink", meaning: "마시다", emoji: "🥤" },
    ],
    sightWords: [
      { word: "is", meaning: "~이다", emoji: "🟰" },
      { word: "big", meaning: "큰", emoji: "📏" },
      { word: "this", meaning: "이것", emoji: "👇" },
    ],
    pattern: {
      sentence: "The lion is big.",
      korean: "그 사자는 커요.",
      emoji: "🦁",
    },
    pattern2: {
      sentence: "This juice is red.",
      korean: "이 주스는 빨간색이에요.",
      emoji: "🧃",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["juice", "kite", "lion"],
      items: [
        { sentence: "The ___ is big.", emoji: "🦁", answer: "lion" },
        { sentence: "I see a ___.", emoji: "🪁", answer: "kite" },
      ],
    },
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
        { emoji: "🕊️", options: ["fly", "drink"], answer: "fly" },
        { emoji: "🥤", options: ["drink", "fly"], answer: "drink" },
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
      { word: "climb", meaning: "오르다", emoji: "🧗" },
      { word: "eggs", meaning: "알", emoji: "🥚" },
    ],
    sightWords: [
      { word: "and", meaning: "그리고", emoji: "➕" },
      { word: "little", meaning: "작은", emoji: "🤏" },
      { word: "in", meaning: "~안에", emoji: "📥" },
    ],
    pattern: {
      sentence: "I see a little monkey.",
      korean: "나는 작은 원숭이를 봐요.",
      emoji: "🐵",
    },
    pattern2: {
      sentence: "The eggs are in the nest.",
      korean: "알들이 둥지 안에 있어요.",
      emoji: "🥚",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["monkey", "nest", "orange"],
      items: [
        { sentence: "I see a little ___.", emoji: "🐵", answer: "monkey" },
        { sentence: "I see an ___.", emoji: "🍊", answer: "orange" },
      ],
    },
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
        { emoji: "🧗", options: ["climb", "eggs"], answer: "climb" },
        { emoji: "🥚", options: ["eggs", "climb"], answer: "eggs" },
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
      { word: "crown", meaning: "왕관", emoji: "👑" },
      { word: "carrot", meaning: "당근", emoji: "🥕" },
    ],
    sightWords: [
      { word: "can", meaning: "~할 수 있다", emoji: "✅" },
      { word: "you", meaning: "너는", emoji: "🫵" },
      { word: "has", meaning: "가지고 있다(3인칭)", emoji: "🤲" },
    ],
    pattern: {
      sentence: "Can you see the rabbit?",
      korean: "너는 그 토끼가 보이니?",
      emoji: "🐰",
    },
    pattern2: {
      sentence: "The queen has a crown.",
      korean: "여왕은 왕관을 가지고 있어요.",
      emoji: "👑",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["pig", "queen", "rabbit"],
      items: [
        { sentence: "Can you see the ___?", emoji: "🐰", answer: "rabbit" },
        { sentence: "The ___ has a crown.", emoji: "👸", answer: "queen" },
      ],
    },
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
        { emoji: "👑", options: ["crown", "carrot"], answer: "crown" },
        { emoji: "🥕", options: ["carrot", "crown"], answer: "carrot" },
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
      { word: "rain", meaning: "비", emoji: "🌧️" },
      { word: "hide", meaning: "숨다", emoji: "🙈" },
    ],
    sightWords: [
      { word: "we", meaning: "우리는", emoji: "👫" },
      { word: "go", meaning: "가다", emoji: "🏃" },
      { word: "under", meaning: "~아래에", emoji: "📉" },
    ],
    pattern: {
      sentence: "We go to see the sun.",
      korean: "우리는 해를 보러 가요.",
      emoji: "☀️",
    },
    pattern2: {
      sentence: "The tiger can hide under the umbrella.",
      korean: "호랑이는 우산 아래에 숨을 수 있어요.",
      emoji: "🐯☂️",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["sun", "tiger", "umbrella"],
      items: [
        { sentence: "We go to see the ___.", emoji: "☀️", answer: "sun" },
        { sentence: "I see a ___.", emoji: "🐯", answer: "tiger" },
      ],
    },
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
        { emoji: "🌧️", options: ["rain", "hide"], answer: "rain" },
        { emoji: "🙈", options: ["hide", "rain"], answer: "hide" },
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
      { word: "music", meaning: "음악", emoji: "🎶" },
      { word: "stripes", meaning: "줄무늬", emoji: "〰️" },
    ],
    sightWords: [
      { word: "look", meaning: "보다", emoji: "🔍" },
      { word: "up", meaning: "위로", emoji: "⬆️" },
      { word: "with", meaning: "~와 함께", emoji: "🤝" },
    ],
    pattern: {
      sentence: "Look up! I see a zebra.",
      korean: "위를 봐! 나는 얼룩말이 보여.",
      emoji: "🦓",
    },
    pattern2: {
      sentence: "I play the violin with my friend.",
      korean: "나는 친구와 함께 바이올린을 연주해요.",
      emoji: "🎻🧑‍🤝‍🧑",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["violin", "watermelon", "zebra"],
      items: [
        { sentence: "Look up! I see a ___.", emoji: "🦓", answer: "zebra" },
        { sentence: "I play the ___.", emoji: "🎻", answer: "violin" },
      ],
    },
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
        { emoji: "🎶", options: ["music", "stripes"], answer: "music" },
        { emoji: "〰️", options: ["stripes", "music"], answer: "stripes" },
      ],
    },
  },
];
