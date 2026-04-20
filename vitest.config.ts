import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/lib/**',
        'src/services/**',
        'src/app/api/proxy/**',
        'src/app/api/audit-log/**',
        'src/components/ui/**',
      ],
      exclude: [
        '**/*.d.ts',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
