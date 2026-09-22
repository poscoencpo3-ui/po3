/* 자동 생성기 로직: 학생 선택, 진도 관리(localStorage), 회차 교재 렌더링, 인쇄 */

const STUDENTS = {
  saebom: { name: "새봄", data: CURRICULUM_SAEBOM, kind: "elementary" },
  saebyul: { name: "새별", data: CURRICULUM_SAEBYUL, kind: "kinder" },
};

const PROGRESS_KEY = "po3-progress";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { saebom: 0, saebyul: 0 };
  } catch (e) {
    return { saebom: 0, saebyul: 0 };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    /* localStorage 사용 불가 시 진도는 화면에서만 유지됩니다 */
  }
}

let progress = loadProgress();
let currentStudent = "saebom";
let currentChapterIndex = 0;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function renderProgressList() {
  const wrap = document.getElementById("chapterList");
  const student = STUDENTS[currentStudent];
  wrap.innerHTML = student.data
    .map((ch, i) => {
      const done = i < progress[currentStudent];
      const isNext = i === progress[currentStudent];
      return `<button class="chip ${done ? "done" : ""} ${isNext ? "next" : ""}" data-idx="${i}">
        ${done ? "✅" : isNext ? "▶" : "🔒"} ${ch.title}
      </button>`;
    })
    .join("");
  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentChapterIndex = Number(btn.dataset.idx);
      renderWorksheet();
    });
  });
}

function switchStudent(key) {
  currentStudent = key;
  currentChapterIndex = Math.min(progress[key], STUDENTS[key].data.length - 1);
  document.querySelectorAll(".student-tab").forEach((b) => b.classList.toggle("active", b.dataset.student === key));
  renderProgressList();
  renderWorksheet();
}

function markComplete() {
  const student = STUDENTS[currentStudent];
  if (currentChapterIndex >= progress[currentStudent]) {
    progress[currentStudent] = Math.min(currentChapterIndex + 1, student.data.length);
    saveProgress(progress);
    renderProgressList();
    renderWorksheet();
  }
}

function vocabGridHTML(vocab) {
  return `<div class="vocab-grid">
    ${vocab
      .map(
        (v) => `<div class="vocab-card">
          <div class="vocab-emoji">${v.emoji}</div>
          <div class="vocab-word">${v.word}</div>
          <div class="vocab-meaning">${v.meaning}</div>
        </div>`
      )
      .join("")}
  </div>`;
}

function renderSaebomWorksheet(chapter) {
  return `
  <section class="sheet">
    <header class="sheet-header">
      <div class="sheet-avatar">${saebomAvatar(64)}</div>
      <div>
        <h1>새봄이의 영어 교실</h1>
        <p class="sheet-sub">${chapter.title} &middot; ${chapter.theme}</p>
      </div>
      <div class="sheet-date">날짜: ______ 월 ______ 일</div>
    </header>

    <section class="block">
      <h2>📚 오늘의 단어</h2>
      ${vocabGridHTML(chapter.vocab)}
    </section>

    <section class="block">
      <h2>✏️ 오늘의 문법 &mdash; ${chapter.grammar.topic}</h2>
      <table class="grammar-table">
        <tbody>
          ${chapter.grammar.table.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`).join("")}
        </tbody>
      </table>
      <p class="examples">${chapter.grammar.examples.join(" &nbsp;/&nbsp; ")}</p>
      <p class="drill-title">빈칸 채우기</p>
      <ol class="drill-list">
        ${chapter.grammar.drill.map((d) => `<li>${d}</li>`).join("")}
      </ol>
    </section>

    <section class="block">
      <h2>📝 한 문장 쓰기</h2>
      <p class="writing-example">예문: <em>${chapter.writing.example}</em></p>
      <p class="writing-prompt">${chapter.writing.prompt}</p>
      <div class="write-line"></div>
      <div class="write-line"></div>
    </section>

    <section class="block">
      <h2>💬 오늘의 회화 &amp; 롤플레이</h2>
      <div class="speech-wrap">
        ${chapter.speaking.dialogue.map((d) => speechLineHTML(d.speaker, d.line)).join("")}
      </div>
      <p class="roleplay-note">🎭 ${chapter.speaking.roleplay}</p>
    </section>

    <footer class="sheet-footer">
      <span>오늘도 잘했어요! 🌟</span>
      <span>부모님 확인: ______________</span>
    </footer>
  </section>`;
}

function renderSaebyulWorksheet(chapter) {
  return `
  <section class="sheet">
    <header class="sheet-header">
      <div class="sheet-avatar">${saebyulAvatar(64)}</div>
      <div>
        <h1>새별이의 영어 교실</h1>
        <p class="sheet-sub">${chapter.title}</p>
      </div>
      <div class="sheet-date">날짜: ______ 월 ______ 일</div>
    </header>

    <section class="block">
      <h2>🔤 오늘의 파닉스</h2>
      <div class="phonics-grid">
        ${chapter.phonics
          .map(
            (p) => `<div class="phonics-card">
              <div class="phonics-letter">${p.letter}</div>
              <div class="phonics-emoji">${p.emoji}</div>
              <div class="phonics-word">${p.word}</div>
              <div class="phonics-sound">소리: [${p.sound}]</div>
            </div>`
          )
          .join("")}
      </div>
    </section>

    <section class="block">
      <h2>✍️ 알파벳 따라쓰기</h2>
      <div class="tracing-row">
        ${chapter.tracing.map((l) => `<span class="trace-letter">${l}</span>`).join("")}
      </div>
      <div class="write-line"></div>
      <div class="write-line"></div>
    </section>

    <section class="block">
      <h2>🖍️ 그림 보고 단어 찾기</h2>
      <div class="matching-grid">
        ${chapter.matching.items
          .map(
            (m) => `<div class="matching-card">
              <div class="matching-emoji">${m.emoji}</div>
              <div class="matching-options">
                ${m.options.map((o) => `<span class="option-circle">${o}</span>`).join("")}
              </div>
            </div>`
          )
          .join("")}
      </div>
      <p class="matching-note">${chapter.matching.instruction}</p>
    </section>

    <section class="block">
      <h2>🎵 듣고 따라 말하기</h2>
      <p class="chant">${chapter.speaking.chant}</p>
      <div class="speech-wrap">
        ${chapter.speaking.dialogue.map((d) => speechLineHTML(d.speaker, d.line)).join("")}
      </div>
      <p class="roleplay-note">🎧 ${chapter.speaking.instruction}</p>
    </section>

    <footer class="sheet-footer">
      <span>오늘도 잘했어요! 🌟</span>
      <span>부모님 확인: ______________</span>
    </footer>
  </section>`;
}

function renderWorksheet() {
  const student = STUDENTS[currentStudent];
  const chapter = student.data[currentChapterIndex];
  const container = document.getElementById("worksheet");
  container.innerHTML = currentStudent === "saebom" ? renderSaebomWorksheet(chapter) : renderSaebyulWorksheet(chapter);

  document.getElementById("completeBtn").textContent =
    currentChapterIndex < progress[currentStudent] ? "✅ 완료된 회차입니다" : "이 회차 완료 표시하기";
  document.getElementById("completeBtn").disabled = currentChapterIndex < progress[currentStudent];
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".student-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchStudent(btn.dataset.student));
  });
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("completeBtn").addEventListener("click", markComplete);
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("정말 진도를 처음부터 다시 시작할까요?")) {
      progress[currentStudent] = 0;
      saveProgress(progress);
      currentChapterIndex = 0;
      renderProgressList();
      renderWorksheet();
    }
  });

  switchStudent("saebom");
});
