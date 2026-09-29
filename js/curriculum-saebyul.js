/* 새별이 커리큘럼 (7~8세 수준, 파닉스 완성 과정 · 듣고 따라 말하기 가능)
   회차마다: 파닉스 / 단어 5개(그림+간단 매칭) / 알파벳·단어 따라쓰기 /
   사이트워드 3개(Dolch 단어) / 오늘의 문장 2개(기본 문장 + 조금 더 길고 복잡한 확장 문장) /
   빈칸 채우기(단어은행에서 골라 문장 완성) / 챈트+대화(듣고 따라 말하기) / 그림 보고 단어 찾기 5개

   전체 20회차(2일 1회차 기준 약 40일)를 5단계로 구성해 시중 인기 파닉스 교재
   (Smart Phonics, 기적의 파닉스, Explode the Code 등)의 표준 진행 순서를 따라
   "파닉스 완성"까지 이어지도록 설계했습니다:
   1단계(1~8회차) 알파벳 소리(A~Z, 3~5자씩) →
   2단계(9~13회차) 단모음 + CVC 단어(word family: -at/-ap/-an, -et/-en/-ed 등, a·e·i·o·u) →
   3단계(14~16회차) 자음 블렌드(bl·cl·fl / cr·dr·tr / sp·st·sw) →
   4단계(17~18회차) 이중자음/디그래프(sh·ch·wh / th·ck) →
   5단계(19~20회차) 매직 e·묵음(silent e: a_e·i_e·o_e·u_e — 단어 끝 e는 소리 나지 않고
   앞 모음이 알파벳 이름으로 소리 남을 배우고, 20회차에서 전체 파닉스 총복습으로 마무리).
   그림 중심 카드와 짧은 챈트·대화로 문법 용어 없이 소리 규칙을 익히도록 했습니다.
   ※ 파닉스 시작 지점은 A부터로 기본 설정했습니다. 이미 진행한 알파벳이 있다면 말씀해주시면
     시작 회차를 조정해 드릴게요. */
const CURRICULUM_SAEBYUL = [
  {
    id: 1,
    title: "1회차 · Aa, Bb, Cc",
    phonics: [
      { letter: "Aa", sound: "애", word: "apple", emoji: "🍎" },
      { letter: "Bb", sound: "브", word: "ball", emoji: "⚽" },
      { letter: "Cc", sound: "크", word: "cat", emoji: "🐱" },
    ],
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
        { speaker: "새별", line: "Hello! Are you my friend?" },
        { speaker: "새봄", line: "Yes! Hello, Saebyul!" },
        { speaker: "새별", line: "I see a cat. Do you see it too?" },
        { speaker: "새봄", line: "Yes, I see it! So cute!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 인사하듯 역할을 나누어 대화를 따라 말해보아요.",
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
        { speaker: "새봄", line: "Are you hungry?" },
        { speaker: "새별", line: "Yes, I am hungry!" },
        { speaker: "새봄", line: "Let's have lunch with Dad." },
        { speaker: "새별", line: "Yay! Then let's play!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
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
        { speaker: "새별", line: "How are you today?" },
        { speaker: "새봄", line: "I am happy! How about you?" },
        { speaker: "새별", line: "I am happy too! I like my hat." },
        { speaker: "새봄", line: "It looks great on you!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
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
        { speaker: "새봄", line: "What color do you like?" },
        { speaker: "새별", line: "I like red! What about you?" },
        { speaker: "새봄", line: "I like blue. Can I drink my juice now?" },
        { speaker: "새별", line: "Yes, go ahead!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
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
        { speaker: "새별", line: "Look! I see a little monkey!" },
        { speaker: "새봄", line: "Wow, one, two, three monkeys!" },
        { speaker: "새별", line: "Can we feed them?" },
        { speaker: "새봄", line: "Sure, let's go see them." },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
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
        { speaker: "새봄", line: "Is it hot today?" },
        { speaker: "새별", line: "Yes, it's very hot!" },
        { speaker: "새봄", line: "Let's get a cold drink." },
        { speaker: "새별", line: "Good idea!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
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
        { speaker: "새별", line: "Look up! Is that rain?" },
        { speaker: "새봄", line: "Yes! Let's hide under my umbrella." },
        { speaker: "새별", line: "Okay! Can we jump in the puddles after?" },
        { speaker: "새봄", line: "Sure, let's go!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
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
        { speaker: "새봄", line: "I love this song! Do you?" },
        { speaker: "새별", line: "Yes! I love music too." },
        { speaker: "새봄", line: "You are my best friend." },
        { speaker: "새별", line: "You are my best friend too! This is so much fun." },
      ],
      instruction:
        "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요. 이번 회차로 알파벳 소리 한 바퀴 완성!",
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
  {
    id: 9,
    title: "9회차 · 단모음 a (CVC 단어)",
    phonics: [
      { letter: "-at", sound: "앳", word: "cat", emoji: "🐱" },
      { letter: "-ap", sound: "앱", word: "map", emoji: "🗺️" },
      { letter: "-an", sound: "앤", word: "fan", emoji: "🪭" },
    ],
    vocab: [
      { word: "bag", meaning: "가방", emoji: "🎒" },
      { word: "bat", meaning: "박쥐", emoji: "🦇" },
      { word: "can", meaning: "캔, ~할 수 있다", emoji: "🥫" },
      { word: "ant", meaning: "개미", emoji: "🐜" },
      { word: "jam", meaning: "잼", emoji: "🍓" },
    ],
    sightWords: [
      { word: "here", meaning: "여기", emoji: "👇" },
      { word: "to", meaning: "~으로", emoji: "➡️" },
      { word: "play", meaning: "놀다", emoji: "🤾" },
    ],
    pattern: {
      sentence: "I see a cat and a fan.",
      korean: "나는 고양이와 부채를 봐요.",
      emoji: "🐱🪭",
    },
    pattern2: {
      sentence: "The cat can play with the bag.",
      korean: "그 고양이는 가방을 가지고 놀 수 있어요.",
      emoji: "🐱🎒",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["cat", "map", "fan"],
      items: [
        { sentence: "I see a ___.", emoji: "🐱", answer: "cat" },
        { sentence: "I have a ___.", emoji: "🪭", answer: "fan" },
      ],
    },
    speaking: {
      chant: "C-a-t, cat! M-a-p, map! F-a-n, fan! 단모음 a는 애 소리! 🎵",
      dialogue: [
        { speaker: "새별", line: "What is in your bag?" },
        { speaker: "새봄", line: "I have juice and jam!" },
        { speaker: "새별", line: "Can I have some jam, please?" },
        { speaker: "새봄", line: "Yes, here you go!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐱", options: ["cat", "map"], answer: "cat" },
        { emoji: "🗺️", options: ["map", "fan"], answer: "map" },
        { emoji: "🪭", options: ["fan", "cat"], answer: "fan" },
        { emoji: "🎒", options: ["bag", "ant"], answer: "bag" },
        { emoji: "🐜", options: ["ant", "bag"], answer: "ant" },
      ],
    },
  },
  {
    id: 10,
    title: "10회차 · 단모음 e (CVC 단어)",
    phonics: [
      { letter: "-et", sound: "엣", word: "pet", emoji: "🐾" },
      { letter: "-en", sound: "엔", word: "hen", emoji: "🐔" },
      { letter: "-ed", sound: "에드", word: "bed", emoji: "🛏️" },
    ],
    vocab: [
      { word: "leg", meaning: "다리", emoji: "🦵" },
      { word: "web", meaning: "거미줄", emoji: "🕸️" },
      { word: "wet", meaning: "젖은", emoji: "💧" },
      { word: "ten", meaning: "열", emoji: "🔟" },
      { word: "vet", meaning: "수의사", emoji: "🩺" },
    ],
    sightWords: [
      { word: "get", meaning: "얻다", emoji: "🤲" },
      { word: "well", meaning: "잘", emoji: "👍" },
      { word: "said", meaning: "말했다", emoji: "💬" },
    ],
    pattern: {
      sentence: "I see a hen on the bed.",
      korean: "나는 침대 위에 있는 암탉을 봐요.",
      emoji: "🐔🛏️",
    },
    pattern2: {
      sentence: "The pet hen is wet.",
      korean: "그 반려 암탉은 젖었어요.",
      emoji: "🐔💧",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["pet", "hen", "bed"],
      items: [
        { sentence: "I have a ___.", emoji: "🐾", answer: "pet" },
        { sentence: "I sleep in my ___.", emoji: "🛏️", answer: "bed" },
      ],
    },
    speaking: {
      chant: "P-e-t, pet! H-e-n, hen! B-e-d, bed! 단모음 e는 에 소리! 🎵",
      dialogue: [
        { speaker: "새봄", line: "My leg hurts a little." },
        { speaker: "새별", line: "Are you okay? Let's see the vet." },
        { speaker: "새봄", line: "Okay, thank you." },
        { speaker: "새별", line: "Get well soon!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐾", options: ["pet", "bed"], answer: "pet" },
        { emoji: "🐔", options: ["hen", "pet"], answer: "hen" },
        { emoji: "🛏️", options: ["bed", "hen"], answer: "bed" },
        { emoji: "🦵", options: ["leg", "web"], answer: "leg" },
        { emoji: "🕸️", options: ["web", "leg"], answer: "web" },
      ],
    },
  },
  {
    id: 11,
    title: "11회차 · 단모음 i (CVC 단어)",
    phonics: [
      { letter: "-ig", sound: "이그", word: "pig", emoji: "🐷" },
      { letter: "-in", sound: "인", word: "pin", emoji: "📌" },
      { letter: "-it", sound: "잇", word: "sit", emoji: "🪑" },
    ],
    vocab: [
      { word: "lip", meaning: "입술", emoji: "👄" },
      { word: "six", meaning: "여섯", emoji: "6️⃣" },
      { word: "milk", meaning: "우유", emoji: "🥛" },
      { word: "pink", meaning: "분홍색", emoji: "💗" },
      { word: "kid", meaning: "아이", emoji: "🧒" },
    ],
    sightWords: [
      { word: "did", meaning: "~했다", emoji: "✅" },
      { word: "she", meaning: "그녀는", emoji: "👧" },
      { word: "will", meaning: "~할 것이다", emoji: "🔮" },
    ],
    pattern: {
      sentence: "The pig can sit.",
      korean: "그 돼지는 앉을 수 있어요.",
      emoji: "🐷",
    },
    pattern2: {
      sentence: "I sit and drink milk.",
      korean: "나는 앉아서 우유를 마셔요.",
      emoji: "🪑🥛",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["pig", "pin", "sit"],
      items: [
        { sentence: "I see a ___.", emoji: "🐷", answer: "pig" },
        { sentence: "Please ___ down.", emoji: "🪑", answer: "sit" },
      ],
    },
    speaking: {
      chant: "P-i-g, pig! P-i-n, pin! S-i-t, sit! 단모음 i는 이 소리! 🎵",
      dialogue: [
        { speaker: "새별", line: "Can I have some milk?" },
        { speaker: "새봄", line: "Sure! Here is your milk." },
        { speaker: "새별", line: "Thank you! I am six years old today!" },
        { speaker: "새봄", line: "Happy birthday!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐷", options: ["pig", "pin"], answer: "pig" },
        { emoji: "📌", options: ["pin", "sit"], answer: "pin" },
        { emoji: "🪑", options: ["sit", "pig"], answer: "sit" },
        { emoji: "👄", options: ["lip", "milk"], answer: "lip" },
        { emoji: "🥛", options: ["milk", "lip"], answer: "milk" },
      ],
    },
  },
  {
    id: 12,
    title: "12회차 · 단모음 o (CVC 단어)",
    phonics: [
      { letter: "-og", sound: "오그", word: "dog", emoji: "🐶" },
      { letter: "-ot", sound: "앗", word: "pot", emoji: "🍲" },
      { letter: "-op", sound: "압", word: "top", emoji: "🔝" },
    ],
    vocab: [
      { word: "box", meaning: "상자", emoji: "📦" },
      { word: "sock", meaning: "양말", emoji: "🧦" },
      { word: "frog", meaning: "개구리", emoji: "🐸" },
      { word: "lock", meaning: "자물쇠", emoji: "🔒" },
      { word: "rock", meaning: "바위", emoji: "🪨" },
    ],
    sightWords: [
      { word: "on", meaning: "~위에", emoji: "📍" },
      { word: "not", meaning: "~아니다", emoji: "🚫" },
      { word: "got", meaning: "얻었다", emoji: "🤲" },
    ],
    pattern: {
      sentence: "The dog sits on the rock.",
      korean: "그 개는 바위 위에 앉아요.",
      emoji: "🐶🪨",
    },
    pattern2: {
      sentence: "I put the pot on top.",
      korean: "나는 냄비를 위에 놓아요.",
      emoji: "🍲🔝",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["dog", "pot", "top"],
      items: [
        { sentence: "I see a ___.", emoji: "🐶", answer: "dog" },
        { sentence: "Put it on ___.", emoji: "🔝", answer: "top" },
      ],
    },
    speaking: {
      chant: "D-o-g, dog! P-o-t, pot! T-o-p, top! 단모음 o는 아 소리! 🎵",
      dialogue: [
        { speaker: "새봄", line: "What is in the box?" },
        { speaker: "새별", line: "It's a frog! I found it on a rock." },
        { speaker: "새봄", line: "Wow, can I see it?" },
        { speaker: "새별", line: "Sure, look!" },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐶", options: ["dog", "pot"], answer: "dog" },
        { emoji: "🍲", options: ["pot", "top"], answer: "pot" },
        { emoji: "🔝", options: ["top", "dog"], answer: "top" },
        { emoji: "📦", options: ["box", "sock"], answer: "box" },
        { emoji: "🧦", options: ["sock", "box"], answer: "sock" },
      ],
    },
  },
  {
    id: 13,
    title: "13회차 · 단모음 u (CVC 단어) + 단모음 총정리",
    phonics: [
      { letter: "-ug", sound: "어그", word: "bug", emoji: "🐛" },
      { letter: "-un", sound: "언", word: "sun", emoji: "☀️" },
      { letter: "-ut", sound: "엇", word: "cut", emoji: "✂️" },
    ],
    vocab: [
      { word: "cup", meaning: "컵", emoji: "🥤" },
      { word: "bus", meaning: "버스", emoji: "🚌" },
      { word: "mud", meaning: "진흙", emoji: "🟤" },
      { word: "duck", meaning: "오리", emoji: "🦆" },
      { word: "nut", meaning: "견과", emoji: "🥜" },
    ],
    sightWords: [
      { word: "but", meaning: "그러나", emoji: "↔️" },
      { word: "us", meaning: "우리를", emoji: "👫" },
      { word: "must", meaning: "~해야 한다", emoji: "❗" },
    ],
    pattern: {
      sentence: "The bug is in the sun.",
      korean: "그 벌레는 햇빛 속에 있어요.",
      emoji: "🐛☀️",
    },
    pattern2: {
      sentence: "The duck runs to the bus.",
      korean: "오리가 버스로 달려가요.",
      emoji: "🦆🚌",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["bug", "sun", "cut"],
      items: [
        { sentence: "I see a ___.", emoji: "🐛", answer: "bug" },
        { sentence: "The ___ is hot.", emoji: "☀️", answer: "sun" },
      ],
    },
    speaking: {
      chant: "B-u-g, bug! S-u-n, sun! C-u-t, cut! 단모음 u는 어 소리! 🎵",
      dialogue: [
        { speaker: "새별", line: "The bus is here! Let's go." },
        { speaker: "새봄", line: "Wait, I have my cup." },
        { speaker: "새별", line: "Okay, let's go see the ducks." },
        { speaker: "새봄", line: "I can't wait!" },
      ],
      instruction:
        "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요. " +
        "오늘로 a, e, i, o, u 다섯 단모음 소리를 모두 배웠어요!",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🐛", options: ["bug", "sun"], answer: "bug" },
        { emoji: "☀️", options: ["sun", "cut"], answer: "sun" },
        { emoji: "✂️", options: ["cut", "bug"], answer: "cut" },
        { emoji: "🥤", options: ["cup", "bus"], answer: "cup" },
        { emoji: "🚌", options: ["bus", "cup"], answer: "bus" },
      ],
    },
  },
  {
    id: 14,
    title: "14회차 · 자음 블렌드 bl · cl · fl",
    phonics: [
      { letter: "bl", sound: "블", word: "black", emoji: "⬛" },
      { letter: "cl", sound: "클", word: "clap", emoji: "👏" },
      { letter: "fl", sound: "플", word: "flag", emoji: "🚩" },
    ],
    vocab: [
      { word: "block", meaning: "블록", emoji: "🧱" },
      { word: "clock", meaning: "시계", emoji: "🕐" },
      { word: "flower", meaning: "꽃", emoji: "🌸" },
      { word: "plane", meaning: "비행기", emoji: "✈️" },
      { word: "glass", meaning: "유리잔", emoji: "🥛" },
    ],
    sightWords: [
      { word: "put", meaning: "놓다", emoji: "👇" },
      { word: "fast", meaning: "빠른", emoji: "💨" },
      { word: "now", meaning: "지금", emoji: "⏰" },
    ],
    pattern: {
      sentence: "Clap your hands fast!",
      korean: "손뼉을 빠르게 쳐요!",
      emoji: "👏",
    },
    pattern2: {
      sentence: "The black flag is on the plane.",
      korean: "그 검은 깃발은 비행기 위에 있어요.",
      emoji: "🚩✈️",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["black", "clap", "flag"],
      items: [
        { sentence: "I see a ___.", emoji: "🚩", answer: "flag" },
        { sentence: "___ your hands!", emoji: "👏", answer: "Clap" },
      ],
    },
    speaking: {
      chant: "Bl-bl-black! Cl-cl-clap! Fl-fl-flag! 자음 두 개가 만나 하나의 소리로! 🎵",
      dialogue: [
        { speaker: "새봄", line: "What time is it?" },
        { speaker: "새별", line: "Look at the clock! It's three." },
        { speaker: "새봄", line: "Let's go pick some flowers." },
        { speaker: "새별", line: "Okay! I love flowers." },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "⬛", options: ["black", "clap"], answer: "black" },
        { emoji: "👏", options: ["clap", "flag"], answer: "clap" },
        { emoji: "🚩", options: ["flag", "black"], answer: "flag" },
        { emoji: "🧱", options: ["block", "clock"], answer: "block" },
        { emoji: "🕐", options: ["clock", "block"], answer: "clock" },
      ],
    },
  },
  {
    id: 15,
    title: "15회차 · 자음 블렌드 cr · dr · tr",
    phonics: [
      { letter: "cr", sound: "크르", word: "crab", emoji: "🦀" },
      { letter: "dr", sound: "드르", word: "drum", emoji: "🥁" },
      { letter: "tr", sound: "트르", word: "truck", emoji: "🚚" },
    ],
    vocab: [
      { word: "tree", meaning: "나무", emoji: "🌳" },
      { word: "dress", meaning: "원피스", emoji: "👗" },
      { word: "cry", meaning: "울다", emoji: "😭" },
      { word: "train", meaning: "기차", emoji: "🚂" },
      { word: "brush", meaning: "빗", emoji: "🪥" },
    ],
    sightWords: [
      { word: "away", meaning: "멀리", emoji: "🏃" },
      { word: "ride", meaning: "타다", emoji: "🚲" },
      { word: "off", meaning: "떨어져", emoji: "⛔" },
    ],
    pattern: {
      sentence: "The crab plays the drum.",
      korean: "그 게는 드럼을 연주해요.",
      emoji: "🦀🥁",
    },
    pattern2: {
      sentence: "The truck and the train go fast.",
      korean: "트럭과 기차가 빠르게 가요.",
      emoji: "🚚🚂",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["crab", "drum", "truck"],
      items: [
        { sentence: "I see a ___.", emoji: "🦀", answer: "crab" },
        { sentence: "I play the ___.", emoji: "🥁", answer: "drum" },
      ],
    },
    speaking: {
      chant: "Cr-cr-crab! Dr-dr-drum! Tr-tr-truck! 🎵",
      dialogue: [
        { speaker: "새별", line: "Don't cry! What happened?" },
        { speaker: "새봄", line: "I lost my brush under the tree." },
        { speaker: "새별", line: "Let's look together." },
        { speaker: "새봄", line: "Thank you, you are so kind." },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🦀", options: ["crab", "drum"], answer: "crab" },
        { emoji: "🥁", options: ["drum", "truck"], answer: "drum" },
        { emoji: "🚚", options: ["truck", "crab"], answer: "truck" },
        { emoji: "🌳", options: ["tree", "dress"], answer: "tree" },
        { emoji: "👗", options: ["dress", "tree"], answer: "dress" },
      ],
    },
  },
  {
    id: 16,
    title: "16회차 · 자음 블렌드 sp · st · sw",
    phonics: [
      { letter: "sp", sound: "스프", word: "spoon", emoji: "🥄" },
      { letter: "st", sound: "스트", word: "star", emoji: "⭐" },
      { letter: "sw", sound: "스워", word: "swim", emoji: "🏊" },
    ],
    vocab: [
      { word: "stop", meaning: "멈추다", emoji: "🛑" },
      { word: "snow", meaning: "눈", emoji: "❄️" },
      { word: "spider", meaning: "거미", emoji: "🕷️" },
      { word: "sweet", meaning: "달콤한", emoji: "🍬" },
      { word: "stair", meaning: "계단", emoji: "🪜" },
    ],
    sightWords: [
      { word: "may", meaning: "~해도 된다", emoji: "🙋" },
      { word: "want", meaning: "원하다", emoji: "🙏" },
      { word: "like", meaning: "좋아하다", emoji: "❤️" },
    ],
    pattern: {
      sentence: "I want to swim under the stars.",
      korean: "나는 별빛 아래에서 수영하고 싶어요.",
      emoji: "🏊⭐",
    },
    pattern2: {
      sentence: "Stop! I see a spider on the spoon.",
      korean: "멈춰! 숟가락 위에 거미가 있어요.",
      emoji: "🕷️🥄",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["spoon", "star", "swim"],
      items: [
        { sentence: "I see a ___.", emoji: "⭐", answer: "star" },
        { sentence: "I can ___.", emoji: "🏊", answer: "swim" },
      ],
    },
    speaking: {
      chant: "Sp-sp-spoon! St-st-star! Sw-sw-swim! 🎵",
      dialogue: [
        { speaker: "새봄", line: "Look! It's snowing!" },
        { speaker: "새별", line: "Wow, can we play outside?" },
        { speaker: "새봄", line: "Yes, but wear your coat first." },
        { speaker: "새별", line: "Okay! Snow is so sweet and pretty." },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🥄", options: ["spoon", "star"], answer: "spoon" },
        { emoji: "⭐", options: ["star", "swim"], answer: "star" },
        { emoji: "🏊", options: ["swim", "spoon"], answer: "swim" },
        { emoji: "🛑", options: ["stop", "snow"], answer: "stop" },
        { emoji: "❄️", options: ["snow", "stop"], answer: "snow" },
      ],
    },
  },
  {
    id: 17,
    title: "17회차 · 이중자음 sh · ch · wh",
    phonics: [
      { letter: "sh", sound: "쉬", word: "ship", emoji: "🚢" },
      { letter: "ch", sound: "취", word: "chair", emoji: "🪑" },
      { letter: "wh", sound: "위", word: "wheel", emoji: "🎡" },
    ],
    vocab: [
      { word: "shell", meaning: "조개껍데기", emoji: "🐚" },
      { word: "cheese", meaning: "치즈", emoji: "🧀" },
      { word: "whale", meaning: "고래", emoji: "🐳" },
      { word: "shoe", meaning: "신발", emoji: "👟" },
      { word: "chick", meaning: "병아리", emoji: "🐥" },
    ],
    sightWords: [
      { word: "what", meaning: "무엇", emoji: "❓" },
      { word: "who", meaning: "누구", emoji: "🙋" },
      { word: "why", meaning: "왜", emoji: "❔" },
    ],
    pattern: {
      sentence: "I see a big whale by the ship.",
      korean: "나는 배 옆에 큰 고래를 봐요.",
      emoji: "🐳🚢",
    },
    pattern2: {
      sentence: "The chick sits on the chair.",
      korean: "병아리가 의자에 앉아요.",
      emoji: "🐥🪑",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["ship", "chair", "wheel"],
      items: [
        { sentence: "I see a ___.", emoji: "🚢", answer: "ship" },
        { sentence: "I sit on the ___.", emoji: "🪑", answer: "chair" },
      ],
    },
    speaking: {
      chant: "Sh-sh-ship! Ch-ch-chair! Wh-wh-wheel! 🎵",
      dialogue: [
        { speaker: "새별", line: "What is your favorite animal?" },
        { speaker: "새봄", line: "I like whales! What about you?" },
        { speaker: "새별", line: "I like chicks, they are so small and cute." },
        { speaker: "새봄", line: "Let's go see them at the farm." },
      ],
      instruction: "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🚢", options: ["ship", "chair"], answer: "ship" },
        { emoji: "🪑", options: ["chair", "wheel"], answer: "chair" },
        { emoji: "🎡", options: ["wheel", "ship"], answer: "wheel" },
        { emoji: "🐚", options: ["shell", "cheese"], answer: "shell" },
        { emoji: "🧀", options: ["cheese", "shell"], answer: "cheese" },
      ],
    },
  },
  {
    id: 18,
    title: "18회차 · 이중자음 th · ck (복습)",
    phonics: [
      { letter: "th", sound: "뜨(무성)", word: "think", emoji: "🤔" },
      { letter: "th", sound: "드(유성)", word: "this", emoji: "👉" },
      { letter: "ck", sound: "크", word: "duck", emoji: "🦆" },
    ],
    vocab: [
      { word: "thumb", meaning: "엄지손가락", emoji: "👍" },
      { word: "bath", meaning: "목욕", emoji: "🛁" },
      { word: "sick", meaning: "아픈", emoji: "🤒" },
      { word: "kick", meaning: "차다", emoji: "⚽" },
      { word: "rock", meaning: "바위", emoji: "🪨" },
    ],
    sightWords: [
      { word: "that", meaning: "그것", emoji: "👉" },
      { word: "then", meaning: "그러면", emoji: "➡️" },
      { word: "soon", meaning: "곧", emoji: "⏳" },
    ],
    pattern: {
      sentence: "I think this duck is sick.",
      korean: "나는 이 오리가 아프다고 생각해요.",
      emoji: "🤔🦆",
    },
    pattern2: {
      sentence: "This duck needs a bath.",
      korean: "이 오리는 목욕이 필요해요.",
      emoji: "🦆🛁",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["think", "this", "duck"],
      items: [
        { sentence: "I ___ it is fun.", emoji: "🤔", answer: "think" },
        { sentence: "I see a ___.", emoji: "🦆", answer: "duck" },
      ],
    },
    speaking: {
      chant: "Th-th-think! Th-th-this! Ck-ck-duck! 🎵",
      dialogue: [
        { speaker: "새봄", line: "Are you sick today?" },
        { speaker: "새별", line: "A little. I need a bath and rest." },
        { speaker: "새봄", line: "Get well soon! Let's play ball later." },
        { speaker: "새별", line: "Okay, thank you!" },
      ],
      instruction:
        "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요. 오늘은 sh·ch·wh·th·ck 이중자음을 모두 복습해요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🤔", options: ["think", "this"], answer: "think" },
        { emoji: "👉", options: ["this", "duck"], answer: "this" },
        { emoji: "🦆", options: ["duck", "think"], answer: "duck" },
        { emoji: "👍", options: ["thumb", "bath"], answer: "thumb" },
        { emoji: "🛁", options: ["bath", "thumb"], answer: "bath" },
      ],
    },
  },
  {
    id: 19,
    title: "19회차 · 매직 e (a_e · i_e) — 묵음 e",
    phonics: [
      { letter: "a_e", sound: "에이 (e는 묵음)", word: "cake", emoji: "🎂" },
      { letter: "a_e", sound: "에이 (e는 묵음)", word: "gate", emoji: "🚪" },
      { letter: "i_e", sound: "아이 (e는 묵음)", word: "bike", emoji: "🚲" },
    ],
    vocab: [
      { word: "cave", meaning: "동굴", emoji: "🕳️" },
      { word: "kite", meaning: "연", emoji: "🪁" },
      { word: "five", meaning: "다섯", emoji: "5️⃣" },
      { word: "nine", meaning: "아홉", emoji: "9️⃣" },
      { word: "smile", meaning: "미소", emoji: "😊" },
    ],
    sightWords: [
      { word: "make", meaning: "만들다", emoji: "🛠️" },
      { word: "ride", meaning: "타다", emoji: "🚲" },
      { word: "name", meaning: "이름", emoji: "🏷️" },
    ],
    pattern: {
      sentence: "I ride my bike to the gate.",
      korean: "나는 자전거를 타고 대문으로 가요.",
      emoji: "🚲🚪",
    },
    pattern2: {
      sentence: "Nine kids make a cake and smile.",
      korean: "아홉 명의 아이들이 케이크를 만들고 웃어요.",
      emoji: "🎂😊",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["cake", "gate", "bike"],
      items: [
        { sentence: "I see a ___.", emoji: "🎂", answer: "cake" },
        { sentence: "I ride my ___.", emoji: "🚲", answer: "bike" },
      ],
    },
    speaking: {
      chant: "Cake, cake! e는 소리 나지 않고 a가 '에이'! Gate, gate! Bike, bike, i가 '아이'! 🎵",
      dialogue: [
        { speaker: "새별", line: "Let's fly a kite today!" },
        { speaker: "새봄", line: "Great idea! It's a nice day." },
        { speaker: "새별", line: "I am so happy, look at my smile!" },
        { speaker: "새봄", line: "Me too! Let's go." },
      ],
      instruction:
        "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요. 단어 끝에 오는 e는 소리가 나지 않는 " +
        "'묵음'이에요! 대신 앞의 모음이 알파벳 이름 그대로 소리 나요 (a는 '에이', i는 '아이'). cat과 cake을 비교해서 읽어보아요.",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🎂", options: ["cake", "gate"], answer: "cake" },
        { emoji: "🚪", options: ["gate", "bike"], answer: "gate" },
        { emoji: "🚲", options: ["bike", "cake"], answer: "bike" },
        { emoji: "🕳️", options: ["cave", "kite"], answer: "cave" },
        { emoji: "🪁", options: ["kite", "cave"], answer: "kite" },
      ],
    },
  },
  {
    id: 20,
    title: "20회차 · 매직 e (o_e · u_e) + 파닉스 총복습 🎓",
    phonics: [
      { letter: "o_e", sound: "오우 (e는 묵음)", word: "home", emoji: "🏠" },
      { letter: "o_e", sound: "오우 (e는 묵음)", word: "bone", emoji: "🦴" },
      { letter: "u_e", sound: "유 (e는 묵음)", word: "cute", emoji: "🥰" },
    ],
    vocab: [
      { word: "rose", meaning: "장미", emoji: "🌹" },
      { word: "nose", meaning: "코", emoji: "👃" },
      { word: "tube", meaning: "튜브", emoji: "🧴" },
      { word: "cube", meaning: "정육면체", emoji: "🎲" },
      { word: "stone", meaning: "돌", emoji: "🪨" },
    ],
    sightWords: [
      { word: "home", meaning: "집", emoji: "🏠" },
      { word: "over", meaning: "~위로", emoji: "🔝" },
      { word: "today", meaning: "오늘", emoji: "📅" },
    ],
    pattern: {
      sentence: "My dog has a bone at home.",
      korean: "우리 강아지는 집에서 뼈다귀를 가지고 있어요.",
      emoji: "🦴🏠",
    },
    pattern2: {
      sentence: "The cute dog smells the rose with its nose.",
      korean: "그 귀여운 강아지는 코로 장미 냄새를 맡아요.",
      emoji: "🥰🌹",
    },
    fillBlank: {
      instruction: "단어은행에서 알맞은 단어를 골라 문장을 완성하세요.",
      wordBank: ["home", "bone", "cute"],
      items: [
        { sentence: "I go ___.", emoji: "🏠", answer: "home" },
        { sentence: "The dog has a ___.", emoji: "🦴", answer: "bone" },
      ],
    },
    speaking: {
      chant: "Home, home, o가 '오우'! Bone, bone! Cute, cute, u가 '유'! e는 여전히 묵음! 🎵",
      dialogue: [
        { speaker: "새봄", line: "Smell this rose! It's lovely." },
        { speaker: "새별", line: "Wow, it smells so good!" },
        { speaker: "새봄", line: "We did it! We finished all our phonics." },
        { speaker: "새별", line: "Yay! I am so proud of us!" },
      ],
      instruction:
        "새봄이와 새별이가 되어 실제로 대화하듯 역할을 나누어 말해보아요. 오늘로 단모음-블렌드-이중자음-매직 e까지 " +
        "모두 배웠어요! 지금까지 배운 단어를 처음부터 끝까지 다 함께 읽어보며 파닉스를 완성해요. 🎉",
    },
    matching: {
      instruction: "그림을 보고 알맞은 단어에 동그라미 하세요.",
      items: [
        { emoji: "🏠", options: ["home", "bone"], answer: "home" },
        { emoji: "🦴", options: ["bone", "cute"], answer: "bone" },
        { emoji: "🥰", options: ["cute", "home"], answer: "cute" },
        { emoji: "🌹", options: ["rose", "nose"], answer: "rose" },
        { emoji: "👃", options: ["nose", "rose"], answer: "nose" },
      ],
    },
  },
];
