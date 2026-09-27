import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
