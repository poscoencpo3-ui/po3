/* 새봄이 · 새별이 캐릭터 SVG (인쇄 시에도 선명하도록 순수 벡터로 제작) */

function saebomAvatar(size) {
  size = size || 56;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#FFE3EC"/>
    <path d="M20 46 C20 20 80 20 80 46 L80 60 C80 66 74 66 74 60 L74 50 C74 34 26 34 26 50 L26 60 C26 66 20 66 20 60 Z" fill="#6B4630"/>
    <circle cx="50" cy="54" r="26" fill="#FFDCC2"/>
    <path d="M24 48 C24 30 76 30 76 48 L76 40 C76 26 24 26 24 40 Z" fill="#6B4630"/>
    <circle cx="41" cy="55" r="3.2" fill="#3B2A20"/>
    <circle cx="59" cy="55" r="3.2" fill="#3B2A20"/>
    <circle cx="34" cy="60" r="4" fill="#FFB3C6" opacity="0.7"/>
    <circle cx="66" cy="60" r="4" fill="#FFB3C6" opacity="0.7"/>
    <path d="M42 65 Q50 71 58 65" stroke="#B5563C" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M60 32 L68 26 L64 36 Z" fill="#FF7FA6"/>
    <path d="M30 80 C30 68 70 68 70 80 L70 92 L30 92 Z" fill="#FF7FA6"/>
  </svg>`;
}

function saebyulAvatar(size) {
  size = size || 56;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#DFF6EE"/>
    <circle cx="14" cy="52" r="9" fill="#5B3A29"/>
    <circle cx="86" cy="52" r="9" fill="#5B3A29"/>
    <circle cx="50" cy="56" r="25" fill="#FFDCC2"/>
    <path d="M25 50 C25 28 75 28 75 50 L75 38 C75 24 25 24 25 38 Z" fill="#5B3A29"/>
    <circle cx="41" cy="57" r="3.4" fill="#3B2A20"/>
    <circle cx="59" cy="57" r="3.4" fill="#3B2A20"/>
    <circle cx="34" cy="62" r="4.2" fill="#FFC3B0" opacity="0.7"/>
    <circle cx="66" cy="62" r="4.2" fill="#FFC3B0" opacity="0.7"/>
    <path d="M40 67 Q50 74 60 67" stroke="#B5563C" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="30" r="5" fill="#FFD23F"/>
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
