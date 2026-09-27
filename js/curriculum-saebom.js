/* 새봄이 커리큘럼 (초등 2학년, 파닉스 완료 · 읽기 가능)
   회차마다: 단어(10개) / 문법(be동사 인칭 변화 반복 드릴) / 쓰기(문장완성+단어로 문장만들기+자유작문) / 회화(대화문+롤플레이)
   2일에 1회차 진행 기준, 총 8회차(약 16일) */
const CURRICULUM_SAEBOM = [
  {
    id: 1,
    title: "1회차 · I am, You are",
    theme: "가족과 소개",
    vocab: [
      { word: "family", meaning: "가족", emoji: "👪" },
      { word: "mom", meaning: "엄마", emoji: "👩" },
      { word: "dad", meaning: "아빠", emoji: "👨" },
      { word: "sister", meaning: "언니(여동생)", emoji: "👧" },
      { word: "brother", meaning: "오빠(남동생)", emoji: "👦" },
      { word: "baby", meaning: "아기", emoji: "👶" },
      { word: "happy", meaning: "행복한", emoji: "😊" },
      { word: "friend", meaning: "친구", emoji: "🤝" },
      { word: "love", meaning: "사랑하다", emoji: "❤️" },
      { word: "hello", meaning: "안녕", emoji: "👋" },
    ],
    grammar: {
      topic: "Be동사 현재형 ① — I am / You are",
      table: [
        ["I", "am"],
        ["You", "are"],
      ],
      examples: ["I am Saebom.", "You are my friend.", "I am happy."],
      drill: ["I ___ a student.", "You ___ kind.", "I ___ seven years old."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "You ___ my sister. (are)", answer: "You are my sister." },
        { prompt: "I ___ a good friend. (am)", answer: "I am a good friend." },
        { prompt: "You ___ happy today. (are)", answer: "You are happy today." },
      ],
      wordSentences: ["family", "love", "hello"],
      freeWrite: {
        example: "I am happy.",
        prompt: "위 문장을 따라 쓰고, 나만의 문장을 한 개 더 만들어 보세요. (I am ___.)",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Hello! I am Saebom." },
        { speaker: "새별", line: "Hi! I am Saebyul." },
        { speaker: "새봄", line: "Nice to meet you!" },
        { speaker: "새별", line: "Nice to meet you, too!" },
      ],
      roleplay: "엄마(아빠)와 역할을 바꾸어 가며 대화문을 소리 내어 읽어보세요.",
    },
  },
  {
    id: 2,
    title: "2회차 · He/She/It is, We/They are",
    theme: "학교 물건",
    vocab: [
      { word: "book", meaning: "책", emoji: "📕" },
      { word: "pencil", meaning: "연필", emoji: "✏️" },
      { word: "bag", meaning: "가방", emoji: "🎒" },
      { word: "chair", meaning: "의자", emoji: "🪑" },
      { word: "teacher", meaning: "선생님", emoji: "🧑‍🏫" },
      { word: "classroom", meaning: "교실", emoji: "🏫" },
      { word: "ruler", meaning: "자", emoji: "📏" },
      { word: "scissors", meaning: "가위", emoji: "✂️" },
      { word: "student", meaning: "학생", emoji: "🧑‍🎓" },
      { word: "clock", meaning: "시계", emoji: "🕐" },
    ],
    grammar: {
      topic: "Be동사 현재형 ② — He/She/It is, We/They are",
      table: [
        ["He / She / It", "is"],
        ["We / They", "are"],
      ],
      examples: ["He is my friend.", "It is a book.", "They are pencils."],
      drill: ["She ___ a teacher.", "It ___ my bag.", "We ___ classmates."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "He ___ my classmate. (is)", answer: "He is my classmate." },
        { prompt: "The ruler ___ on the desk. (is)", answer: "The ruler is on the desk." },
        { prompt: "They ___ good students. (are)", answer: "They are good students." },
      ],
      wordSentences: ["teacher", "classroom", "clock"],
      freeWrite: {
        example: "It is a book.",
        prompt: "위 문장을 따라 쓰고, 교실 물건으로 나만의 문장을 만들어 보세요. (It is a/an ___.)",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "This is my bag." },
        { speaker: "새별", line: "Is it new?" },
        { speaker: "새봄", line: "Yes, it is!" },
        { speaker: "새별", line: "It is so pretty." },
      ],
      roleplay: "학용품을 가리키며 역할을 바꾸어 대화문을 읽어보세요.",
    },
  },
  {
    id: 3,
    title: "3회차 · 부정문 (am not / isn't / aren't)",
    theme: "기분과 감정",
    vocab: [
      { word: "sad", meaning: "슬픈", emoji: "😢" },
      { word: "tired", meaning: "피곤한", emoji: "😴" },
      { word: "angry", meaning: "화난", emoji: "😠" },
      { word: "hungry", meaning: "배고픈", emoji: "🍽️" },
      { word: "excited", meaning: "신난", emoji: "🤩" },
      { word: "okay", meaning: "괜찮은", emoji: "🙂" },
      { word: "scared", meaning: "무서운", emoji: "😨" },
      { word: "surprised", meaning: "놀란", emoji: "😲" },
      { word: "bored", meaning: "지루한", emoji: "🥱" },
      { word: "calm", meaning: "차분한", emoji: "😌" },
    ],
    grammar: {
      topic: "Be동사 부정문 — am not / isn't / aren't",
      table: [
        ["I", "am not"],
        ["He/She/It", "isn't"],
        ["You/We/They", "aren't"],
      ],
      examples: ["I am not sad.", "She isn't tired.", "We aren't hungry."],
      drill: ["I ___ (am not) angry.", "He ___ (isn't) okay.", "They ___ (aren't) excited."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ scared. (am not)", answer: "I am not scared." },
        { prompt: "She ___ bored. (isn't)", answer: "She isn't bored." },
        { prompt: "We ___ surprised. (aren't)", answer: "We aren't surprised." },
      ],
      wordSentences: ["calm", "tired", "hungry"],
      freeWrite: {
        example: "I am not sad. I am happy.",
        prompt: "오늘 기분을 부정문과 긍정문으로 각각 한 문장씩 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Are you tired?" },
        { speaker: "새봄", line: "No, I am not tired. I am excited!" },
        { speaker: "새별", line: "Me, too!" },
      ],
      roleplay: "오늘 실제 기분으로 바꿔서 대화문을 다시 말해보세요.",
    },
  },
  {
    id: 4,
    title: "4회차 · 의문문 (Am I~? Are you~? Is he~?)",
    theme: "동물",
    vocab: [
      { word: "cat", meaning: "고양이", emoji: "🐱" },
      { word: "dog", meaning: "강아지", emoji: "🐶" },
      { word: "rabbit", meaning: "토끼", emoji: "🐰" },
      { word: "bird", meaning: "새", emoji: "🐦" },
      { word: "cute", meaning: "귀여운", emoji: "🥰" },
      { word: "big", meaning: "큰", emoji: "🐘" },
      { word: "lion", meaning: "사자", emoji: "🦁" },
      { word: "elephant", meaning: "코끼리", emoji: "🐘" },
      { word: "fish", meaning: "물고기", emoji: "🐟" },
      { word: "small", meaning: "작은", emoji: "🤏" },
    ],
    grammar: {
      topic: "Be동사 의문문 — Am I~? / Are you~? / Is he~?",
      table: [
        ["Am I ~?", "Yes, I am. / No, I'm not."],
        ["Are you ~?", "Yes, I am. / No, I'm not."],
        ["Is he/she/it ~?", "Yes, he is. / No, he isn't."],
      ],
      examples: ["Is it a cat?", "Are you okay?", "Am I right?"],
      drill: ["___ it a rabbit? (Is)", "___ you happy? (Are)", "___ the dog big? (Is)"],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ it a lion? (Is)", answer: "Is it a lion?" },
        { prompt: "___ the fish small? (Is)", answer: "Is the fish small?" },
        { prompt: "___ you scared of dogs? (Are)", answer: "Are you scared of dogs?" },
      ],
      wordSentences: ["elephant", "cute", "big"],
      freeWrite: {
        example: "Is it a cat? Yes, it is.",
        prompt: "좋아하는 동물로 질문 문장과 대답 문장을 각각 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Look! Is it a rabbit?" },
        { speaker: "새별", line: "Yes, it is! It is so cute." },
        { speaker: "새봄", line: "Is it big?" },
        { speaker: "새별", line: "No, it isn't. It is small." },
      ],
      roleplay: "그림책이나 인형을 보며 실제로 질문하고 답해보세요.",
    },
  },
  {
    id: 5,
    title: "5회차 · I was, You were",
    theme: "어제 있었던 일",
    vocab: [
      { word: "yesterday", meaning: "어제", emoji: "📅" },
      { word: "park", meaning: "공원", emoji: "🏞️" },
      { word: "home", meaning: "집", emoji: "🏠" },
      { word: "busy", meaning: "바쁜", emoji: "🏃" },
      { word: "sick", meaning: "아픈", emoji: "🤒" },
      { word: "fun", meaning: "재미있는", emoji: "🎉" },
      { word: "today", meaning: "오늘", emoji: "📆" },
      { word: "late", meaning: "늦은", emoji: "⏰" },
      { word: "early", meaning: "이른", emoji: "🌅" },
      { word: "alone", meaning: "혼자", emoji: "🧍" },
    ],
    grammar: {
      topic: "Be동사 과거형 ① — I was / You were",
      table: [
        ["I", "was"],
        ["You", "were"],
      ],
      examples: ["I was at the park.", "You were busy yesterday.", "I was happy."],
      drill: ["I ___ at home yesterday.", "You ___ sick last week.", "I ___ so tired."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ late today. (was)", answer: "I was late today." },
        { prompt: "You ___ early yesterday. (were)", answer: "You were early yesterday." },
        { prompt: "I ___ alone at home. (was)", answer: "I was alone at home." },
      ],
      wordSentences: ["busy", "fun", "park"],
      freeWrite: {
        example: "I was at the park yesterday.",
        prompt: "어제 어디에 있었는지 was를 사용해 한 문장을 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Where were you yesterday?" },
        { speaker: "새봄", line: "I was at the park. It was fun!" },
        { speaker: "새별", line: "Were you with mom?" },
        { speaker: "새봄", line: "Yes, I was." },
      ],
      roleplay: "어제 진짜 있었던 곳으로 바꿔서 다시 말해보세요.",
    },
  },
  {
    id: 6,
    title: "6회차 · He/She/It was, We/They were",
    theme: "날씨",
    vocab: [
      { word: "sunny", meaning: "화창한", emoji: "☀️" },
      { word: "rainy", meaning: "비 오는", emoji: "🌧️" },
      { word: "cold", meaning: "추운", emoji: "❄️" },
      { word: "hot", meaning: "더운", emoji: "🥵" },
      { word: "cloudy", meaning: "흐린", emoji: "☁️" },
      { word: "windy", meaning: "바람 부는", emoji: "💨" },
      { word: "snowy", meaning: "눈 오는", emoji: "🌨️" },
      { word: "warm", meaning: "따뜻한", emoji: "🌤️" },
      { word: "foggy", meaning: "안개 낀", emoji: "🌫️" },
      { word: "storm", meaning: "폭풍", emoji: "⛈️" },
    ],
    grammar: {
      topic: "Be동사 과거형 ② — He/She/It was, We/They were",
      table: [
        ["He / She / It", "was"],
        ["We / They", "were"],
      ],
      examples: ["It was sunny.", "We were at school.", "They were happy."],
      drill: ["It ___ cold yesterday.", "We ___ at the park.", "They ___ tired."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "It ___ snowy yesterday. (was)", answer: "It was snowy yesterday." },
        { prompt: "We ___ warm inside. (were)", answer: "We were warm inside." },
        { prompt: "They ___ at school. (were)", answer: "They were at school." },
      ],
      wordSentences: ["cloudy", "windy", "hot"],
      freeWrite: {
        example: "It was sunny yesterday.",
        prompt: "어제 날씨를 was를 사용해서 한 문장으로 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "How was the weather yesterday?" },
        { speaker: "새별", line: "It was rainy. It was cold, too." },
        { speaker: "새봄", line: "Were you cold?" },
        { speaker: "새별", line: "Yes, I was!" },
      ],
      roleplay: "실제 어제 날씨로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 7,
    title: "7회차 · 과거 부정문 (wasn't / weren't)",
    theme: "음식",
    vocab: [
      { word: "pizza", meaning: "피자", emoji: "🍕" },
      { word: "rice", meaning: "밥", emoji: "🍚" },
      { word: "delicious", meaning: "맛있는", emoji: "😋" },
      { word: "sweet", meaning: "달콤한", emoji: "🍬" },
      { word: "full", meaning: "배부른", emoji: "🙂" },
      { word: "hungry", meaning: "배고픈", emoji: "😋" },
      { word: "soup", meaning: "수프", emoji: "🍲" },
      { word: "bread", meaning: "빵", emoji: "🍞" },
      { word: "spicy", meaning: "매운", emoji: "🌶️" },
      { word: "salty", meaning: "짠", emoji: "🧂" },
    ],
    grammar: {
      topic: "Be동사 과거 부정문 — wasn't / weren't",
      table: [
        ["I / He / She / It", "wasn't"],
        ["You / We / They", "weren't"],
      ],
      examples: ["It wasn't sweet.", "I wasn't hungry.", "They weren't full."],
      drill: ["It ___ (wasn't) spicy.", "We ___ (weren't) late.", "I ___ (wasn't) sad."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "The soup ___ salty. (wasn't)", answer: "The soup wasn't salty." },
        { prompt: "I ___ full. (wasn't)", answer: "I wasn't full." },
        { prompt: "We ___ hungry. (weren't)", answer: "We weren't hungry." },
      ],
      wordSentences: ["bread", "delicious", "rice"],
      freeWrite: {
        example: "The pizza wasn't spicy. It was delicious.",
        prompt: "어제 먹은 음식에 대해 부정문 한 문장을 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Was the pizza good?" },
        { speaker: "새봄", line: "Yes! It was delicious. It wasn't spicy." },
        { speaker: "새별", line: "I want some, too!" },
      ],
      roleplay: "좋아하는 음식으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 8,
    title: "8회차 · 종합 복습 + like/have 살짝 맛보기",
    theme: "취미",
    vocab: [
      { word: "like", meaning: "좋아하다", emoji: "❤️" },
      { word: "have", meaning: "가지고 있다", emoji: "🙌" },
      { word: "hobby", meaning: "취미", emoji: "🎨" },
      { word: "swim", meaning: "수영하다", emoji: "🏊" },
      { word: "draw", meaning: "그리다", emoji: "🖍️" },
      { word: "read", meaning: "읽다", emoji: "📖" },
      { word: "sing", meaning: "노래하다", emoji: "🎤" },
      { word: "dance", meaning: "춤추다", emoji: "💃" },
      { word: "play", meaning: "놀다", emoji: "🎮" },
      { word: "run", meaning: "달리다", emoji: "🏃" },
    ],
    grammar: {
      topic: "종합 복습 + 일반동사 맛보기 — I like / I have",
      table: [
        ["I", "am / was / like / have"],
        ["You", "are / were / like / have"],
        ["He/She/It", "is / was / likes / has"],
      ],
      examples: ["I like drawing.", "I have a book.", "She likes swimming."],
      drill: ["I ___ (like) reading.", "She ___ (likes) drawing.", "I ___ (have) a pencil."],
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ singing. (like)", answer: "I like singing." },
        { prompt: "She ___ dancing. (likes)", answer: "She likes dancing." },
        { prompt: "I ___ a new book. (have)", answer: "I have a new book." },
      ],
      wordSentences: ["hobby", "draw", "read"],
      freeWrite: {
        example: "I like drawing.",
        prompt: "내가 좋아하는 것을 like를 사용해서 한 문장 써 보세요. (I like ___.)",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "What is your hobby?" },
        { speaker: "새별", line: "I like drawing. What about you?" },
        { speaker: "새봄", line: "I like reading books." },
        { speaker: "새별", line: "That's nice!" },
      ],
      roleplay: "진짜 좋아하는 취미로 바꿔서 대화를 다시 해보세요.",
    },
  },
];
