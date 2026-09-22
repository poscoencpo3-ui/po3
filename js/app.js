/* 자동 생성기 로직: 학생 선택, 진도/인쇄 이력 관리(localStorage), 현황판, 회차 교재 렌더링, 인쇄 */

const STUDENTS = {
  saebom: { name: "새봄", data: CURRICULUM_SAEBOM, kind: "elementary" },
  saebyul: { name: "새별", data: CURRICULUM_SAEBYUL, kind: "kinder" },
};

const PROGRESS_KEY = "po3-progress-v2";

function emptyProgress() {
  return { saebom: {}, saebyul: {} };
}

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (raw && typeof raw.saebom === "object" && typeof raw.saebyul === "object") return raw;
    return emptyProgress();
  } catch (e) {
    return emptyProgress();
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

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function chapterRecord(studentKey, chapterId) {
  return progress[studentKey][chapterId] || {};
}

function nextChapterIndex(studentKey) {
  const data = STUDENTS[studentKey].data;
  const idx = data.findIndex((ch) => !chapterRecord(studentKey, ch.id).completedAt);
  return idx === -1 ? data.length - 1 : idx;
}

function renderDashboard() {
  const student = STUDENTS[currentStudent];
  const nextIdx = nextChapterIndex(currentStudent);

  const past = [];
  const upcoming = [];
  student.data.forEach((ch, i) => {
    const rec = chapterRecord(currentStudent, ch.id);
    if (i === nextIdx) return;
    if (rec.completedAt) past.push({ ch, i, rec });
    else upcoming.push({ ch, i, rec });
  });

  const pastList = document.getElementById("pastList");
  const upcomingList = document.getElementById("upcomingList");
  const todayCard = document.getElementById("todayCard");

  pastList.innerHTML =
    past
      .map(
        ({ ch, i, rec }) => `
      <button class="dash-item done" data-idx="${i}">
        <span class="dash-item-title">✅ ${ch.title}</span>
        <span class="dash-item-meta">완료 ${fmtDate(rec.completedAt)}${rec.printedAt ? " · 🖨️ 인쇄함" : ""}</span>
      </button>`
      )
      .join("") || `<p class="dash-empty">아직 완료한 회차가 없어요.</p>`;

  upcomingList.innerHTML =
    upcoming
      .map(
        ({ ch, i }) => `
      <button class="dash-item locked" data-idx="${i}">
        <span class="dash-item-title">🔒 ${ch.title}</span>
      </button>`
      )
      .join("") || `<p class="dash-empty">모든 회차를 완료했어요! 🎉</p>`;

  const nextCh = student.data[nextIdx];
  const nextRec = chapterRecord(currentStudent, nextCh.id);
  todayCard.innerHTML = `
    <button class="dash-item today" data-idx="${nextIdx}">
      <span class="dash-item-title">▶ ${nextCh.title}</span>
      <span class="dash-item-meta">${nextRec.printedAt ? "🖨️ " + fmtDate(nextRec.printedAt) + "에 인쇄함 (다시 인쇄 가능)" : "아직 진행 전이에요"}</span>
    </button>`;

  document.querySelectorAll(".dash-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentChapterIndex = Number(btn.dataset.idx);
      renderWorksheet();
      document.getElementById("worksheet").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function switchStudent(key) {
  currentStudent = key;
  currentChapterIndex = nextChapterIndex(key);
  document.querySelectorAll(".student-tab").forEach((b) => b.classList.toggle("active", b.dataset.student === key));
  renderDashboard();
  renderWorksheet();
}

function markComplete() {
  const student = STUDENTS[currentStudent];
  const chapterId = student.data[currentChapterIndex].id;
  const rec = chapterRecord(currentStudent, chapterId);
  rec.completedAt = new Date().toISOString();
  progress[currentStudent][chapterId] = rec;
  saveProgress(progress);
  currentChapterIndex = nextChapterIndex(currentStudent);
  renderDashboard();
  renderWorksheet();
}

function markPrinted() {
  const student = STUDENTS[currentStudent];
  const chapterId = student.data[currentChapterIndex].id;
  const rec = chapterRecord(currentStudent, chapterId);
  rec.printedAt = new Date().toISOString();
  progress[currentStudent][chapterId] = rec;
  saveProgress(progress);
  renderDashboard();
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
  const rec = chapterRecord(currentStudent, chapter.id);
  const container = document.getElementById("worksheet");
  container.innerHTML = currentStudent === "saebom" ? renderSaebomWorksheet(chapter) : renderSaebyulWorksheet(chapter);

  const completeBtn = document.getElementById("completeBtn");
  completeBtn.textContent = rec.completedAt ? "✅ 완료된 회차입니다" : "이 회차 완료 표시하기";
  completeBtn.disabled = Boolean(rec.completedAt);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".student-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchStudent(btn.dataset.student));
  });
  document.getElementById("printBtn").addEventListener("click", () => {
    markPrinted();
    window.print();
  });
  document.getElementById("completeBtn").addEventListener("click", markComplete);
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("정말 진도와 인쇄 기록을 처음부터 다시 시작할까요?")) {
      progress[currentStudent] = {};
      saveProgress(progress);
      currentChapterIndex = 0;
      renderDashboard();
      renderWorksheet();
    }
  });

  switchStudent("saebom");
});
