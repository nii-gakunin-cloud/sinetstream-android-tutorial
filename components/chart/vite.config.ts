// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import compression from 'vite-plugin-compression'
import { devMockSensorData } from './src/dev-mock-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), compression(), devMockSensorData()],
  server: {
    host: '0.0.0.0',
    proxy: process.env.VITE_SENSOR_DATA_URL
      ? {
          '/sensor-data/': {
            target: process.env.VITE_SENSOR_DATA_URL,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/sensor-data\//, '/'),
          },
        }
      : undefined,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    passWithNoTests: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
  resolve: {
    conditions: ['browser'],
  },
})
