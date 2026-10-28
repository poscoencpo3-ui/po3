import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 배포할 때마다 바뀌는 버전. 화면은 /version.json 과 비교해서 새 버전이 나온 것을 알아챔
const version = new Date().toISOString()

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    {
      name: 'version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
      },
    },
  ],
})
