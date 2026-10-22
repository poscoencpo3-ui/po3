import { avatarColor } from '../lib/format'

export default function Avatar({ name = '', seed, size = 38, square = false, color }) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: color || avatarColor(seed || name),
        borderRadius: square ? size * 0.36 : '50%',
      }}
    >
      {name.trim().slice(0, 1)}
    </div>
  )
}
