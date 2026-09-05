import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: { port: 5173 },
  // Garante que os pacotes CommonJS do React resolvam a build de produção no bundle final.
  define: {
    'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development'),
  },
}))
