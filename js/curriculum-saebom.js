/* 새봄이 커리큘럼 (초등 2학년, 파닉스 완료 · 읽기 가능)
   회차마다: 단어 / 문법(설명+표+예문+빈칸연습+객관식/어순배열·문장전환) /
   쓰기(문장완성+단어로 문장만들기+자유작문) / 회화(대화문+롤플레이)
   5개 학습 회차마다 Review Test 1회 삽입 (총 35개 학습 회차 + 7개 Review Test = 42회차)
   2일에 1회차 진행 기준, 총 42회차(약 84일)로 초등 기초 문법 한 사이클(1~36회차) +
   전치사·어순·빈도부사·명사/관사 심화(37~42회차)까지 완주 + 정기 복습 */
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
      explain: [
        "be동사는 우리말의 '~이다, ~하다'에 해당하는 동사로, 상태나 신분을 나타낼 때 써요.",
        "주어가 I(나)이면 am, You(너)이면 are를 사용해요. 다른 동사와 달리 주어에 따라 모양이 달라지는 것이 be동사의 특징이에요.",
        "'I am'은 짧게 줄여서 I'm 이라고도 써요.",
      ],
      tip: "❗주의: I are (X) → I am (O) / You am (X) → You are (O)",
      examples: [
        { en: "I am Saebom.", ko: "나는 새봄이야." },
        { en: "You are my friend.", ko: "너는 내 친구야." },
        { en: "I am happy.", ko: "나는 행복해." },
      ],
      drill: ["I ___ a student.", "You ___ kind.", "I ___ seven years old."],
      practice: {
        multipleChoice: [
          { q: "I ___ happy.", options: ["is", "am", "are", "be"], answerIndex: 1 },
          { q: "You ___ my friend.", options: ["am", "is", "are", "be"], answerIndex: 2 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(am / I / Saebom)", answer: "I am Saebom." },
          { prompt: "(are / friend / you / my)", answer: "You are my friend." },
        ],
      },
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
      explain: [
        "주어가 한 사람/한 개(He, She, It)일 때는 is를 써요.",
        "주어가 여러 명/여러 개(We, They)이거나 You일 때는 are를 써요.",
        "사물이나 동물도 It으로 받아서 is를 사용할 수 있어요. (It is a book.)",
      ],
      tip: "❗주의: He are (X) → He is (O) / They is (X) → They are (O)",
      examples: [
        { en: "He is my friend.", ko: "그는 내 친구야." },
        { en: "It is a book.", ko: "이것은 책이야." },
        { en: "They are pencils.", ko: "그것들은 연필이야." },
      ],
      drill: ["She ___ a teacher.", "It ___ my bag.", "We ___ classmates."],
      practice: {
        multipleChoice: [
          { q: "He ___ my teacher.", options: ["am", "is", "are", "be"], answerIndex: 1 },
          { q: "They ___ pencils.", options: ["is", "am", "are", "be"], answerIndex: 2 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(is / book / a / it)", answer: "It is a book." },
          { prompt: "(are / students / good / they)", answer: "They are good students." },
        ],
      },
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
      explain: [
        "be동사 부정문은 be동사 뒤에 not만 붙이면 돼요. 정말 간단하죠!",
        "isn't는 is not을, aren't는 are not을 줄인 말이에요. (am not은 줄임말이 따로 없어요)",
        "부정문은 '~가 아니다, ~하지 않다'라는 뜻이 돼요.",
      ],
      tip: "❗주의: amn't 라는 말은 없어요! am not은 그대로 써요.",
      examples: [
        { en: "I am not sad.", ko: "나는 슬프지 않아." },
        { en: "She isn't tired.", ko: "그녀는 피곤하지 않아." },
        { en: "We aren't hungry.", ko: "우리는 배고프지 않아." },
      ],
      drill: ["I ___ (am not) angry.", "He ___ (isn't) okay.", "They ___ (aren't) excited."],
      practice: {
        multipleChoice: [
          { q: "I ___ sad. (부정문)", options: ["am not", "isn't", "aren't", "not am"], answerIndex: 0 },
          { q: "She ___ tired. (부정문)", options: ["am not", "isn't", "aren't", "don't"], answerIndex: 1 },
        ],
        secondType: "문장 전환 — 긍정문을 부정문으로 바꾸세요",
        secondItems: [
          { prompt: "I am angry.", answer: "I am not angry." },
          { prompt: "We are hungry.", answer: "We aren't hungry." },
        ],
      },
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
      explain: [
        "be동사 의문문은 주어와 be동사의 순서를 바꾸고 물음표(?)를 붙이면 돼요.",
        "예: You are happy. → Are you happy?",
        "대답은 Yes/No로 먼저 말하고, 주어+be동사를 다시 한번 써줘요. (Yes, I am. / No, I'm not.)",
      ],
      tip: "❗주의: Is you~? (X) → Are you~? (O) — you는 항상 are와 짝이에요.",
      examples: [
        { en: "Is it a cat?", ko: "이것은 고양이야?" },
        { en: "Are you okay?", ko: "너 괜찮아?" },
        { en: "Am I right?", ko: "내가 맞아?" },
      ],
      drill: ["___ it a rabbit? (Is)", "___ you happy? (Are)", "___ the dog big? (Is)"],
      practice: {
        multipleChoice: [
          { q: "___ you okay?", options: ["Am", "Is", "Are", "Be"], answerIndex: 2 },
          { q: "___ it a cat?", options: ["Am", "Is", "Are", "Do"], answerIndex: 1 },
        ],
        secondType: "문장 전환 — 평서문을 의문문으로 바꾸세요",
        secondItems: [
          { prompt: "You are happy.", answer: "Are you happy?" },
          { prompt: "It is big.", answer: "Is it big?" },
        ],
      },
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
      explain: [
        "be동사의 과거형은 '~였다, ~에 있었다'라는 뜻이에요.",
        "I(나)는 was, You(너)는 were를 써요. am/are가 과거로 가면 was/were로 바뀌어요.",
        "yesterday(어제), last week(지난주)처럼 과거를 나타내는 말과 함께 자주 써요.",
      ],
      tip: "❗주의: I were (X) → I was (O) / You was (X) → You were (O)",
      examples: [
        { en: "I was at the park.", ko: "나는 공원에 있었어." },
        { en: "You were busy yesterday.", ko: "너는 어제 바빴어." },
        { en: "I was happy.", ko: "나는 행복했어." },
      ],
      drill: ["I ___ at home yesterday.", "You ___ sick last week.", "I ___ so tired."],
      practice: {
        multipleChoice: [
          { q: "I ___ at home yesterday.", options: ["am", "was", "were", "is"], answerIndex: 1 },
          { q: "You ___ busy last week.", options: ["was", "were", "am", "are"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(was / I / late / today)", answer: "I was late today." },
          { prompt: "(were / early / you / yesterday)", answer: "You were early yesterday." },
        ],
      },
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
    type: "review",
    title: "6회차 · Review Test 1 (1~5회차 총정리)",
    covers: "1~5회차",
    recap: [
      ["I am / You are", "현재형 기본"],
      ["He/She/It is, We/They are", "현재형 3인칭·복수"],
      ["am not / isn't / aren't", "현재 부정문"],
      ["Am/Is/Are ~?", "현재 의문문"],
      ["I was / You were", "과거형 기본"],
    ],
    multipleChoice: [
      { q: "I ___ a student.", options: ["is", "am", "are", "be"], answerIndex: 1 },
      { q: "They ___ my friends.", options: ["is", "am", "are", "be"], answerIndex: 2 },
      { q: "He ___ happy.", options: ["am", "is", "are", "be"], answerIndex: 1 },
      { q: "We ___ classmates.", options: ["am", "is", "are", "be"], answerIndex: 2 },
      { q: "I ___ tired. (부정문)", options: ["am not", "isn't", "aren't", "don't"], answerIndex: 0 },
      { q: "She ___ hungry. (부정문)", options: ["am not", "isn't", "aren't", "don't"], answerIndex: 1 },
      { q: "___ you okay?", options: ["Am", "Is", "Are", "Do"], answerIndex: 2 },
      { q: "___ it a cat?", options: ["Am", "Is", "Are", "Do"], answerIndex: 1 },
      { q: "I ___ at home yesterday.", options: ["am", "is", "was", "were"], answerIndex: 2 },
      { q: "You ___ busy last week.", options: ["was", "were", "am", "are"], answerIndex: 1 },
    ],
    transform: [
      { prompt: "You are my friend. (의문문으로)", answer: "Are you my friend?" },
      { prompt: "It is a book. (부정문으로)", answer: "It isn't a book." },
      { prompt: "I am scared. (부정문으로)", answer: "I am not scared." },
      { prompt: "It is a cat. (의문문으로)", answer: "Is it a cat?" },
      { prompt: "You were busy. (의문문으로)", answer: "Were you busy?" },
    ],
    freeWrite: { prompt: "1~5회차에서 배운 문법 중 하나를 사용해서 나만의 문장을 2개 써 보세요." },
  },
  {
    id: 7,
    title: "7회차 · He/She/It was, We/They were",
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
      explain: [
        "He/She/It(한 명, 한 개)은 was를, We/They(여러 명)는 were를 써요.",
        "현재형의 is → was로, are → were로 바뀐다고 기억하면 쉬워요.",
        "날씨, 기분, 장소를 과거로 표현할 때 아주 많이 사용돼요.",
      ],
      tip: "❗주의: It were (X) → It was (O) / We was (X) → We were (O)",
      examples: [
        { en: "It was sunny.", ko: "날씨가 화창했어." },
        { en: "We were at school.", ko: "우리는 학교에 있었어." },
        { en: "They were happy.", ko: "그들은 행복했어." },
      ],
      drill: ["It ___ cold yesterday.", "We ___ at the park.", "They ___ tired."],
      practice: {
        multipleChoice: [
          { q: "It ___ sunny yesterday.", options: ["was", "were", "is", "am"], answerIndex: 0 },
          { q: "They ___ happy.", options: ["was", "were", "is", "am"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(was / cold / it / yesterday)", answer: "It was cold yesterday." },
          { prompt: "(were / we / happy)", answer: "We were happy." },
        ],
      },
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
    id: 8,
    title: "8회차 · 과거 부정문 (wasn't / weren't)",
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
      explain: [
        "과거 부정문도 방법은 같아요. was/were 뒤에 not을 붙이면 돼요.",
        "wasn't는 was not, weren't는 were not의 줄임말이에요.",
        "'~이 아니었다, ~하지 않았다'라는 뜻이 돼요.",
      ],
      tip: "❗주의: 발음이 비슷한 wasn't[워즌트]와 weren't[워런트]를 헷갈리지 않게 큰 소리로 연습해보세요.",
      examples: [
        { en: "It wasn't sweet.", ko: "그것은 달지 않았어." },
        { en: "I wasn't hungry.", ko: "나는 배고프지 않았어." },
        { en: "They weren't full.", ko: "그들은 배부르지 않았어." },
      ],
      drill: ["It ___ (wasn't) spicy.", "We ___ (weren't) late.", "I ___ (wasn't) sad."],
      practice: {
        multipleChoice: [
          { q: "It ___ spicy.", options: ["wasn't", "weren't", "isn't", "didn't"], answerIndex: 0 },
          { q: "We ___ late.", options: ["wasn't", "weren't", "aren't", "don't"], answerIndex: 1 },
        ],
        secondType: "문장 전환 — 긍정문을 부정문으로 바꾸세요",
        secondItems: [
          { prompt: "It was sweet.", answer: "It wasn't sweet." },
          { prompt: "They were full.", answer: "They weren't full." },
        ],
      },
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
    id: 9,
    title: "9회차 · 종합 복습 + like/have 살짝 맛보기",
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
      explain: [
        "지금까지 배운 be동사(am/is/are/was/were)를 표로 총정리 해봐요.",
        "like(좋아하다), have(가지고 있다)는 be동사가 아닌 '일반동사'예요. 일반동사는 다음 회차부터 자세히 배울 거예요.",
        "he/she/it이 주어일 때 일반동사는 likes, has처럼 모양이 살짝 바뀌는 것도 미리 기억해두세요.",
      ],
      tip: "❗be동사와 일반동사는 한 문장에 절대 같이 쓰지 않아요. (I am like drawing. → X)",
      examples: [
        { en: "I like drawing.", ko: "나는 그림 그리기를 좋아해." },
        { en: "I have a book.", ko: "나는 책이 있어." },
        { en: "She likes swimming.", ko: "그녀는 수영을 좋아해." },
      ],
      drill: ["I ___ (like) reading.", "She ___ (likes) drawing.", "I ___ (have) a pencil."],
      practice: {
        multipleChoice: [
          { q: "I ___ drawing.", options: ["am", "like", "likes", "is"], answerIndex: 1 },
          { q: "She ___ a book.", options: ["have", "has", "am", "is"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(like / drawing / I)", answer: "I like drawing." },
          { prompt: "(has / book / a / she)", answer: "She has a book." },
        ],
      },
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
  {
    id: 10,
    title: "10회차 · Be동사 과거 의문문 (Was I~? Were you~?)",
    theme: "지난 주말",
    vocab: [
      { word: "weekend", meaning: "주말", emoji: "🗓️" },
      { word: "movie", meaning: "영화", emoji: "🎬" },
      { word: "trip", meaning: "여행", emoji: "✈️" },
      { word: "party", meaning: "파티", emoji: "🎉" },
      { word: "beach", meaning: "해변", emoji: "🏖️" },
      { word: "camp", meaning: "캠핑", emoji: "⛺" },
      { word: "holiday", meaning: "휴일", emoji: "🎆" },
      { word: "grandparents", meaning: "조부모님", emoji: "👴" },
    ],
    grammar: {
      topic: "Be동사 과거 의문문 — Was I~? / Were you~? / Was he~?",
      table: [
        ["Was I ~?", "Yes, you were. / No, you weren't."],
        ["Were you ~?", "Yes, I was. / No, I wasn't."],
        ["Was he/she/it ~?", "Yes, he was. / No, he wasn't."],
        ["Were we/they ~?", "Yes, we were. / No, we weren't."],
      ],
      explain: [
        "과거 의문문도 현재처럼 주어와 was/were의 순서를 바꾸면 돼요.",
        "예: You were busy. → Were you busy?",
        "대답할 때 was는 was로, were는 were로 그대로 맞춰서 대답해요.",
      ],
      tip: "❗주의: Was you~? (X) → Were you~? (O)",
      examples: [
        { en: "Was it fun?", ko: "재미있었어?" },
        { en: "Were you at the party?", ko: "너는 파티에 있었어?" },
        { en: "Was he there, too?", ko: "그도 거기 있었어?" },
      ],
      drill: ["___ you at the beach? (Were)", "___ it fun? (Was)", "___ they there? (Were)"],
      practice: {
        multipleChoice: [
          { q: "___ you at the party?", options: ["Was", "Were", "Is", "Are"], answerIndex: 1 },
          { q: "___ it fun?", options: ["Was", "Were", "Is", "Did"], answerIndex: 0 },
        ],
        secondType: "문장 전환 — 평서문을 의문문으로 바꾸세요",
        secondItems: [
          { prompt: "You were busy.", answer: "Were you busy?" },
          { prompt: "It was fun.", answer: "Was it fun?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ you at the party? (Were)", answer: "Were you at the party?" },
        { prompt: "___ the trip fun? (Was)", answer: "Was the trip fun?" },
        { prompt: "___ they at the beach? (Were)", answer: "Were they at the beach?" },
      ],
      wordSentences: ["weekend", "movie", "holiday"],
      freeWrite: {
        example: "Was the movie fun? Yes, it was.",
        prompt: "지난 주말에 있었던 일을 과거 의문문으로 질문하고 대답해 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Were you at the party?" },
        { speaker: "새별", line: "Yes, I was! It was so much fun." },
        { speaker: "새봄", line: "Was the cake good?" },
        { speaker: "새별", line: "Yes, it was delicious!" },
      ],
      roleplay: "지난 주말에 실제로 어디에 있었는지 물어보고 대답해 보세요.",
    },
  },
  {
    id: 11,
    title: "11회차 · 일반동사 현재형 ① (I/You/We/They + 동사원형)",
    theme: "매일 하는 일",
    vocab: [
      { word: "wake up", meaning: "일어나다", emoji: "⏰" },
      { word: "eat", meaning: "먹다", emoji: "🍽️" },
      { word: "go", meaning: "가다", emoji: "🚶" },
      { word: "study", meaning: "공부하다", emoji: "📖" },
      { word: "walk", meaning: "걷다", emoji: "🚶‍♀️" },
      { word: "brush", meaning: "닦다", emoji: "🪥" },
      { word: "wash", meaning: "씻다", emoji: "🧼" },
      { word: "sleep", meaning: "자다", emoji: "😴" },
    ],
    grammar: {
      topic: "일반동사 현재형 ① — I/You/We/They + 동사원형",
      table: [["I / You / We / They", "동사원형 그대로 (go, eat, play...)"]],
      explain: [
        "일반동사는 be동사(am/is/are)가 아닌 '움직임이나 동작'을 나타내는 동사예요. (eat, go, play, study 등)",
        "주어가 I, You, We, They일 때는 동사를 원래 모양 그대로 써요. 변화가 없어요!",
        "한 문장에는 반드시 동사가 하나만 필요해요. be동사와 일반동사를 같이 쓰지 않아요.",
      ],
      tip: "❗주의: I eats (X) → I eat (O) — I/You/We/They 뒤에는 동사에 s를 붙이지 않아요.",
      examples: [
        { en: "I eat breakfast.", ko: "나는 아침을 먹어." },
        { en: "You study English.", ko: "너는 영어를 공부해." },
        { en: "We walk to school.", ko: "우리는 학교에 걸어가." },
      ],
      drill: ["I ___ (go) to school.", "You ___ (study) hard.", "We ___ (walk) together."],
      practice: {
        multipleChoice: [
          { q: "I ___ breakfast every day.", options: ["eats", "eat", "am eat", "is eat"], answerIndex: 1 },
          { q: "We ___ to school together.", options: ["walks", "walk", "walking", "is walk"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(eat / I / breakfast)", answer: "I eat breakfast." },
          { prompt: "(study / you / hard)", answer: "You study hard." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (wake up) at seven.", answer: "I wake up at seven." },
        { prompt: "You ___ (eat) breakfast every day.", answer: "You eat breakfast every day." },
        { prompt: "We ___ (walk) to school together.", answer: "We walk to school together." },
      ],
      wordSentences: ["study", "brush", "sleep"],
      freeWrite: {
        example: "I eat breakfast every day.",
        prompt: "매일 하는 일을 일반동사를 사용해서 한 문장 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "What time do you wake up?" },
        { speaker: "새봄", line: "I wake up at seven." },
        { speaker: "새별", line: "I wake up at seven, too!" },
        { speaker: "새봄", line: "We are the same!" },
      ],
      roleplay: "실제 아침 습관으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 12,
    type: "review",
    title: "12회차 · Review Test 2 (7~11회차 총정리)",
    covers: "7~11회차",
    recap: [
      ["He/She/It was, We/They were", "과거형 3인칭·복수"],
      ["wasn't / weren't", "과거 부정문"],
      ["like / have", "일반동사 맛보기"],
      ["Was I~? / Were you~?", "과거 의문문"],
      ["I/You/We/They + 동사원형", "일반동사 현재형①"],
    ],
    multipleChoice: [
      { q: "It ___ sunny.", options: ["was", "were", "is", "am"], answerIndex: 0 },
      { q: "They ___ happy.", options: ["was", "were", "is", "am"], answerIndex: 1 },
      { q: "It ___ spicy. (부정문)", options: ["wasn't", "weren't", "isn't", "didn't"], answerIndex: 0 },
      { q: "We ___ late. (부정문)", options: ["wasn't", "weren't", "aren't", "don't"], answerIndex: 1 },
      { q: "I ___ drawing.", options: ["am", "like", "likes", "is"], answerIndex: 1 },
      { q: "She ___ a book.", options: ["have", "has", "am", "is"], answerIndex: 1 },
      { q: "___ you at the party?", options: ["Was", "Were", "Is", "Are"], answerIndex: 1 },
      { q: "___ it fun?", options: ["Was", "Were", "Is", "Did"], answerIndex: 0 },
      { q: "I ___ breakfast every day.", options: ["eats", "eat", "ate", "eating"], answerIndex: 1 },
      { q: "We ___ to school together.", options: ["walks", "walk", "walked", "walking"], answerIndex: 1 },
    ],
    transform: [
      { prompt: "It was sunny. (부정문으로)", answer: "It wasn't sunny." },
      { prompt: "You were busy. (의문문으로)", answer: "Were you busy?" },
      { prompt: "(eat / I / breakfast) 어순 배열", answer: "I eat breakfast." },
      { prompt: "(study / you / hard) 어순 배열", answer: "You study hard." },
      { prompt: "(walk / we / together) 어순 배열", answer: "We walk together." },
    ],
    freeWrite: { prompt: "7~11회차에서 배운 문법 중 하나를 사용해서 나만의 문장을 2개 써 보세요." },
  },
  {
    id: 13,
    title: "13회차 · 일반동사 현재형 ② (He/She/It + 동사-s)",
    theme: "가족의 하루",
    vocab: [
      { word: "work", meaning: "일하다", emoji: "💼" },
      { word: "cook", meaning: "요리하다", emoji: "🍳" },
      { word: "drive", meaning: "운전하다", emoji: "🚗" },
      { word: "watch", meaning: "보다", emoji: "📺" },
      { word: "clean", meaning: "청소하다", emoji: "🧹" },
      { word: "teach", meaning: "가르치다", emoji: "📚" },
      { word: "fix", meaning: "고치다", emoji: "🔧" },
      { word: "help", meaning: "돕다", emoji: "🤝" },
    ],
    grammar: {
      topic: "일반동사 현재형 ② — He/She/It + 동사-s (3인칭 단수)",
      table: [["He / She / It", "동사 + s (또는 es)"]],
      explain: [
        "주어가 He, She, It(한 명/한 개)일 때는 동사 끝에 s를 붙여요. 이것을 '3인칭 단수'라고 해요.",
        "대부분은 +s (works, cooks), s/x/ch/sh로 끝나면 +es (watches, fixes), 자음+y로 끝나면 y를 i로 바꾸고 +es (study→studies)예요.",
        "have는 특별하게 has로 바뀌어요. (He has a car.)",
      ],
      tip: "❗주의: He work (X) → He works (O) — 3인칭 단수는 절대 s를 빼먹지 않도록 조심하세요.",
      examples: [
        { en: "She cooks dinner.", ko: "그녀는 저녁을 요리해." },
        { en: "He watches TV.", ko: "그는 TV를 봐." },
        { en: "It fixes the problem.", ko: "그것은 문제를 고쳐." },
      ],
      drill: ["She ___ (cook) dinner.", "He ___ (watch) TV.", "My dad ___ (drive) a car."],
      practice: {
        multipleChoice: [
          { q: "She ___ dinner.", options: ["cook", "cooks", "cooking", "is cook"], answerIndex: 1 },
          { q: "He ___ TV every night.", options: ["watch", "watches", "watching", "is watch"], answerIndex: 1 },
        ],
        secondType: "형태 바꾸기 — 주어에 맞게 동사를 바꿔 써 보세요",
        secondItems: [
          { prompt: "cook (주어: She)", answer: "cooks" },
          { prompt: "watch (주어: He)", answer: "watches" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "He ___ (work) at a hospital.", answer: "He works at a hospital." },
        { prompt: "She ___ (teach) math.", answer: "She teaches math." },
        { prompt: "My mom ___ (clean) the house.", answer: "My mom cleans the house." },
      ],
      wordSentences: ["cook", "drive", "help"],
      freeWrite: {
        example: "My dad drives a car.",
        prompt: "가족 한 명이 매일 하는 일을 3인칭 단수로 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "What does your mom do?" },
        { speaker: "새별", line: "She cooks dinner every day." },
        { speaker: "새봄", line: "My dad drives a bus!" },
        { speaker: "새별", line: "Wow, that's cool!" },
      ],
      roleplay: "진짜 가족이 하는 일로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 14,
    title: "14회차 · 일반동사 부정문 (don't / doesn't)",
    theme: "싫어하는 것",
    vocab: [
      { word: "vegetable", meaning: "야채", emoji: "🥦" },
      { word: "spider", meaning: "거미", emoji: "🕷️" },
      { word: "homework", meaning: "숙제", emoji: "📓" },
      { word: "insect", meaning: "벌레", emoji: "🐛" },
      { word: "dark", meaning: "어두운", emoji: "🌑" },
      { word: "ghost", meaning: "유령", emoji: "👻" },
      { word: "noise", meaning: "소음", emoji: "🔊" },
      { word: "snake", meaning: "뱀", emoji: "🐍" },
    ],
    grammar: {
      topic: "일반동사 부정문 — don't / doesn't",
      table: [
        ["I/You/We/They", "don't + 동사원형"],
        ["He/She/It", "doesn't + 동사원형"],
      ],
      explain: [
        "일반동사를 부정문으로 만들 때는 동사 앞에 don't 또는 doesn't를 붙여요.",
        "I/You/We/They는 don't, He/She/It은 doesn't를 사용해요.",
        "doesn't 뒤에서는 동사에 붙였던 s를 다시 빼고 원래 모양으로 써요! (doesn't likes → doesn't like)",
      ],
      tip: "❗주의: He doesn't likes (X) → He doesn't like (O) — doesn't 뒤에는 s를 빼요.",
      examples: [
        { en: "I don't like spiders.", ko: "나는 거미를 안 좋아해." },
        { en: "She doesn't like the dark.", ko: "그녀는 어둠을 안 좋아해." },
        { en: "We don't like noise.", ko: "우리는 시끄러운 소리를 안 좋아해." },
      ],
      drill: ["I ___ (don't) like vegetables.", "He ___ (doesn't) like ghosts.", "They ___ (don't) like insects."],
      practice: {
        multipleChoice: [
          { q: "I ___ like spiders.", options: ["don't", "doesn't", "isn't", "am not"], answerIndex: 0 },
          { q: "She ___ like the dark.", options: ["don't", "doesn't", "isn't", "aren't"], answerIndex: 1 },
        ],
        secondType: "문장 전환 — 긍정문을 부정문으로 바꾸세요",
        secondItems: [
          { prompt: "I like spiders.", answer: "I don't like spiders." },
          { prompt: "She likes ghosts.", answer: "She doesn't like ghosts." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (don't) like spiders.", answer: "I don't like spiders." },
        { prompt: "She ___ (doesn't) like the dark.", answer: "She doesn't like the dark." },
        { prompt: "We ___ (don't) like noise.", answer: "We don't like noise." },
      ],
      wordSentences: ["vegetable", "ghost", "insect"],
      freeWrite: {
        example: "I don't like spiders.",
        prompt: "내가 싫어하는 것을 don't/doesn't를 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Do you like spiders?" },
        { speaker: "새봄", line: "No, I don't like spiders. They're scary!" },
        { speaker: "새별", line: "I don't like them, either." },
        { speaker: "새봄", line: "Me too. Let's stay away!" },
      ],
      roleplay: "각자 싫어하는 것으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 15,
    title: "15회차 · 일반동사 의문문 (Do you~? Does he~?)",
    theme: "취향 물어보기",
    vocab: [
      { word: "breakfast", meaning: "아침식사", emoji: "🍳" },
      { word: "lunch", meaning: "점심", emoji: "🍱" },
      { word: "dinner", meaning: "저녁식사", emoji: "🍽️" },
      { word: "juice", meaning: "주스", emoji: "🧃" },
      { word: "milk", meaning: "우유", emoji: "🥛" },
      { word: "cheese", meaning: "치즈", emoji: "🧀" },
      { word: "snack", meaning: "간식", emoji: "🍪" },
      { word: "dessert", meaning: "디저트", emoji: "🍰" },
    ],
    grammar: {
      topic: "일반동사 의문문 — Do you~? / Does he~?",
      table: [
        ["Do I/you/we/they ~?", "Yes, ~ do. / No, ~ don't."],
        ["Does he/she/it ~?", "Yes, ~ does. / No, ~ doesn't."],
      ],
      explain: [
        "일반동사 의문문은 문장 맨 앞에 Do 또는 Does를 붙이고, 동사는 원래 모양(원형)으로 써요.",
        "I/you/we/they는 Do, he/she/it은 Does를 사용해요.",
        "대답할 때도 do/does를 그대로 사용해서 짧게 대답해요. (Yes, I do. / No, he doesn't.)",
      ],
      tip: "❗주의: Does she likes~? (X) → Does she like~? (O) — Does 뒤에서는 동사에 s를 붙이지 않아요.",
      examples: [
        { en: "Do you like milk?", ko: "너는 우유를 좋아해?" },
        { en: "Does he like cheese?", ko: "그는 치즈를 좋아해?" },
        { en: "Do they eat breakfast?", ko: "그들은 아침을 먹어?" },
      ],
      drill: ["___ you like snacks? (Do)", "___ she like dessert? (Does)", "___ they eat lunch together? (Do)"],
      practice: {
        multipleChoice: [
          { q: "___ you like milk?", options: ["Do", "Does", "Are", "Is"], answerIndex: 0 },
          { q: "___ he like cheese?", options: ["Do", "Does", "Is", "Are"], answerIndex: 1 },
        ],
        secondType: "문장 전환 — 평서문을 의문문으로 바꾸세요",
        secondItems: [
          { prompt: "You like snacks.", answer: "Do you like snacks?" },
          { prompt: "She likes dessert.", answer: "Does she like dessert?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ you like milk? (Do)", answer: "Do you like milk?" },
        { prompt: "___ he like cheese? (Does)", answer: "Does he like cheese?" },
        { prompt: "___ they eat breakfast? (Do)", answer: "Do they eat breakfast?" },
      ],
      wordSentences: ["snack", "dessert", "lunch"],
      freeWrite: {
        example: "Do you like milk? Yes, I do.",
        prompt: "좋아하는 음식을 do/does 의문문으로 묻고 답해 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Do you like snacks?" },
        { speaker: "새별", line: "Yes, I do! I love cookies." },
        { speaker: "새봄", line: "Does mom like cookies, too?" },
        { speaker: "새별", line: "Yes, she does!" },
      ],
      roleplay: "진짜 좋아하는 음식으로 바꿔서 질문하고 답해보세요.",
    },
  },
  {
    id: 16,
    title: "16회차 · 일반동사 과거형 ① (규칙동사 -ed)",
    theme: "어제 한 일",
    vocab: [
      { word: "played", meaning: "놀았다", emoji: "🎮" },
      { word: "walked", meaning: "걸었다", emoji: "🚶" },
      { word: "studied", meaning: "공부했다", emoji: "📖" },
      { word: "cooked", meaning: "요리했다", emoji: "🍳" },
      { word: "watched", meaning: "봤다", emoji: "📺" },
      { word: "cleaned", meaning: "청소했다", emoji: "🧹" },
      { word: "helped", meaning: "도왔다", emoji: "🤝" },
      { word: "wanted", meaning: "원했다", emoji: "⭐" },
    ],
    grammar: {
      topic: "일반동사 과거형 ① — 규칙동사 + ed",
      table: [
        ["대부분 동사", "+ed (played, walked)"],
        ["e로 끝나는 동사", "+d (like→liked)"],
        ["자음+y로 끝나는 동사", "y를 i로 바꾸고 +ed (study→studied)"],
        ["짧은 모음+자음", "자음을 한번 더 쓰고 +ed (stop→stopped)"],
      ],
      explain: [
        "일반동사의 과거형은 대부분 동사 끝에 ed를 붙여서 만들어요. (played, watched, cooked)",
        "동사가 e로 끝나면 d만 붙이고(liked), 자음+y로 끝나면 y를 i로 바꾸고 ed를 붙여요(study→studied).",
        "주어가 무엇이든(I/You/He/She/It/We/They) 과거형은 모양이 똑같아요! s를 붙이지 않아요.",
      ],
      tip: "❗주의: He studyed (X) → He studied (O) / He plaied (X) → He played (O)",
      examples: [
        { en: "I played soccer yesterday.", ko: "나는 어제 축구를 했어." },
        { en: "She studied English.", ko: "그녀는 영어를 공부했어." },
        { en: "We watched a movie.", ko: "우리는 영화를 봤어." },
      ],
      drill: ["I ___ (play) soccer yesterday.", "She ___ (study) all night.", "We ___ (watch) a movie."],
      practice: {
        multipleChoice: [
          { q: "I ___ soccer yesterday.", options: ["play", "plays", "played", "playing"], answerIndex: 2 },
          { q: "She ___ all night.", options: ["study", "studies", "studied", "studying"], answerIndex: 2 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(played / I / soccer / yesterday)", answer: "I played soccer yesterday." },
          { prompt: "(watched / movie / we / a)", answer: "We watched a movie." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (clean) my room.", answer: "I cleaned my room." },
        { prompt: "She ___ (cook) dinner yesterday.", answer: "She cooked dinner yesterday." },
        { prompt: "We ___ (help) mom.", answer: "We helped mom." },
      ],
      wordSentences: ["played", "watched", "wanted"],
      freeWrite: {
        example: "I played soccer yesterday.",
        prompt: "어제 한 일을 과거형 규칙동사로 한 문장 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "What did you do yesterday?" },
        { speaker: "새봄", line: "I played soccer with my friends." },
        { speaker: "새별", line: "I watched a movie with mom." },
        { speaker: "새봄", line: "That sounds fun!" },
      ],
      roleplay: "어제 진짜 한 일로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 17,
    title: "17회차 · 일반동사 과거형 ② (불규칙동사)",
    theme: "특별했던 하루",
    vocab: [
      { word: "went", meaning: "갔다 (go)", emoji: "🚶" },
      { word: "ate", meaning: "먹었다 (eat)", emoji: "🍽️" },
      { word: "saw", meaning: "봤다 (see)", emoji: "👀" },
      { word: "had", meaning: "가졌다 (have)", emoji: "🙌" },
      { word: "made", meaning: "만들었다 (make)", emoji: "🛠️" },
      { word: "came", meaning: "왔다 (come)", emoji: "🏃" },
      { word: "got", meaning: "받았다 (get)", emoji: "🎁" },
      { word: "did", meaning: "했다 (do)", emoji: "✅" },
    ],
    grammar: {
      topic: "일반동사 과거형 ② — 불규칙동사",
      table: [
        ["go → went", "가다 → 갔다"],
        ["eat → ate", "먹다 → 먹었다"],
        ["see → saw", "보다 → 봤다"],
        ["have → had", "가지다 → 가졌다"],
        ["make → made", "만들다 → 만들었다"],
        ["come → came", "오다 → 왔다"],
        ["get → got", "받다 → 받았다"],
        ["do → did", "하다 → 했다"],
      ],
      explain: [
        "모든 동사가 ed를 붙여서 과거형이 되는 건 아니에요. 자주 쓰는 동사들은 모양이 완전히 바뀌는 '불규칙동사'예요.",
        "불규칙동사는 규칙이 없어서 하나씩 외워야 해요. 대신 정말 자주 쓰이니 이번 기회에 확실히 익혀봐요.",
        "불규칙동사도 주어가 무엇이든 모양은 똑같아요. (He go → X, He went → O)",
      ],
      tip: "❗Tip: 표를 소리 내어 여러 번 읽으면서 리듬처럼 외워보세요. go-went, eat-ate, see-saw!",
      examples: [
        { en: "I went to the zoo.", ko: "나는 동물원에 갔어." },
        { en: "She ate pizza.", ko: "그녀는 피자를 먹었어." },
        { en: "We had a great time.", ko: "우리는 즐거운 시간을 보냈어." },
      ],
      drill: ["I ___ (go) to the park yesterday.", "She ___ (eat) ice cream.", "We ___ (have) fun."],
      practice: {
        multipleChoice: [
          { q: "I ___ to the zoo.", options: ["go", "goes", "went", "going"], answerIndex: 2 },
          { q: "She ___ pizza.", options: ["eat", "eats", "ate", "eating"], answerIndex: 2 },
        ],
        secondType: "형태 바꾸기 — 현재형을 과거형으로 바꿔 써 보세요",
        secondItems: [
          { prompt: "go", answer: "went" },
          { prompt: "eat", answer: "ate" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (see) a movie.", answer: "I saw a movie." },
        { prompt: "She ___ (make) a cake.", answer: "She made a cake." },
        { prompt: "They ___ (get) a present.", answer: "They got a present." },
      ],
      wordSentences: ["went", "ate", "came"],
      freeWrite: {
        example: "I went to the zoo yesterday.",
        prompt: "특별했던 하루에 대해 불규칙 과거동사로 한 문장 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "I went to the zoo yesterday!" },
        { speaker: "새별", line: "Wow! What did you see?" },
        { speaker: "새봄", line: "I saw a lion and an elephant." },
        { speaker: "새별", line: "That sounds amazing!" },
      ],
      roleplay: "실제로 다녀온 곳으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 18,
    type: "review",
    title: "18회차 · Review Test 3 (13~17회차 총정리)",
    covers: "13~17회차",
    recap: [
      ["He/She/It + 동사-s", "일반동사 현재형②"],
      ["don't / doesn't", "일반동사 부정문"],
      ["Do/Does ~?", "일반동사 의문문"],
      ["동사 + ed", "일반동사 과거형(규칙)"],
      ["go-went 등", "일반동사 과거형(불규칙)"],
    ],
    multipleChoice: [
      { q: "She ___ dinner.", options: ["cook", "cooks", "cooking", "is cook"], answerIndex: 1 },
      { q: "He ___ TV.", options: ["watch", "watches", "watching", "is watch"], answerIndex: 1 },
      { q: "I ___ like spiders.", options: ["don't", "doesn't", "isn't", "am not"], answerIndex: 0 },
      { q: "She ___ like the dark.", options: ["don't", "doesn't", "isn't", "aren't"], answerIndex: 1 },
      { q: "___ you like milk?", options: ["Do", "Does", "Are", "Is"], answerIndex: 0 },
      { q: "___ he like cheese?", options: ["Do", "Does", "Is", "Are"], answerIndex: 1 },
      { q: "I ___ soccer yesterday.", options: ["play", "plays", "played", "playing"], answerIndex: 2 },
      { q: "She ___ all night.", options: ["study", "studies", "studied", "studying"], answerIndex: 2 },
      { q: "I ___ to the zoo.", options: ["go", "goes", "went", "going"], answerIndex: 2 },
      { q: "She ___ pizza.", options: ["eat", "eats", "ate", "eating"], answerIndex: 2 },
    ],
    transform: [
      { prompt: "cook (주어: She) 형태 바꾸기", answer: "cooks" },
      { prompt: "I like spiders. (부정문으로)", answer: "I don't like spiders." },
      { prompt: "You like snacks. (의문문으로)", answer: "Do you like snacks?" },
      { prompt: "(play / I / soccer / yesterday) 어순 배열", answer: "I played soccer yesterday." },
      { prompt: "go 형태 바꾸기 (과거형)", answer: "went" },
    ],
    freeWrite: { prompt: "13~17회차에서 배운 문법 중 하나를 사용해서 나만의 문장을 2개 써 보세요." },
  },
  {
    id: 19,
    title: "19회차 · 일반동사 과거 부정문 (didn't)",
    theme: "안 했던 일",
    vocab: [
      { word: "forget", meaning: "잊다", emoji: "😅" },
      { word: "lose", meaning: "잃어버리다", emoji: "😵" },
      { word: "break", meaning: "깨다/부수다", emoji: "💥" },
      { word: "cry", meaning: "울다", emoji: "😭" },
      { word: "fall", meaning: "넘어지다", emoji: "🤕" },
      { word: "win", meaning: "이기다", emoji: "🏆" },
      { word: "miss", meaning: "놓치다", emoji: "🚌" },
      { word: "finish", meaning: "끝내다", emoji: "✅" },
    ],
    grammar: {
      topic: "일반동사 과거 부정문 — didn't + 동사원형",
      table: [["I/You/He/She/It/We/They", "didn't + 동사원형"]],
      explain: [
        "과거 부정문은 주어가 무엇이든 didn't + 동사원형을 써요. 정말 간단해요!",
        "didn't 뒤에서는 동사를 반드시 원래 모양(원형)으로 써요. 과거형(ed)을 또 붙이면 안 돼요.",
        "규칙동사든 불규칙동사든 상관없이 똑같은 규칙이 적용돼요.",
      ],
      tip: "❗주의: I didn't went (X) → I didn't go (O) — didn't 뒤에는 원형만!",
      examples: [
        { en: "I didn't cry.", ko: "나는 울지 않았어." },
        { en: "She didn't lose the game.", ko: "그녀는 경기에서 지지 않았어." },
        { en: "We didn't finish on time.", ko: "우리는 제시간에 끝내지 못했어." },
      ],
      drill: ["I ___ (didn't) forget.", "He ___ (didn't) break it.", "They ___ (didn't) win."],
      practice: {
        multipleChoice: [
          { q: "I ___ cry.", options: ["don't", "doesn't", "didn't", "wasn't"], answerIndex: 2 },
          { q: "She ___ lose the game.", options: ["don't", "doesn't", "didn't", "wasn't"], answerIndex: 2 },
        ],
        secondType: "문장 전환 — 긍정문을 부정문으로 바꾸세요",
        secondItems: [
          { prompt: "I cried.", answer: "I didn't cry." },
          { prompt: "She lost the game.", answer: "She didn't lose the game." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (didn't) cry.", answer: "I didn't cry." },
        { prompt: "She ___ (didn't) lose the game.", answer: "She didn't lose the game." },
        { prompt: "We ___ (didn't) finish the homework.", answer: "We didn't finish the homework." },
      ],
      wordSentences: ["forget", "break", "miss"],
      freeWrite: {
        example: "I didn't cry.",
        prompt: "과거에 하지 않았던 일을 didn't를 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Did you cry?" },
        { speaker: "새봄", line: "No, I didn't cry. I was brave!" },
        { speaker: "새별", line: "I didn't cry, either." },
        { speaker: "새봄", line: "We are both brave!" },
      ],
      roleplay: "실제로 안 했던 일로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 20,
    title: "20회차 · 일반동사 과거 의문문 (Did you~?)",
    theme: "방학 이야기",
    vocab: [
      { word: "vacation", meaning: "방학", emoji: "🧳" },
      { word: "visit", meaning: "방문하다", emoji: "🚪" },
      { word: "fly", meaning: "날다/비행기를 타다", emoji: "🛫" },
      { word: "climb", meaning: "오르다", emoji: "🧗" },
      { word: "relax", meaning: "쉬다", emoji: "🛋️" },
      { word: "enjoy", meaning: "즐기다", emoji: "😄" },
      { word: "explore", meaning: "탐험하다", emoji: "🔭" },
      { word: "adventure", meaning: "모험", emoji: "🗺️" },
    ],
    grammar: {
      topic: "일반동사 과거 의문문 — Did you~?",
      table: [["Did I/you/he/she/it/we/they ~?", "Yes, ~ did. / No, ~ didn't."]],
      explain: [
        "과거 의문문은 주어가 무엇이든 문장 맨 앞에 Did만 붙이고, 동사는 원형으로 써요.",
        "Do/Does처럼 Did도 딱 하나만 기억하면 돼요. 과거에는 주어에 따라 달라지지 않아요.",
        "대답도 did/didn't로 짧게 할 수 있어요. (Yes, I did. / No, I didn't.)",
      ],
      tip: "❗주의: Did you went~? (X) → Did you go~? (O) — Did 뒤에는 원형만!",
      examples: [
        { en: "Did you enjoy the trip?", ko: "너는 여행이 즐거웠어?" },
        { en: "Did she climb the mountain?", ko: "그녀는 산에 올랐어?" },
        { en: "Did they visit grandma?", ko: "그들은 할머니를 찾아뵀어?" },
      ],
      drill: ["___ you fly on a plane? (Did)", "___ she enjoy the vacation? (Did)", "___ they climb the hill? (Did)"],
      practice: {
        multipleChoice: [
          { q: "___ you enjoy the trip?", options: ["Do", "Does", "Did", "Was"], answerIndex: 2 },
          { q: "___ she visit grandma?", options: ["Do", "Does", "Did", "Is"], answerIndex: 2 },
        ],
        secondType: "문장 전환 — 평서문을 의문문으로 바꾸세요",
        secondItems: [
          { prompt: "You enjoyed the trip.", answer: "Did you enjoy the trip?" },
          { prompt: "She visited grandma.", answer: "Did she visit grandma?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ you enjoy the vacation? (Did)", answer: "Did you enjoy the vacation?" },
        { prompt: "___ she visit grandma? (Did)", answer: "Did she visit grandma?" },
        { prompt: "___ they explore the cave? (Did)", answer: "Did they explore the cave?" },
      ],
      wordSentences: ["vacation", "adventure", "relax"],
      freeWrite: {
        example: "Did you enjoy the vacation? Yes, I did.",
        prompt: "방학 때 한 일을 Did 의문문으로 묻고 답해 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Did you have a good vacation?" },
        { speaker: "새별", line: "Yes, I did! I visited grandma." },
        { speaker: "새봄", line: "Did you enjoy it?" },
        { speaker: "새별", line: "Yes, I really did!" },
      ],
      roleplay: "실제 방학 이야기로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 21,
    title: "21회차 · 현재진행형 ① (am/is/are + ~ing)",
    theme: "지금 하고 있는 일",
    vocab: [
      { word: "laugh", meaning: "웃다", emoji: "😆" },
      { word: "talk", meaning: "말하다", emoji: "🗣️" },
      { word: "listen", meaning: "듣다", emoji: "👂" },
      { word: "wait", meaning: "기다리다", emoji: "⏳" },
      { word: "look", meaning: "보다", emoji: "👀" },
      { word: "write", meaning: "쓰다", emoji: "✍️" },
      { word: "call", meaning: "전화하다", emoji: "📞" },
      { word: "smile", meaning: "미소짓다", emoji: "😊" },
    ],
    grammar: {
      topic: "현재진행형 — am/is/are + 동사ing",
      table: [
        ["I", "am + ~ing"],
        ["He/She/It", "is + ~ing"],
        ["You/We/They", "are + ~ing"],
      ],
      explain: [
        "현재진행형은 '지금 ~하고 있다'라는 뜻으로, be동사(am/is/are) + 동사ing 형태로 만들어요.",
        "동사에 ing를 붙일 때: 대부분 그냥 +ing (talking), e로 끝나면 e를 빼고 +ing (write→writing), 짧은 모음+자음으로 끝나면 자음을 한번 더 쓰고 +ing (run→running)예요.",
        "be동사는 항상 주어에 맞게 골라야 해요 — I am, He/She/It is, You/We/They are는 바뀌지 않아요.",
      ],
      tip: "❗주의: I am write (X) → I am writing (O) — be동사와 ing를 둘 다 잊지 마세요!",
      examples: [
        { en: "I am writing a letter.", ko: "나는 편지를 쓰고 있어." },
        { en: "She is talking on the phone.", ko: "그녀는 전화 통화를 하고 있어." },
        { en: "We are waiting for the bus.", ko: "우리는 버스를 기다리고 있어." },
      ],
      drill: ["I ___ (am) reading now.", "He ___ (is) laughing.", "They ___ (are) waiting."],
      practice: {
        multipleChoice: [
          { q: "I ___ a letter.", options: ["write", "am writing", "writes", "wrote"], answerIndex: 1 },
          { q: "She ___ on the phone.", options: ["is talking", "talk", "talks", "talked"], answerIndex: 0 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(writing / am / I / a / letter)", answer: "I am writing a letter." },
          { prompt: "(talking / is / phone / she / the / on)", answer: "She is talking on the phone." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (write, 현재진행) a letter.", answer: "I am writing a letter." },
        { prompt: "She ___ (talk, 현재진행) on the phone.", answer: "She is talking on the phone." },
        { prompt: "We ___ (wait, 현재진행) for the bus.", answer: "We are waiting for the bus." },
      ],
      wordSentences: ["listen", "smile", "call"],
      freeWrite: {
        example: "I am writing a letter.",
        prompt: "지금 하고 있는 일을 현재진행형으로 한 문장 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "What are you doing?" },
        { speaker: "새봄", line: "I am writing a letter. What about you?" },
        { speaker: "새별", line: "I am listening to music." },
        { speaker: "새봄", line: "That sounds nice!" },
      ],
      roleplay: "지금 실제로 하고 있는 일로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 22,
    title: "22회차 · 현재진행형 부정문/의문문",
    theme: "지금 안 하는 일",
    vocab: [
      { word: "quiet", meaning: "조용한", emoji: "🤫" },
      { word: "loud", meaning: "시끄러운", emoji: "📢" },
      { word: "free", meaning: "한가한", emoji: "🆓" },
      { word: "ready", meaning: "준비된", emoji: "👍" },
      { word: "outside", meaning: "밖에서", emoji: "🌳" },
      { word: "inside", meaning: "안에서", emoji: "🏠" },
      { word: "together", meaning: "함께", emoji: "👫" },
      { word: "busy", meaning: "바쁜", emoji: "🏃" },
    ],
    grammar: {
      topic: "현재진행형 부정문/의문문 — isn't/aren't ~ing, Am/Is/Are ~ing?",
      table: [
        ["부정문", "be동사 + not + ~ing (isn't, aren't)"],
        ["의문문", "Am/Is/Are + 주어 + ~ing?"],
      ],
      explain: [
        "현재진행형 부정문은 be동사 뒤에 not을 붙이면 돼요. (is not = isn't, are not = aren't)",
        "의문문은 be동사를 문장 맨 앞으로 보내면 돼요. (You are reading. → Are you reading?)",
        "대답은 Yes/No + 주어 + be동사로 짧게 할 수 있어요.",
      ],
      tip: "❗Tip: Are you reading? 에 그냥 Yes로만 답하지 말고, Yes, I am.처럼 완전하게 대답하는 연습을 해보세요.",
      examples: [
        { en: "I am not sleeping.", ko: "나는 자고 있지 않아." },
        { en: "Is she reading?", ko: "그녀는 책을 읽고 있어?" },
        { en: "Are they playing outside?", ko: "그들은 밖에서 놀고 있어?" },
      ],
      drill: ["I ___ (am not) sleeping.", "___ she reading? (Is)", "___ they playing? (Are)"],
      practice: {
        multipleChoice: [
          { q: "I ___ sleeping now.", options: ["am not", "isn't", "don't", "not am"], answerIndex: 0 },
          { q: "___ she reading?", options: ["Do", "Does", "Is", "Are"], answerIndex: 2 },
        ],
        secondType: "문장 전환 — 부정문/의문문으로 바꾸세요",
        secondItems: [
          { prompt: "I am sleeping. (부정문으로)", answer: "I am not sleeping." },
          { prompt: "He is studying. (의문문으로)", answer: "Is he studying?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (am not) sleeping now.", answer: "I am not sleeping now." },
        { prompt: "___ he studying? (Is)", answer: "Is he studying?" },
        { prompt: "___ they playing outside? (Are)", answer: "Are they playing outside?" },
      ],
      wordSentences: ["quiet", "together", "outside"],
      freeWrite: {
        example: "Is she reading? No, she isn't.",
        prompt: "지금 하고 있지 않은 일을 현재진행형 부정문/의문문으로 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Are you playing outside?" },
        { speaker: "새별", line: "No, I'm not. I am reading inside." },
        { speaker: "새봄", line: "Is it quiet in there?" },
        { speaker: "새별", line: "Yes, it is very quiet." },
      ],
      roleplay: "지금 진짜 하고 있는 일과 안 하고 있는 일로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 23,
    title: "23회차 · There is / There are",
    theme: "내 방",
    vocab: [
      { word: "bed", meaning: "침대", emoji: "🛏️" },
      { word: "closet", meaning: "옷장", emoji: "🚪" },
      { word: "lamp", meaning: "램프", emoji: "💡" },
      { word: "window", meaning: "창문", emoji: "🪟" },
      { word: "wall", meaning: "벽", emoji: "🧱" },
      { word: "shelf", meaning: "선반", emoji: "📚" },
      { word: "toy", meaning: "장난감", emoji: "🧸" },
      { word: "poster", meaning: "포스터", emoji: "🖼️" },
    ],
    grammar: {
      topic: "There is / There are — ~이 있다",
      table: [
        ["There is + 단수명사", "책상이 하나 있다 등"],
        ["There are + 복수명사", "책이 여러 권 있다 등"],
      ],
      explain: [
        "There is/are는 '~이 있다'라는 뜻으로, 무언가의 존재를 말할 때 사용해요.",
        "뒤에 오는 명사가 하나(단수)면 There is, 여러 개(복수)면 There are를 써요.",
        "우리말은 '방에 침대가 있다'처럼 장소가 먼저 오지만, 영어는 There is/are가 먼저 온다는 점이 달라요.",
      ],
      tip: "❗주의: There is two beds (X) → There are two beds (O) — 복수명사는 항상 are와 짝이에요.",
      examples: [
        { en: "There is a lamp on the desk.", ko: "책상 위에 램프가 있어." },
        { en: "There are two windows.", ko: "창문이 두 개 있어." },
        { en: "There is a toy on the bed.", ko: "침대 위에 장난감이 있어." },
      ],
      drill: ["There ___ (is) a bed in my room.", "There ___ (are) two windows.", "There ___ (is) a lamp on the desk."],
      practice: {
        multipleChoice: [
          { q: "There ___ a lamp on the desk.", options: ["is", "are", "am", "be"], answerIndex: 0 },
          { q: "There ___ two windows.", options: ["is", "are", "am", "be"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(is / lamp / a / there / desk / on / the)", answer: "There is a lamp on the desk." },
          { prompt: "(are / windows / there / two)", answer: "There are two windows." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "There ___ (is) a shelf in my room.", answer: "There is a shelf in my room." },
        { prompt: "There ___ (are) three toys on the bed.", answer: "There are three toys on the bed." },
        { prompt: "There ___ (is) a poster on the wall.", answer: "There is a poster on the wall." },
      ],
      wordSentences: ["closet", "window", "toy"],
      freeWrite: {
        example: "There is a lamp on the desk.",
        prompt: "내 방에 있는 물건을 There is/are를 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "What is in your room?" },
        { speaker: "새봄", line: "There is a bed and there are two windows." },
        { speaker: "새별", line: "Is there a poster, too?" },
        { speaker: "새봄", line: "Yes, there is!" },
      ],
      roleplay: "실제 자기 방에 있는 물건으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 24,
    type: "review",
    title: "24회차 · Review Test 4 (19~23회차 총정리)",
    covers: "19~23회차",
    recap: [
      ["didn't + 동사원형", "일반동사 과거 부정문"],
      ["Did ~?", "일반동사 과거 의문문"],
      ["am/is/are + ~ing", "현재진행형"],
      ["isn't/aren't ~ing, Am/Is/Are ~ing?", "현재진행형 부정/의문"],
      ["There is/are", "~이 있다"],
    ],
    multipleChoice: [
      { q: "I ___ cry.", options: ["don't", "doesn't", "didn't", "wasn't"], answerIndex: 2 },
      { q: "___ you enjoy the trip?", options: ["Do", "Does", "Did", "Was"], answerIndex: 2 },
      { q: "I ___ a letter.", options: ["write", "am writing", "writes", "wrote"], answerIndex: 1 },
      { q: "She ___ on the phone.", options: ["is talking", "talk", "talks", "talked"], answerIndex: 0 },
      { q: "I ___ sleeping now.", options: ["am not", "isn't", "don't", "not am"], answerIndex: 0 },
      { q: "___ she reading?", options: ["Do", "Does", "Is", "Are"], answerIndex: 2 },
      { q: "There ___ a lamp.", options: ["is", "are", "am", "be"], answerIndex: 0 },
      { q: "There ___ two windows.", options: ["is", "are", "am", "be"], answerIndex: 1 },
      { q: "There ___ a plant. (부정문)", options: ["isn't", "aren't", "don't", "not is"], answerIndex: 0 },
      { q: "___ there a flag?", options: ["Is", "Are", "Do", "Does"], answerIndex: 0 },
    ],
    transform: [
      { prompt: "I cried. (부정문으로)", answer: "I didn't cry." },
      { prompt: "You enjoyed the trip. (의문문으로)", answer: "Did you enjoy the trip?" },
      { prompt: "(writing / am / I / a / letter) 어순 배열", answer: "I am writing a letter." },
      { prompt: "There is a fan. (부정문으로)", answer: "There isn't a fan." },
      { prompt: "There are computers. (의문문으로)", answer: "Are there computers?" },
    ],
    freeWrite: { prompt: "19~23회차에서 배운 문법 중 하나를 사용해서 나만의 문장을 2개 써 보세요." },
  },
  {
    id: 25,
    title: "25회차 · There is/are 부정문·의문문",
    theme: "교실 살펴보기",
    vocab: [
      { word: "board", meaning: "칠판", emoji: "⬛" },
      { word: "map", meaning: "지도", emoji: "🗺️" },
      { word: "plant", meaning: "화분", emoji: "🪴" },
      { word: "fan", meaning: "선풍기", emoji: "🌀" },
      { word: "computer", meaning: "컴퓨터", emoji: "💻" },
      { word: "trash can", meaning: "쓰레기통", emoji: "🗑️" },
      { word: "locker", meaning: "사물함", emoji: "🗄️" },
      { word: "flag", meaning: "깃발", emoji: "🚩" },
    ],
    grammar: {
      topic: "There is/are 부정문·의문문 — isn't/aren't, Is/Are there~?",
      table: [
        ["부정문", "There isn't / There aren't"],
        ["의문문", "Is there~? / Are there~?"],
      ],
      explain: [
        "부정문은 is/are 뒤에 not을 붙여서 isn't, aren't로 만들어요.",
        "의문문은 There와 is/are의 순서를 바꿔서 Is there~? / Are there~?로 물어봐요.",
        "대답은 Yes, there is(are). / No, there isn't(aren't).로 짧게 할 수 있어요.",
      ],
      tip: "❗주의: Is there a books? (X) → Are there books? (O) — 복수명사는 Are there로 물어봐요.",
      examples: [
        { en: "There isn't a plant.", ko: "화분이 없어." },
        { en: "Are there computers in the classroom?", ko: "교실에 컴퓨터가 있어?" },
        { en: "Is there a flag?", ko: "깃발이 있어?" },
      ],
      drill: ["There ___ (isn't) a fan here.", "___ there a map? (Is)", "___ there lockers? (Are)"],
      practice: {
        multipleChoice: [
          { q: "There ___ a plant here. (부정문)", options: ["isn't", "aren't", "don't", "not is"], answerIndex: 0 },
          { q: "___ there a flag?", options: ["Is", "Are", "Do", "Does"], answerIndex: 0 },
        ],
        secondType: "문장 전환 — 긍정문을 부정문/의문문으로 바꾸세요",
        secondItems: [
          { prompt: "There is a fan. (부정문으로)", answer: "There isn't a fan." },
          { prompt: "There are computers. (의문문으로)", answer: "Are there computers?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "There ___ (isn't) a trash can here.", answer: "There isn't a trash can here." },
        { prompt: "___ there a board in the classroom? (Is)", answer: "Is there a board in the classroom?" },
        { prompt: "___ there lockers in the hall? (Are)", answer: "Are there lockers in the hall?" },
      ],
      wordSentences: ["computer", "plant", "flag"],
      freeWrite: {
        example: "Is there a computer? Yes, there is.",
        prompt: "교실에 있는지 없는지 There is/are 의문문으로 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Is there a computer in your classroom?" },
        { speaker: "새별", line: "Yes, there is! There are two computers." },
        { speaker: "새봄", line: "Are there lockers, too?" },
        { speaker: "새별", line: "No, there aren't." },
      ],
      roleplay: "실제 교실 모습으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 26,
    title: "26회차 · 지시대명사 this/that",
    theme: "가까운 것, 먼 것",
    vocab: [
      { word: "near", meaning: "가까운", emoji: "📍" },
      { word: "far", meaning: "먼", emoji: "🏔️" },
      { word: "here", meaning: "여기", emoji: "👉" },
      { word: "there", meaning: "저기", emoji: "👈" },
      { word: "mine", meaning: "내 것", emoji: "🙋" },
      { word: "yours", meaning: "너의 것", emoji: "🫵" },
      { word: "gift", meaning: "선물", emoji: "🎁" },
      { word: "balloon", meaning: "풍선", emoji: "🎈" },
    ],
    grammar: {
      topic: "지시대명사 — this / that",
      table: [
        ["this", "이것 (가까운 것, 단수)"],
        ["that", "저것 (먼 것, 단수)"],
      ],
      explain: [
        "this는 나와 가까운 곳에 있는 것 하나를 가리킬 때, that은 멀리 있는 것 하나를 가리킬 때 써요.",
        "This is ~. / That is ~. 형태로 물건을 소개할 수 있어요.",
        "질문할 때는 Is this~? / Is that~?처럼 be동사와 함께 써요.",
      ],
      tip: "❗Tip: this=이것(가까이), that=저것(멀리) — 손으로 가리키는 연습을 하면 더 쉽게 기억돼요!",
      examples: [
        { en: "This is my gift.", ko: "이건 내 선물이야." },
        { en: "That is your balloon.", ko: "저건 네 풍선이야." },
        { en: "Is this yours?", ko: "이거 네 거야?" },
      ],
      drill: ["___ (This) is my book.", "___ (That) is your bag.", "Is ___ (this) mine?"],
      practice: {
        multipleChoice: [
          { q: "___ is my gift. (가까운 것)", options: ["This", "That", "These", "Those"], answerIndex: 0 },
          { q: "___ is your balloon over there. (먼 것)", options: ["This", "That", "These", "Those"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(is / gift / this / my)", answer: "This is my gift." },
          { prompt: "(that / balloon / your / is)", answer: "That is your balloon." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ is my gift. (This)", answer: "This is my gift." },
        { prompt: "___ is your umbrella over there. (That)", answer: "That is your umbrella over there." },
        { prompt: "Is ___ yours? (this)", answer: "Is this yours?" },
      ],
      wordSentences: ["near", "far", "mine"],
      freeWrite: {
        example: "This is my gift.",
        prompt: "가까이 있는 물건과 멀리 있는 물건을 this/that으로 각각 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Is this your balloon?" },
        { speaker: "새봄", line: "Yes, this is mine. Is that your gift?" },
        { speaker: "새별", line: "Yes, that is my gift!" },
        { speaker: "새봄", line: "It looks great!" },
      ],
      roleplay: "실제 주변 물건을 가리키며 this/that으로 대화를 다시 해보세요.",
    },
  },
  {
    id: 27,
    title: "27회차 · 지시대명사 these/those",
    theme: "여러 개 물건",
    vocab: [
      { word: "shoes", meaning: "신발", emoji: "👟" },
      { word: "socks", meaning: "양말", emoji: "🧦" },
      { word: "gloves", meaning: "장갑", emoji: "🧤" },
      { word: "glasses", meaning: "안경", emoji: "👓" },
      { word: "crayons", meaning: "크레파스", emoji: "🖍️" },
      { word: "flowers", meaning: "꽃", emoji: "💐" },
      { word: "stickers", meaning: "스티커", emoji: "✨" },
      { word: "marbles", meaning: "구슬", emoji: "🔮" },
    ],
    grammar: {
      topic: "지시대명사 — these / those",
      table: [
        ["these", "이것들 (가까운 것, 복수)"],
        ["those", "저것들 (먼 것, 복수)"],
      ],
      explain: [
        "this/that의 복수형이 these/those예요. 여러 개를 가리킬 때 사용해요.",
        "가까이 있는 여러 개는 these, 멀리 있는 여러 개는 those를 써요.",
        "these/those 뒤에는 복수명사가 오고, be동사는 are를 사용해요. (These are my shoes.)",
      ],
      tip: "❗주의: These is (X) → These are (O) — these/those는 항상 are와 짝이에요.",
      examples: [
        { en: "These are my shoes.", ko: "이것들은 내 신발이야." },
        { en: "Those are your gloves.", ko: "저것들은 네 장갑이야." },
        { en: "Are these your socks?", ko: "이것들 네 양말이야?" },
      ],
      drill: ["___ (These) are my gloves.", "___ (Those) are your shoes.", "Are ___ (these) yours?"],
      practice: {
        multipleChoice: [
          { q: "___ are my shoes. (가까운 여러 개)", options: ["This", "That", "These", "Those"], answerIndex: 2 },
          { q: "___ are your gloves over there.", options: ["This", "That", "These", "Those"], answerIndex: 3 },
        ],
        secondType: "형태 바꾸기 — 단수를 복수로 바꿔 써 보세요",
        secondItems: [
          { prompt: "This is my shoe. (복수로)", answer: "These are my shoes." },
          { prompt: "That is your glove. (복수로)", answer: "Those are your gloves." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ are my crayons. (These)", answer: "These are my crayons." },
        { prompt: "___ are your flowers over there. (Those)", answer: "Those are your flowers over there." },
        { prompt: "Are ___ your stickers? (these)", answer: "Are these your stickers?" },
      ],
      wordSentences: ["shoes", "glasses", "marbles"],
      freeWrite: {
        example: "These are my shoes.",
        prompt: "가까이 있는 여러 개와 멀리 있는 여러 개를 these/those로 각각 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Are these your crayons?" },
        { speaker: "새별", line: "Yes, these are mine. Are those your shoes?" },
        { speaker: "새봄", line: "Yes, those are my shoes!" },
        { speaker: "새별", line: "They look new!" },
      ],
      roleplay: "실제 주변 물건 여러 개로 바꿔서 these/those로 대화를 다시 해보세요.",
    },
  },
  {
    id: 28,
    title: "28회차 · 소유격 ① (my/your/his/her/its/our/their)",
    theme: "누구의 물건일까",
    vocab: [
      { word: "hat", meaning: "모자", emoji: "🧢" },
      { word: "jacket", meaning: "자켓", emoji: "🧥" },
      { word: "wallet", meaning: "지갑", emoji: "👛" },
      { word: "watch", meaning: "손목시계", emoji: "⌚" },
      { word: "key", meaning: "열쇠", emoji: "🔑" },
      { word: "phone", meaning: "전화기", emoji: "📱" },
      { word: "backpack", meaning: "책가방", emoji: "🎒" },
      { word: "scarf", meaning: "목도리", emoji: "🧣" },
    ],
    grammar: {
      topic: "소유격 대명사 — my/your/his/her/its/our/their",
      table: [
        ["I → my", "나의"],
        ["You → your", "너의"],
        ["He → his", "그의"],
        ["She → her", "그녀의"],
        ["It → its", "그것의"],
        ["We → our", "우리의"],
        ["They → their", "그들의"],
      ],
      explain: [
        "소유격은 '~의'라는 뜻으로, 누구의 물건인지 나타낼 때 사용해요.",
        "주어 대명사(I, you, he...)와 짝이 되는 소유격이 각각 정해져 있어요. 표를 보고 짝을 맞춰 외워보세요.",
        "소유격 뒤에는 항상 명사가 와요. (my hat, her bag, their toys)",
      ],
      tip: "❗주의: her과 his를 헷갈리기 쉬워요 — her은 여자(그녀), his는 남자(그)예요.",
      examples: [
        { en: "This is my hat.", ko: "이건 내 모자야." },
        { en: "That is her jacket.", ko: "저건 그녀의 자켓이야." },
        { en: "Their backpacks are heavy.", ko: "그들의 책가방은 무거워." },
      ],
      drill: ["This is ___ (my) wallet.", "That is ___ (his) watch.", "___ (Their) keys are here."],
      practice: {
        multipleChoice: [
          { q: "This is ___ hat. (나의)", options: ["I", "me", "my", "mine"], answerIndex: 2 },
          { q: "That is ___ jacket. (그녀의)", options: ["she", "her", "hers", "he"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(my / this / is / backpack)", answer: "This is my backpack." },
          { prompt: "(her / that / scarf / is)", answer: "That is her scarf." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "This is ___ (my) backpack.", answer: "This is my backpack." },
        { prompt: "That is ___ (her) scarf.", answer: "That is her scarf." },
        { prompt: "___ (Our) classroom is big.", answer: "Our classroom is big." },
      ],
      wordSentences: ["hat", "key", "phone"],
      freeWrite: {
        example: "This is my hat.",
        prompt: "내 물건이나 가족의 물건을 소유격을 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Is this your hat?" },
        { speaker: "새봄", line: "Yes, it's my hat. Is that her scarf?" },
        { speaker: "새별", line: "Yes, that's her scarf." },
        { speaker: "새봄", line: "It's very pretty." },
      ],
      roleplay: "실제 가족 물건으로 바꿔서 소유격을 사용해 대화를 다시 해보세요.",
    },
  },
  {
    id: 29,
    title: "29회차 · 소유격 ② ('s)",
    theme: "누구누구의 것",
    vocab: [
      { word: "name", meaning: "이름", emoji: "📛" },
      { word: "birthday", meaning: "생일", emoji: "🎂" },
      { word: "puppy", meaning: "강아지", emoji: "🐶" },
      { word: "kitten", meaning: "새끼 고양이", emoji: "🐱" },
      { word: "umbrella", meaning: "우산", emoji: "☂️" },
      { word: "notebook", meaning: "공책", emoji: "📓" },
      { word: "idea", meaning: "생각", emoji: "💡" },
      { word: "team", meaning: "팀", emoji: "👥" },
    ],
    grammar: {
      topic: "소유격 's — 이름 뒤에 붙이는 소유격",
      table: [
        ["사람 이름 + 's", "Saebom's book (새봄이의 책)"],
        ["복수명사(-s로 끝남) + '", "the girls' room (여자아이들의 방)"],
      ],
      explain: [
        "사람이나 동물 이름 뒤에 아포스트로피(')와 s를 붙이면 '~의'라는 소유격이 돼요.",
        "예: Saebom + 's = Saebom's (새봄이의), the dog + 's = the dog's (그 개의)",
        "이미 s로 끝나는 복수명사는 아포스트로피(')만 붙여요. (the girls' bags)",
      ],
      tip: "❗주의: 's와 소유격 my/her 등을 한 문장에 같이 쓰지 않아요.",
      examples: [
        { en: "This is Saebom's notebook.", ko: "이건 새봄이의 공책이야." },
        { en: "That is the puppy's toy.", ko: "저건 강아지의 장난감이야." },
        { en: "It's my sister's birthday.", ko: "오늘은 내 동생 생일이야." },
      ],
      drill: ["This is ___ (Saebom's) idea.", "That is ___ (the puppy's) toy.", "It is ___ (my sister's) birthday."],
      practice: {
        multipleChoice: [
          { q: "This is ___ notebook. (새봄의)", options: ["Saebom", "Saebom's", "Saebom is", "of Saebom"], answerIndex: 1 },
          { q: "That is ___ toy. (강아지의)", options: ["the puppy", "the puppy's", "puppy is", "puppys"], answerIndex: 1 },
        ],
        secondType: "형태 바꾸기 — 이름을 's 소유격으로 바꿔 써 보세요",
        secondItems: [
          { prompt: "Saebyul + umbrella", answer: "Saebyul's umbrella" },
          { prompt: "the kitten + toy", answer: "the kitten's toy" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "This is ___ (Saebyul's) umbrella.", answer: "This is Saebyul's umbrella." },
        { prompt: "That is ___ (the kitten's) toy.", answer: "That is the kitten's toy." },
        { prompt: "It is ___ (my friend's) birthday.", answer: "It is my friend's birthday." },
      ],
      wordSentences: ["name", "team", "notebook"],
      freeWrite: {
        example: "This is Saebom's notebook.",
        prompt: "가족이나 친구 이름을 사용해서 's 소유격 문장을 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Whose notebook is this?" },
        { speaker: "새별", line: "It's Saebom's notebook!" },
        { speaker: "새봄", line: "Is this the puppy's toy?" },
        { speaker: "새별", line: "Yes, it's the puppy's toy." },
      ],
      roleplay: "진짜 가족·친구 이름으로 바꿔서 's 소유격 대화를 다시 해보세요.",
    },
  },
  {
    id: 30,
    type: "review",
    title: "30회차 · Review Test 5 (25~29회차 총정리)",
    covers: "25~29회차",
    recap: [
      ["There isn't/aren't, Is/Are there~?", "There is/are 부정·의문"],
      ["this/that", "지시대명사 단수"],
      ["these/those", "지시대명사 복수"],
      ["my/your/his/her 등", "소유격 대명사"],
      ["Saebom's 등", "소유격 's"],
    ],
    multipleChoice: [
      { q: "There ___ a plant here.", options: ["isn't", "aren't", "don't", "not is"], answerIndex: 0 },
      { q: "___ there a flag?", options: ["Is", "Are", "Do", "Does"], answerIndex: 0 },
      { q: "___ is my gift.", options: ["This", "That", "These", "Those"], answerIndex: 0 },
      { q: "___ is your balloon over there.", options: ["This", "That", "These", "Those"], answerIndex: 1 },
      { q: "___ are my shoes.", options: ["This", "That", "These", "Those"], answerIndex: 2 },
      { q: "___ are your gloves over there.", options: ["This", "That", "These", "Those"], answerIndex: 3 },
      { q: "This is ___ hat. (나의)", options: ["I", "me", "my", "mine"], answerIndex: 2 },
      { q: "That is ___ jacket. (그녀의)", options: ["she", "her", "hers", "he"], answerIndex: 1 },
      { q: "This is ___ notebook. (새봄의)", options: ["Saebom", "Saebom's", "Saebom is", "of Saebom"], answerIndex: 1 },
      { q: "That is ___ toy. (강아지의)", options: ["the puppy", "the puppy's", "puppy is", "puppys"], answerIndex: 1 },
    ],
    transform: [
      { prompt: "There is a fan. (부정문으로)", answer: "There isn't a fan." },
      { prompt: "This is my shoe. (복수로)", answer: "These are my shoes." },
      { prompt: "(is / gift / this / my) 어순 배열", answer: "This is my gift." },
      { prompt: "(my / this / is / backpack) 어순 배열", answer: "This is my backpack." },
      { prompt: "Saebyul + umbrella ('s 소유격으로)", answer: "Saebyul's umbrella" },
    ],
    freeWrite: { prompt: "25~29회차에서 배운 문법 중 하나를 사용해서 나만의 문장을 2개 써 보세요." },
  },
  {
    id: 31,
    title: "31회차 · 조동사 can ① (능력)",
    theme: "내가 할 수 있는 것",
    vocab: [
      { word: "jump rope", meaning: "줄넘기", emoji: "🪢" },
      { word: "ride", meaning: "타다", emoji: "🚲" },
      { word: "skate", meaning: "스케이트타다", emoji: "⛸️" },
      { word: "bake", meaning: "굽다", emoji: "🍞" },
      { word: "paint", meaning: "페인트칠하다", emoji: "🎨" },
      { word: "whistle", meaning: "휘파람불다", emoji: "😗" },
      { word: "juggle", meaning: "저글링하다", emoji: "🤹" },
      { word: "dive", meaning: "다이빙하다", emoji: "🤿" },
    ],
    grammar: {
      topic: "조동사 can — ~할 수 있다 (능력)",
      table: [
        ["주어 + can + 동사원형", "할 수 있다"],
        ["주어 + can't(cannot) + 동사원형", "할 수 없다"],
      ],
      explain: [
        "can은 '~할 수 있다'라는 능력을 나타내는 조동사예요. 주어가 누구든 can의 모양은 바뀌지 않아요!",
        "can 뒤에는 항상 동사원형이 와요. (He can swims (X) → He can swim (O))",
        "부정형은 can't 또는 cannot이에요. (I can't ride a bike.)",
      ],
      tip: "❗Tip: can은 he/she/it이 와도 s를 붙이지 않는 특별한 동사예요.",
      examples: [
        { en: "I can ride a bike.", ko: "나는 자전거를 탈 수 있어." },
        { en: "She can skate.", ko: "그녀는 스케이트를 탈 수 있어." },
        { en: "He can't swim.", ko: "그는 수영을 못해." },
      ],
      drill: ["I ___ (can) jump rope.", "She ___ (can) paint well.", "He ___ (can't) whistle."],
      practice: {
        multipleChoice: [
          { q: "I ___ ride a bike.", options: ["can", "cans", "is can", "am can"], answerIndex: 0 },
          { q: "He ___ swim. (부정)", options: ["can't", "isn't", "doesn't", "not can"], answerIndex: 0 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(ride / can / I / a / bike)", answer: "I can ride a bike." },
          { prompt: "(can't / he / whistle)", answer: "He can't whistle." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (can) ride a bike.", answer: "I can ride a bike." },
        { prompt: "She ___ (can) bake cookies.", answer: "She can bake cookies." },
        { prompt: "He ___ (can't) juggle.", answer: "He can't juggle." },
      ],
      wordSentences: ["skate", "paint", "dive"],
      freeWrite: {
        example: "I can ride a bike.",
        prompt: "내가 할 수 있는 것과 할 수 없는 것을 can/can't로 각각 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Can you ride a bike?" },
        { speaker: "새봄", line: "Yes, I can! Can you skate?" },
        { speaker: "새별", line: "No, I can't. But I can swim!" },
        { speaker: "새봄", line: "That's awesome!" },
      ],
      roleplay: "실제 할 수 있는 것/없는 것으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 32,
    title: "32회차 · 조동사 can ② (허가/요청 의문문)",
    theme: "부탁하기",
    vocab: [
      { word: "borrow", meaning: "빌리다", emoji: "🙏" },
      { word: "open", meaning: "열다", emoji: "🚪" },
      { word: "close", meaning: "닫다", emoji: "🔒" },
      { word: "pass", meaning: "건네주다", emoji: "🤲" },
      { word: "hold", meaning: "잡다", emoji: "✋" },
      { word: "share", meaning: "나누다", emoji: "🤝" },
      { word: "repeat", meaning: "반복하다", emoji: "🔁" },
      { word: "help", meaning: "돕다", emoji: "🙋" },
    ],
    grammar: {
      topic: "조동사 can — 허가를 구하거나 부탁할 때",
      table: [
        ["Can I ~?", "제가 ~해도 될까요? (허가)"],
        ["Can you ~?", "~해 줄 수 있어요? (부탁)"],
      ],
      explain: [
        "can은 능력 말고도 '허가를 구하거나(Can I~?)' '부탁할 때(Can you~?)' 아주 많이 사용돼요.",
        "Can I~?는 내가 무언가를 해도 되는지 묻는 표현, Can you~?는 상대방에게 부탁하는 표현이에요.",
        "대답은 Sure!/Of course!(좋아요) 또는 Sorry, I can't.(미안, 안 돼요)처럼 자연스럽게 할 수 있어요.",
      ],
      tip: "❗Tip: 정중하게 부탁할 때는 문장 끝에 please를 붙여보세요. (Can you help me, please?)",
      examples: [
        { en: "Can I borrow your pencil?", ko: "네 연필 좀 빌릴 수 있을까?" },
        { en: "Can you open the door?", ko: "문 좀 열어줄 수 있어?" },
        { en: "Can you help me, please?", ko: "나 좀 도와줄 수 있어?" },
      ],
      drill: ["___ (Can) I open the window?", "___ (Can) you pass the salt?", "___ (Can) you help me?"],
      practice: {
        multipleChoice: [
          { q: "___ I borrow your pencil?", options: ["Can", "Do", "Am", "Is"], answerIndex: 0 },
          { q: "___ you help me?", options: ["Can", "Do", "Am", "Is"], answerIndex: 0 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(I / can / borrow / your / book)", answer: "Can I borrow your book?" },
          { prompt: "(you / can / close / the / door)", answer: "Can you close the door?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ I borrow your book? (Can)", answer: "Can I borrow your book?" },
        { prompt: "___ you close the door? (Can)", answer: "Can you close the door?" },
        { prompt: "___ you help me, please? (Can)", answer: "Can you help me, please?" },
      ],
      wordSentences: ["share", "repeat", "hold"],
      freeWrite: {
        example: "Can I borrow your pencil?",
        prompt: "허가를 구하거나 부탁하는 문장을 can을 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Can I borrow your crayon?" },
        { speaker: "새별", line: "Sure! Here you go." },
        { speaker: "새봄", line: "Can you help me with this?" },
        { speaker: "새별", line: "Of course!" },
      ],
      roleplay: "실제로 부탁하고 싶은 것으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 33,
    title: "33회차 · 의문사 의문문 ① (What / Who)",
    theme: "질문 놀이",
    vocab: [
      { word: "color", meaning: "색깔", emoji: "🎨" },
      { word: "age", meaning: "나이", emoji: "🎂" },
      { word: "job", meaning: "직업", emoji: "💼" },
      { word: "animal", meaning: "동물", emoji: "🐾" },
      { word: "food", meaning: "음식", emoji: "🍕" },
      { word: "subject", meaning: "과목", emoji: "📖" },
      { word: "person", meaning: "사람", emoji: "🧑" },
      { word: "thing", meaning: "물건", emoji: "📦" },
    ],
    grammar: {
      topic: "의문사 의문문 ① — What / Who",
      table: [
        ["What", "무엇 (사물, 내용을 물을 때)"],
        ["Who", "누구 (사람을 물을 때)"],
      ],
      explain: [
        "의문사는 Yes/No로 대답할 수 없는 구체적인 질문을 할 때 문장 맨 앞에 써요.",
        "What은 '무엇'을 물을 때, Who는 '누구'인지 물을 때 사용해요.",
        "의문사 뒤에는 be동사나 do/does/did 의문문이 그대로 이어져요. (What is this? What do you like?)",
      ],
      tip: "❗Tip: What/Who 뒤의 문장 순서는 일반 의문문과 똑같아요 — 의문사만 앞에 붙인다고 생각하면 쉬워요.",
      examples: [
        { en: "What is this?", ko: "이게 뭐야?" },
        { en: "Who is she?", ko: "그녀는 누구야?" },
        { en: "What do you like?", ko: "너는 뭘 좋아해?" },
      ],
      drill: ["___ (What) is your favorite color?", "___ (Who) is your teacher?", "___ (What) do you like?"],
      practice: {
        multipleChoice: [
          { q: "___ is your favorite color?", options: ["What", "Who", "Where", "When"], answerIndex: 0 },
          { q: "___ is your best friend?", options: ["What", "Who", "Where", "When"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(is / favorite / what / your / animal)", answer: "What is your favorite animal?" },
          { prompt: "(who / best / your / friend / is)", answer: "Who is your best friend?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ is your favorite animal? (What)", answer: "What is your favorite animal?" },
        { prompt: "___ is your best friend? (Who)", answer: "Who is your best friend?" },
        { prompt: "___ do you want for dinner? (What)", answer: "What do you want for dinner?" },
      ],
      wordSentences: ["color", "job", "person"],
      freeWrite: {
        example: "What is your favorite color?",
        prompt: "What이나 Who를 사용해서 궁금한 것을 질문으로 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "What is your favorite animal?" },
        { speaker: "새봄", line: "I like rabbits. Who is your best friend?" },
        { speaker: "새별", line: "My best friend is Jimin!" },
        { speaker: "새봄", line: "She sounds nice!" },
      ],
      roleplay: "진짜 궁금한 것을 What/Who로 물어보고 답해보세요.",
    },
  },
  {
    id: 34,
    title: "34회차 · 의문사 의문문 ② (Where / When / Why / How)",
    theme: "여행 계획",
    vocab: [
      { word: "museum", meaning: "박물관", emoji: "🏛️" },
      { word: "airport", meaning: "공항", emoji: "✈️" },
      { word: "season", meaning: "계절", emoji: "🍂" },
      { word: "reason", meaning: "이유", emoji: "❓" },
      { word: "way", meaning: "방법", emoji: "🛤️" },
      { word: "ticket", meaning: "티켓", emoji: "🎫" },
      { word: "guide", meaning: "안내", emoji: "🧭" },
      { word: "plan", meaning: "계획", emoji: "📝" },
    ],
    grammar: {
      topic: "의문사 의문문 ② — Where / When / Why / How",
      table: [
        ["Where", "어디에서 (장소)"],
        ["When", "언제 (시간)"],
        ["Why", "왜 (이유)"],
        ["How", "어떻게, 얼마나 (방법/상태)"],
      ],
      explain: [
        "Where는 장소, When은 시간, Why는 이유, How는 방법이나 상태를 물을 때 사용해요.",
        "Why로 물으면 대답은 보통 Because(왜냐하면)로 시작해요. (Why? - Because I'm happy.)",
        "How는 How are you?(안부), How many~?(개수), How old~?(나이)처럼 다양하게 활용돼요.",
      ],
      tip: "❗Tip: 의문사 5총사 What/Who/Where/When/Why/How를 한 문장으로 외워보세요 — '무누어언왜어떻'!",
      examples: [
        { en: "Where is the museum?", ko: "박물관은 어디에 있어?" },
        { en: "When is your birthday?", ko: "네 생일은 언제야?" },
        { en: "Why are you happy?", ko: "너는 왜 행복해?" },
        { en: "How are you?", ko: "어떻게 지내?" },
      ],
      drill: ["___ (Where) do you live?", "___ (When) is the trip?", "___ (How) old are you?"],
      practice: {
        multipleChoice: [
          { q: "___ is the museum?", options: ["Where", "When", "Why", "How"], answerIndex: 0 },
          { q: "___ are you excited?", options: ["Where", "When", "Why", "How"], answerIndex: 2 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(is / airport / where / the)", answer: "Where is the airport?" },
          { prompt: "(is / trip / when / the)", answer: "When is the trip?" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "___ is the airport? (Where)", answer: "Where is the airport?" },
        { prompt: "___ is the trip? (When)", answer: "When is the trip?" },
        { prompt: "___ are you excited? (Why)", answer: "Why are you excited?" },
      ],
      wordSentences: ["ticket", "plan", "season"],
      freeWrite: {
        example: "Where is the museum?",
        prompt: "Where/When/Why/How 중 하나를 사용해서 질문을 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "When is our trip?" },
        { speaker: "새별", line: "It's next Saturday!" },
        { speaker: "새봄", line: "Why are you so excited?" },
        { speaker: "새별", line: "Because I love the museum!" },
      ],
      roleplay: "실제 계획하고 있는 일로 바꿔서 의문사 질문을 다시 해보세요.",
    },
  },
  {
    id: 35,
    title: "35회차 · 총정리 복습 — 문법 한 사이클 완성",
    theme: "문법 총정리",
    vocab: [
      { word: "review", meaning: "복습하다", emoji: "📝" },
      { word: "grammar", meaning: "문법", emoji: "📘" },
      { word: "sentence", meaning: "문장", emoji: "✏️" },
      { word: "practice", meaning: "연습하다", emoji: "💪" },
      { word: "complete", meaning: "완성하다", emoji: "✅" },
      { word: "confident", meaning: "자신있는", emoji: "😎" },
      { word: "proud", meaning: "뿌듯한", emoji: "🥹" },
      { word: "achieve", meaning: "성취하다", emoji: "🏆" },
    ],
    grammar: {
      topic: "총정리 — Be동사·일반동사·현재진행형·There is/are·지시대명사·소유격·can·의문사",
      table: [
        ["Be동사", "am/is/are, was/were (+ not, 의문문)"],
        ["일반동사", "현재형(-s), 과거형(-ed/불규칙) (+ don't/doesn't/didn't, do/does/did)"],
        ["현재진행형", "am/is/are + ~ing"],
        ["There is/are", "~이 있다"],
        ["지시대명사", "this/that/these/those"],
        ["소유격", "my/your/his/her/'s 등"],
        ["can", "능력, 허가/부탁"],
        ["의문사", "What/Who/Where/When/Why/How"],
      ],
      explain: [
        "1회차부터 지금까지 배운 문법을 한 표로 총정리 해봐요. 지난 교재들을 다시 넘겨보며 확인해도 좋아요.",
        "8가지 문법 포인트를 모두 배웠다는 건, 초등 기초 영어 문법 한 사이클을 완성했다는 뜻이에요!",
        "헷갈리는 부분이 있다면 해당 회차 교재를 다시 꺼내서 복습해보세요. 반복이 가장 좋은 공부 방법이에요.",
      ],
      tip: "🎉 축하해요! 정말 많은 문법을 배웠어요. 다음 회차 Review Test로 최종 점검해봐요!",
      examples: [
        { en: "I am confident now.", ko: "나는 이제 자신 있어." },
        { en: "I studied hard and practiced a lot.", ko: "나는 열심히 공부하고 많이 연습했어." },
        { en: "I can make many sentences now!", ko: "나는 이제 많은 문장을 만들 수 있어!" },
      ],
      drill: ["I ___ (am) proud of myself.", "I ___ (practiced) every day.", "I ___ (can) speak more English now."],
      practice: {
        multipleChoice: [
          { q: "I ___ proud of myself.", options: ["am", "is", "are", "be"], answerIndex: 0 },
          { q: "I ___ make many sentences now.", options: ["can", "cans", "am can", "is can"], answerIndex: 0 },
        ],
        secondType: "문장 전환 — 배운 문법으로 바꿔 써 보세요",
        secondItems: [
          { prompt: "You are happy. (의문문으로)", answer: "Are you happy?" },
          { prompt: "I like drawing. (부정문으로)", answer: "I don't like drawing." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (am) proud of myself.", answer: "I am proud of myself." },
        { prompt: "I ___ (practiced) grammar every day.", answer: "I practiced grammar every day." },
        { prompt: "I ___ (can) make many sentences now.", answer: "I can make many sentences now." },
      ],
      wordSentences: ["review", "confident", "achieve"],
      freeWrite: {
        example: "I am proud of myself.",
        prompt: "지금까지 배운 것을 돌아보며 나에게 하는 문장을 자유롭게 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "We finished so many lessons!" },
        { speaker: "새별", line: "Yes! I am so proud of us." },
        { speaker: "새봄", line: "We can make so many sentences now." },
        { speaker: "새별", line: "Let's keep practicing every day!" },
      ],
      roleplay: "지금까지 중 가장 기억에 남는 문법을 서로 이야기해 보세요.",
    },
  },
  {
    id: 36,
    type: "review",
    title: "36회차 · Review Test 6 (31~35회차 · 최종 총정리)",
    covers: "31~35회차 (전체 총정리)",
    recap: [
      ["can", "능력, 허가/부탁"],
      ["의문사", "What/Who/Where/When/Why/How"],
      ["Be동사 + 일반동사", "현재·과거 종합"],
      ["현재진행형 + There is/are", "종합"],
      ["지시대명사 + 소유격", "종합"],
    ],
    multipleChoice: [
      { q: "I ___ ride a bike.", options: ["can", "cans", "is can", "am can"], answerIndex: 0 },
      { q: "He ___ swim. (부정)", options: ["can't", "isn't", "doesn't", "not can"], answerIndex: 0 },
      { q: "___ I borrow your pencil?", options: ["Can", "Do", "Am", "Is"], answerIndex: 0 },
      { q: "___ you help me?", options: ["Can", "Do", "Am", "Is"], answerIndex: 0 },
      { q: "___ is your favorite color?", options: ["What", "Who", "Where", "When"], answerIndex: 0 },
      { q: "___ is your best friend?", options: ["What", "Who", "Where", "When"], answerIndex: 1 },
      { q: "___ is the museum?", options: ["Where", "When", "Why", "How"], answerIndex: 0 },
      { q: "___ are you excited?", options: ["Where", "When", "Why", "How"], answerIndex: 2 },
      { q: "I ___ proud of myself.", options: ["am", "is", "are", "be"], answerIndex: 0 },
      { q: "I ___ make many sentences now.", options: ["can", "cans", "am can", "is can"], answerIndex: 0 },
    ],
    transform: [
      { prompt: "You are happy. (의문문으로)", answer: "Are you happy?" },
      { prompt: "I like drawing. (부정문으로)", answer: "I don't like drawing." },
      { prompt: "(ride / can / I / a / bike) 어순 배열", answer: "I can ride a bike." },
      { prompt: "(I / can / borrow / your / book) 어순 배열", answer: "Can I borrow your book?" },
      { prompt: "(is / favorite / what / your / animal) 어순 배열", answer: "What is your favorite animal?" },
    ],
    freeWrite: { prompt: "36회차 동안 배운 것 중 가장 자신 있는 문법을 하나 골라 문장으로 써 보세요." },
  },
  {
    id: 37,
    title: "37회차 · 전치사 ① (장소 — in/on/at, under/next to/in front of/behind/between)",
    theme: "우리 동네",
    vocab: [
      { word: "library", meaning: "도서관", emoji: "📚" },
      { word: "store", meaning: "가게", emoji: "🏬" },
      { word: "hospital", meaning: "병원", emoji: "🏥" },
      { word: "bank", meaning: "은행", emoji: "🏦" },
      { word: "station", meaning: "역", emoji: "🚉" },
      { word: "bridge", meaning: "다리", emoji: "🌉" },
      { word: "corner", meaning: "모퉁이", emoji: "📐" },
      { word: "street", meaning: "거리", emoji: "🛣️" },
    ],
    grammar: {
      topic: "전치사 ① — 장소 in / on / at, under / next to / in front of / behind / between",
      table: [
        ["in", "(공간) 안에 — in the box, in Seoul"],
        ["on", "(표면) 위에 닿아서 — on the table, on the wall"],
        ["at", "(한 지점) ~에서 — at the door, at school"],
        ["under", "~아래에"],
        ["next to", "~옆에"],
        ["in front of", "~앞에"],
        ["behind", "~뒤에"],
        ["between A and B", "A와 B 사이에"],
      ],
      explain: [
        "전치사는 명사 앞에 붙어서 장소, 위치를 자세히 설명해주는 말이에요. 전치사 뒤에는 항상 명사(또는 대명사)가 와요.",
        "in은 넓은 공간 안, on은 표면에 붙어 있을 때, at은 한 지점을 콕 짚을 때 사용해요. (in the room / on the desk / at the bus stop)",
        "next to, in front of, behind, between처럼 두 단어 이상으로 된 전치사도 있어요. 뜻과 함께 통째로 외워두면 좋아요.",
      ],
      tip: "❗주의: 전치사 뒤에는 반드시 명사가 와요. (on table (X) → on the table (O))",
      examples: [
        { en: "The cat is on the table.", ko: "고양이는 탁자 위에 있어." },
        { en: "The bank is next to the library.", ko: "은행은 도서관 옆에 있어." },
        { en: "It is between the school and the park.", ko: "그것은 학교와 공원 사이에 있어." },
      ],
      drill: ["The ball is ___ (under) the chair.", "The store is ___ (next to) the bank.", "I am ___ (at) school now."],
      practice: {
        multipleChoice: [
          { q: "The book is ___ the table.", options: ["in", "on", "at", "under"], answerIndex: 1 },
          { q: "I am ___ school now.", options: ["in", "on", "at", "under"], answerIndex: 2 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(is / the / cat / under / the / table)", answer: "The cat is under the table." },
          { prompt: "(bank / is / the / next to / the / library)", answer: "The bank is next to the library." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "The park is ___ (in front of) my house.", answer: "The park is in front of my house." },
        { prompt: "The dog is ___ (behind) the door.", answer: "The dog is behind the door." },
        { prompt: "The store is ___ (between) the bank and the station.", answer: "The store is between the bank and the station." },
      ],
      wordSentences: ["library", "hospital", "bridge"],
      freeWrite: {
        example: "The library is next to the park.",
        prompt: "우리 동네에 있는 장소들의 위치를 전치사를 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "Where is the library?" },
        { speaker: "새별", line: "It's next to the park." },
        { speaker: "새봄", line: "Is the bank in front of the station?" },
        { speaker: "새별", line: "No, it's behind the station." },
      ],
      roleplay: "실제 동네 지도를 떠올리며 위치를 묻고 답해보세요.",
    },
  },
  {
    id: 38,
    title: "38회차 · 전치사 ② (시간 — in/on/at)",
    theme: "시간 약속",
    vocab: [
      { word: "morning", meaning: "아침", emoji: "🌅" },
      { word: "afternoon", meaning: "오후", emoji: "☀️" },
      { word: "evening", meaning: "저녁", emoji: "🌆" },
      { word: "night", meaning: "밤", emoji: "🌙" },
      { word: "o'clock", meaning: "정각", emoji: "🕐" },
      { word: "weekday", meaning: "평일", emoji: "📅" },
      { word: "month", meaning: "달(월)", emoji: "🗓️" },
      { word: "appointment", meaning: "약속", emoji: "📌" },
    ],
    grammar: {
      topic: "전치사 ② — 시간 in / on / at",
      table: [
        ["in", "연도, 월, 계절, 아침/오후/저녁 — in 2024, in July, in summer, in the morning"],
        ["on", "요일, 날짜 — on Monday, on July 4th"],
        ["at", "시각, 정오/밤 — at 3 o'clock, at noon, at night"],
      ],
      explain: [
        "시간을 나타낼 때도 in, on, at을 상황에 맞게 구분해서 써요.",
        "큰 단위(연도/월/계절)는 in, 특정 날(요일/날짜)은 on, 정확한 시각은 at을 사용해요 — 시간이 좁아질수록 in→on→at 순서로 기억하면 쉬워요.",
        "예외로 night(밤)은 at night처럼 at을 쓴다는 것도 기억해두세요.",
      ],
      tip: "❗Tip: in(큰 시간) → on(특정 날) → at(정확한 시각) — 범위가 좁아질수록 in→on→at!",
      examples: [
        { en: "I was born in 2016.", ko: "나는 2016년에 태어났어." },
        { en: "We have a party on Saturday.", ko: "우리는 토요일에 파티를 해." },
        { en: "School starts at nine o'clock.", ko: "학교는 아홉 시에 시작해." },
      ],
      drill: ["My birthday is ___ (in) May.", "We have PE ___ (on) Monday.", "I go to bed ___ (at) nine."],
      practice: {
        multipleChoice: [
          { q: "School starts ___ nine o'clock.", options: ["in", "on", "at", "of"], answerIndex: 2 },
          { q: "We have a party ___ Saturday.", options: ["in", "on", "at", "of"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(born / I / in / 2016 / was)", answer: "I was born in 2016." },
          { prompt: "(nine / school / at / starts / o'clock)", answer: "School starts at nine o'clock." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "We have a party ___ (on) Saturday.", answer: "We have a party on Saturday." },
        { prompt: "I go to bed ___ (at) nine.", answer: "I go to bed at nine." },
        { prompt: "My birthday is ___ (in) May.", answer: "My birthday is in May." },
      ],
      wordSentences: ["morning", "weekday", "appointment"],
      freeWrite: {
        example: "School starts at nine o'clock.",
        prompt: "나의 하루 일과나 약속을 시간 전치사를 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "When is your birthday?" },
        { speaker: "새봄", line: "My birthday is in May. When is yours?" },
        { speaker: "새별", line: "Mine is on July 4th!" },
        { speaker: "새봄", line: "Let's have a party at three o'clock!" },
      ],
      roleplay: "진짜 생일이나 약속 시간으로 바꿔서 대화를 다시 해보세요.",
    },
  },
  {
    id: 39,
    title: "39회차 · 문장의 기본 어순 (주어+동사+목적어, 형용사·부사 위치)",
    theme: "문장 만들기 기초",
    vocab: [
      { word: "order", meaning: "순서", emoji: "🔢" },
      { word: "subject", meaning: "주어", emoji: "🙋" },
      { word: "verb", meaning: "동사", emoji: "🏃" },
      { word: "object", meaning: "목적어", emoji: "🎯" },
      { word: "adjective", meaning: "형용사", emoji: "🎨" },
      { word: "adverb", meaning: "부사", emoji: "⚡" },
      { word: "word", meaning: "단어", emoji: "🔤" },
      { word: "meaning", meaning: "뜻", emoji: "💭" },
    ],
    grammar: {
      topic: "문장의 기본 어순 — 주어 + 동사 + 목적어(SVO), 형용사·부사의 위치",
      table: [
        ["기본 어순", "주어(누가) + 동사(한다) + 목적어(무엇을)"],
        ["한국어", "나는 사과를 먹는다 (주어-목적어-동사)"],
        ["영어", "I eat an apple. (주어-동사-목적어)"],
        ["형용사 위치", "명사 바로 앞 — a cute dog"],
        ["부사 위치", "보통 문장 끝 — I run fast."],
      ],
      explain: [
        "한국어는 '나는 사과를 먹는다'처럼 동사가 맨 뒤에 오지만, 영어는 '나는 먹는다 사과를'처럼 동사가 목적어보다 먼저 와요. 이게 영어 어순에서 가장 헷갈리는 부분이에요!",
        "형용사(꾸며주는 말)는 보통 명사 바로 앞에 와요. (a cute dog, a big house)",
        "부사(동작을 꾸며주는 말)는 보통 문장 맨 끝에 와요. (I run fast. She sings well.)",
      ],
      tip: "❗Tip: 영어 문장을 만들 때는 항상 '누가(주어) - 한다(동사) - 무엇을(목적어)' 순서로 생각하는 습관을 들이세요!",
      examples: [
        { en: "I eat an apple.", ko: "나는 사과를 먹어." },
        { en: "She has a cute dog.", ko: "그녀는 귀여운 강아지가 있어." },
        { en: "He runs fast.", ko: "그는 빨리 달려." },
      ],
      drill: ["I ___ (like) pizza. (주어+동사+목적어)", "She has a ___ (cute) cat. (형용사 위치)", "He speaks English ___ (well). (부사 위치)"],
      practice: {
        multipleChoice: [
          { q: "다음 중 올바른 어순은?", options: ["Apple I eat.", "I apple eat.", "I eat an apple.", "Eat I an apple."], answerIndex: 2 },
          { q: "다음 중 형용사 위치가 올바른 것은?", options: ["a dog cute", "a cute dog", "cute a dog", "dog a cute"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(a / have / book / I)", answer: "I have a book." },
          { prompt: "(fast / runs / he)", answer: "He runs fast." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "(pizza / I / like) → 올바른 어순으로 쓰세요", answer: "I like pizza." },
        { prompt: "(has / dog / a / she / cute) → 올바른 어순으로 쓰세요", answer: "She has a cute dog." },
        { prompt: "(sings / she / well) → 올바른 어순으로 쓰세요", answer: "She sings well." },
      ],
      wordSentences: ["order", "subject", "adjective"],
      freeWrite: {
        example: "I eat an apple.",
        prompt: "주어+동사+목적어 순서를 생각하며 나만의 문장을 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "I eat an apple every day." },
        { speaker: "새별", line: "I like pizza. Do you like pizza, too?" },
        { speaker: "새봄", line: "Yes! I like pizza a lot." },
        { speaker: "새별", line: "Let's eat pizza together!" },
      ],
      roleplay: "실제 좋아하는 음식으로 바꿔서 주어+동사+목적어 순서로 말해보세요.",
    },
  },
  {
    id: 40,
    title: "40회차 · 빈도부사 (always/usually/often/sometimes/never)",
    theme: "얼마나 자주",
    vocab: [
      { word: "always", meaning: "항상", emoji: "💯" },
      { word: "usually", meaning: "보통", emoji: "🔁" },
      { word: "often", meaning: "자주", emoji: "🔂" },
      { word: "sometimes", meaning: "가끔", emoji: "🤔" },
      { word: "never", meaning: "절대 ~않다", emoji: "🚫" },
      { word: "everyday", meaning: "매일의", emoji: "📆" },
      { word: "rarely", meaning: "거의 ~않다", emoji: "🌦️" },
      { word: "schedule", meaning: "일정", emoji: "🗓️" },
    ],
    grammar: {
      topic: "빈도부사 — always / usually / often / sometimes / never",
      table: [
        ["100%", "always (항상)"],
        ["90%", "usually (보통)"],
        ["70%", "often (자주)"],
        ["50%", "sometimes (가끔)"],
        ["0%", "never (절대 ~않다)"],
      ],
      explain: [
        "빈도부사는 '얼마나 자주 하는지'를 나타내는 말이에요. always(항상)부터 never(절대 안 함)까지 빈도 순서로 정리하면 외우기 쉬워요.",
        "be동사가 있는 문장에서는 be동사 뒤에 빈도부사를 써요. (I am always happy.)",
        "일반동사가 있는 문장에서는 일반동사 앞에 빈도부사를 써요. (I always eat breakfast.)",
      ],
      tip: "❗주의: I always am happy (X) → I am always happy (O) — be동사는 빈도부사보다 먼저!",
      examples: [
        { en: "I am always happy.", ko: "나는 항상 행복해." },
        { en: "She usually eats breakfast.", ko: "그녀는 보통 아침을 먹어." },
        { en: "He never lies.", ko: "그는 절대 거짓말을 안 해." },
      ],
      drill: ["I ___ (always) brush my teeth.", "She is ___ (usually) busy.", "He ___ (never) cries."],
      practice: {
        multipleChoice: [
          { q: "I ___ eat breakfast. (매일)", options: ["always eat", "eat always", "am always", "always am"], answerIndex: 0 },
          { q: "She ___ tired. (보통, be동사문)", options: ["usually is", "is usually", "is be usually", "usually be"], answerIndex: 1 },
        ],
        secondType: "어순 배열 — 괄호 안 단어를 바르게 배열하세요",
        secondItems: [
          { prompt: "(happy / always / I / am)", answer: "I am always happy." },
          { prompt: "(eats / she / breakfast / usually)", answer: "She usually eats breakfast." },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I ___ (always) brush my teeth.", answer: "I always brush my teeth." },
        { prompt: "She ___ (never) lies.", answer: "She never lies." },
        { prompt: "He ___ (sometimes) plays soccer.", answer: "He sometimes plays soccer." },
      ],
      wordSentences: ["usually", "often", "rarely"],
      freeWrite: {
        example: "I always brush my teeth.",
        prompt: "내가 얼마나 자주 하는 일을 빈도부사를 사용해서 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새별", line: "Do you always eat breakfast?" },
        { speaker: "새봄", line: "Yes, I always eat breakfast. Do you?" },
        { speaker: "새별", line: "I usually eat breakfast, but sometimes I don't." },
        { speaker: "새봄", line: "You should eat breakfast every day!" },
      ],
      roleplay: "실제 자기 습관으로 바꿔서 빈도부사를 사용해 대화를 다시 해보세요.",
    },
  },
  {
    id: 41,
    title: "41회차 · 명사의 복수형 + 관사 a/an/the",
    theme: "하나 vs 여러 개",
    vocab: [
      { word: "apple", meaning: "사과", emoji: "🍎" },
      { word: "box", meaning: "상자", emoji: "📦" },
      { word: "city", meaning: "도시", emoji: "🏙️" },
      { word: "baby", meaning: "아기", emoji: "👶" },
      { word: "leaf", meaning: "나뭇잎", emoji: "🍃" },
      { word: "tooth", meaning: "이(치아)", emoji: "🦷" },
      { word: "child", meaning: "아이", emoji: "🧒" },
      { word: "foot", meaning: "발", emoji: "🦶" },
    ],
    grammar: {
      topic: "명사의 복수형 + 관사 a / an / the",
      table: [
        ["대부분 명사", "+s (apples, books)"],
        ["s/x/ch/sh로 끝나는 명사", "+es (boxes, buses, dishes)"],
        ["자음+y로 끝나는 명사", "y를 i로 바꾸고 +es (city→cities, baby→babies)"],
        ["불규칙 복수형", "child→children, foot→feet, tooth→teeth"],
        ["a / an", "처음 언급하는 하나 (자음 앞 a, 모음 앞 an)"],
        ["the", "이미 언급했거나 특정한 것"],
      ],
      explain: [
        "명사가 하나면 단수, 둘 이상이면 복수라고 해요. 복수형은 보통 명사 끝에 s를 붙여서 만들어요.",
        "s/x/ch/sh로 끝나면 es를 붙이고(box→boxes), 자음+y로 끝나면 y를 i로 바꾸고 es를 붙여요(city→cities). child→children처럼 모양이 완전히 바뀌는 불규칙 복수형도 있어요.",
        "관사 a/an은 '하나의'라는 뜻으로 처음 등장하는 명사 앞에, the는 '그것'이라는 뜻으로 이미 알고 있는 특정한 명사 앞에 써요. a 뒤엔 자음 발음, an 뒤엔 모음 발음이 와요.",
      ],
      tip: "❗주의: a apple (X) → an apple (O) — apple은 모음 소리로 시작하니 an을 써요!",
      examples: [
        { en: "I have two apples.", ko: "나는 사과 두 개가 있어." },
        { en: "There are three boxes.", ko: "상자가 세 개 있어." },
        { en: "I see a cat. The cat is cute.", ko: "나는 고양이를 봐. 그 고양이는 귀여워." },
      ],
      drill: ["I have two ___ (box → boxes).", "She has three ___ (city → cities).", "I have ___ (a/an) umbrella."],
      practice: {
        multipleChoice: [
          { q: "I have two ___. (box)", options: ["box", "boxs", "boxes", "boxies"], answerIndex: 2 },
          { q: "I have ___ umbrella.", options: ["a", "an", "the", "-"], answerIndex: 1 },
        ],
        secondType: "형태 바꾸기 — 단수 명사를 복수형으로 바꿔 써 보세요",
        secondItems: [
          { prompt: "city", answer: "cities" },
          { prompt: "child", answer: "children" },
        ],
      },
    },
    writing: {
      sentenceCompletion: [
        { prompt: "I have two ___ (apple → apples).", answer: "I have two apples." },
        { prompt: "There are three ___ (baby → babies).", answer: "There are three babies." },
        { prompt: "I see ___ (a/an) elephant.", answer: "I see an elephant." },
      ],
      wordSentences: ["leaf", "tooth", "child"],
      freeWrite: {
        example: "I have two apples.",
        prompt: "복수형 명사를 사용해서 내가 가진 물건을 세어 써 보세요.",
      },
    },
    speaking: {
      dialogue: [
        { speaker: "새봄", line: "How many apples do you have?" },
        { speaker: "새별", line: "I have three apples. How about you?" },
        { speaker: "새봄", line: "I have two apples and an orange." },
        { speaker: "새별", line: "Let's share!" },
      ],
      roleplay: "실제 가지고 있는 물건 개수로 바꿔서 복수형을 사용해 대화를 다시 해보세요.",
    },
  },
  {
    id: 42,
    type: "review",
    title: "42회차 · Review Test 7 (37~41회차 총정리)",
    covers: "37~41회차",
    recap: [
      ["in/on/at, under/next to/in front of/behind/between", "전치사① 장소"],
      ["in/on/at (시간)", "전치사② 시간"],
      ["주어+동사+목적어(SVO), 형용사·부사 위치", "문장의 기본 어순"],
      ["always/usually/often/sometimes/never", "빈도부사 위치"],
      ["-s/-es 복수형, a/an/the", "명사와 관사"],
    ],
    multipleChoice: [
      { q: "The book is ___ the table.", options: ["in", "on", "at", "under"], answerIndex: 1 },
      { q: "I am ___ school now.", options: ["in", "on", "at", "under"], answerIndex: 2 },
      { q: "We have a party ___ Saturday.", options: ["in", "on", "at", "of"], answerIndex: 1 },
      { q: "School starts ___ nine o'clock.", options: ["in", "on", "at", "of"], answerIndex: 2 },
      { q: "다음 중 올바른 어순은?", options: ["Apple I eat.", "I apple eat.", "I eat an apple.", "Eat I an apple."], answerIndex: 2 },
      { q: "다음 중 형용사 위치가 올바른 것은?", options: ["a dog cute", "a cute dog", "cute a dog", "dog a cute"], answerIndex: 1 },
      { q: "I ___ eat breakfast. (매일)", options: ["always eat", "eat always", "am always", "always am"], answerIndex: 0 },
      { q: "She ___ tired. (보통)", options: ["usually is", "is usually", "is be usually", "usually be"], answerIndex: 1 },
      { q: "I have two ___. (box)", options: ["box", "boxs", "boxes", "boxies"], answerIndex: 2 },
      { q: "I have ___ umbrella.", options: ["a", "an", "the", "-"], answerIndex: 1 },
    ],
    transform: [
      { prompt: "(is / the / cat / under / the / table) 어순 배열", answer: "The cat is under the table." },
      { prompt: "(born / I / in / 2016 / was) 어순 배열", answer: "I was born in 2016." },
      { prompt: "(a / have / book / I) 어순 배열", answer: "I have a book." },
      { prompt: "(happy / always / I / am) 어순 배열", answer: "I am always happy." },
      { prompt: "city 형태 바꾸기 (복수형)", answer: "cities" },
    ],
    freeWrite: { prompt: "37~41회차에서 배운 문법(전치사·어순·빈도부사·복수형) 중 하나를 사용해서 나만의 문장을 2개 써 보세요." },
  },
];
