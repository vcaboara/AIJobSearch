import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend service is named 'backend' in the docker-compose.yml,
// and it runs on port 8000 inside the Docker network.
const backendUrl = 'http://backend:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    // We explicitly tell Vite to proxy all /api/ requests
    // to the backend service *inside* the Docker network.
    proxy: {
      // Proxy requests starting with /api
      '/api': {
        target: backendUrl,
        changeOrigin: true, // Needed for virtual hosting
        // The rewrite is optional, but if your backend expects /api/analyze, leave it out.
        // If your backend only defines /analyze, you would use: rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    // Required to run inside the Docker container
    host: '0.0.0.0',
    port: 5173,
  }
});
