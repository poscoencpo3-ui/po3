import { useEffect, useState } from 'react'

// 해시 주소 (#/room/abc) 기반의 간단한 라우터
function parse() {
  const [name, id] = location.hash.replace(/^#\/?/, '').split('/')
  return { name: name || 'home', id: id ? decodeURIComponent(id) : null }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(path = '') {
  location.hash = '#/' + path
}
