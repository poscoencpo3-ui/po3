import { useState } from 'react'

const RECENT_KEY = 'po3.recentEmoji'

const GROUPS = [
  { name: '현장', items: '👷 🦺 ⛑️ 🚧 🏗️ 🚜 🚛 🏚️ 🔨 🔧 🪛 ⚒️ 🪚 🧱 🪜 📐 📏 🔩 ⚙️ 🧰 🔥 💧 ⚡ ⚠️ 🚨 🛑 ✅ ❌ ⭕ ❗ ❓ 📋 📝 📌 📎 📅 ⏰ 📷 📞 🚑 🧯'.split(' ') },
  { name: '표정', items: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😜 🤗 🤭 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 😴 😷 🤒 🥵 🥶 😵 🤯 😎 🧐 😕 😟 😮 😲 😳 🥺 😢 😭 😱 😖 😣 😞 😓 😩 😫 😤 😡 🤬'.split(' ') },
  { name: '손', items: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🤝 🙏 💪 ✍️ 🫡 🙇 🙆 🙅 🤷 🙋'.split(' ') },
  { name: '날씨', items: '☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ 🌬️ 💨 🌪️ 🌫️ 🌈 ☔ 🌡️ 🌙 ⭐'.split(' ') },
  { name: '기호', items: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 💢 💥 💫 💦 💤 🎉 🎊 🎁 🏆 🥇 🔔 📢 💡 🔑 💰 ⏳ ⌛ ➡️ ⬅️ ⬆️ ⬇️ 🔄 🆗 🆕 🆘'.split(' ') },
  { name: '음식', items: '☕ 🍵 🥤 🍺 🍻 🍚 🍜 🍲 🍱 🍙 🍗 🍖 🥩 🍕 🍔 🍞 🍰 🍎 🍉 🍊'.split(' ') },
]

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || []
  } catch {
    return []
  }
}

export default function EmojiPanel({ onPick }) {
  const [recent, setRecent] = useState(loadRecent)
  const groups = recent.length ? [{ name: '최근', items: recent }, ...GROUPS] : GROUPS
  const [tab, setTab] = useState(groups[0].name)
  const current = groups.find((g) => g.name === tab) || groups[0]

  function pick(emoji) {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 24)
    setRecent(next)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // 저장이 안 돼도 이모티콘 입력은 계속
    }
    onPick(emoji)
  }

  return (
    <div className="emoji-panel">
      <div className="emoji-tabs">
        {groups.map((g) => (
          <button key={g.name} className={g.name === current.name ? 'active' : ''} onClick={() => setTab(g.name)}>
            {g.name}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {current.items.map((e) => (
          <button key={e} onClick={() => pick(e)} aria-label={e}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
