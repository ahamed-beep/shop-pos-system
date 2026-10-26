import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url';

// NEW: Define __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({

  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      // Set up the alias for 'src'
      // This allows you to import 'Components/Navbar.jsx' instead of './src/Components/Navbar.jsx'
      '@': path.resolve(__dirname, './src'), // A common convention is to use '@' as the alias for src
      // Or if you want 'src' itself to be the base (no prefix like '@')
      // You can define aliases for specific subdirectories too:
      'Components': path.resolve(__dirname, './src/components'),
      'Pages': path.resolve(__dirname, './src/pages'),
      'Dashboard': path.resolve(__dirname, './src/Dashboard'),
      'Redux': path.resolve(__dirname, './src/Redux'),
      'utils': path.resolve(__dirname, './src/utils'),
      'axiosConfig': path.resolve(__dirname, './src/axios/axios.js'), // Example for a specific file alias
      // ... add other top-level folders in 'src' as needed
    },
  }
})
