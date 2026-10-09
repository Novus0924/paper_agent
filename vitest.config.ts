import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'fast',
          include: ['apps/bff/test/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
})
