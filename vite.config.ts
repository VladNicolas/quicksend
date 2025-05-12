import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? 'https://quicksend-backend-service-627959729856.us-central1.run.app'
          : 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
