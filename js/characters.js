/* 새봄이 · 새별이 캐릭터 SVG (인쇄 시에도 선명하도록 순수 벡터로 제작)
   새봄이 = 긴 생머리 (큰아이), 새별이 = 양갈래 땋은머리 (작은아이) — 실제 사진 특징을 참고해 디자인 */

const HAIR = "#3A2A1E";

function saebomAvatar(size) {
  size = size || 56;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#FFE3EC"/>
    <!-- 긴 생머리 (어깨 아래까지) -->
    <path d="M50 12 C26 12 16 34 17 58 C17.6 76 22 90 27 98 L35 98 C30 88 26 74 26 56 C26 34 34 20 50 20 C66 20 74 34 74 56 C74 74 70 88 65 98 L73 98 C78 90 82.4 76 83 58 C84 34 74 12 50 12 Z" fill="${HAIR}"/>
    <circle cx="50" cy="54" r="26" fill="#FFDCC2"/>
    <path d="M24 48 C24 30 76 30 76 48 L76 40 C76 26 24 26 24 40 Z" fill="${HAIR}"/>
    <circle cx="41" cy="55" r="3.2" fill="#3B2A20"/>
    <circle cx="59" cy="55" r="3.2" fill="#3B2A20"/>
    <circle cx="34" cy="60" r="4" fill="#FFB3C6" opacity="0.7"/>
    <circle cx="66" cy="60" r="4" fill="#FFB3C6" opacity="0.7"/>
    <path d="M42 65 Q50 71 58 65" stroke="#B5563C" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 32 L68 26 L64 36 Z" fill="#FF7FA6"/>
    <path d="M30 84 C30 74 70 74 70 84 L70 96 L30 96 Z" fill="#FF7FA6"/>
  </svg>`;
}

function saebyulAvatar(size) {
  size = size || 56;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#DFF6EE"/>
    <!-- 양갈래 땋은머리 -->
    <path d="M22 42 C13 52 12 72 19 88 C21 91 27 91 25 87 C19 74 19 56 27 45 Z" fill="${HAIR}"/>
    <path d="M78 42 C87 52 88 72 81 88 C79 91 73 91 75 87 C81 74 81 56 73 45 Z" fill="${HAIR}"/>
    <line x1="18" y1="60" x2="26" y2="58" stroke="#2A1D14" stroke-width="1.6"/>
    <line x1="18" y1="70" x2="26" y2="68" stroke="#2A1D14" stroke-width="1.6"/>
    <line x1="74" y1="58" x2="82" y2="60" stroke="#2A1D14" stroke-width="1.6"/>
    <line x1="74" y1="68" x2="82" y2="70" stroke="#2A1D14" stroke-width="1.6"/>
    <circle cx="20" cy="88" r="4.5" fill="#FF9EBB"/>
    <circle cx="80" cy="88" r="4.5" fill="#FF9EBB"/>
    <circle cx="50" cy="56" r="25" fill="#FFDCC2"/>
    <path d="M25 50 C25 28 75 28 75 50 L75 38 C75 24 25 24 25 38 Z" fill="${HAIR}"/>
    <circle cx="41" cy="57" r="3.4" fill="#3B2A20"/>
    <circle cx="59" cy="57" r="3.4" fill="#3B2A20"/>
    <circle cx="34" cy="62" r="4.2" fill="#FFC3B0" opacity="0.7"/>
    <circle cx="66" cy="62" r="4.2" fill="#FFC3B0" opacity="0.7"/>
    <path d="M38 66 Q50 76 62 66" stroke="#B5563C" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M28 82 C28 70 72 70 72 82 L72 92 L28 92 Z" fill="#4FD1A5"/>
  </svg>`;
}

/* 대화문에서 화자 이름에 맞는 아바타 + 말풍선 한 줄을 렌더링 */
function speechLineHTML(speaker, line) {
  const isSaebom = speaker === "새봄";
  const avatar = isSaebom ? saebomAvatar(40) : speaker === "새별" ? saebyulAvatar(40) : "";
  return `
    <div class="speech-row ${isSaebom ? "left" : "right"}">
      ${avatar ? `<div class="speech-avatar">${avatar}</div>` : ""}
      <div class="speech-bubble">
        <span class="speech-name">${speaker}</span>
        <span class="speech-text">${line}</span>
      </div>
    </div>`;
}
