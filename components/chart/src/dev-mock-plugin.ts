// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

/**
 * Vite dev server plugin: /sensor-data/ に対してダミーのセンサーデータを返す。
 * npm run dev 時のみ有効。ビルド成果物には含まれない。
 * キーは Hive パーティション形式（UTC）で生成される。
 */
import type { Plugin } from 'vite';

const NUM_POINTS = 30;
const INTERVAL_SEC = 60;
const MOCK_TOPIC = 'sensor-data';

interface MockEntry {
  key: string;
  data: object;
}

function generateMockData(): MockEntry[] {
  const now = Date.now();
  const entries: MockEntry[] = [];

  for (let i = 0; i < NUM_POINTS; i++) {
    const ts = new Date(now - (NUM_POINTS - i) * INTERVAL_SEC * 1000);
    const y = ts.getUTCFullYear();
    const m = String(ts.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ts.getUTCDate()).padStart(2, '0');
    const h = String(ts.getUTCHours()).padStart(2, '0');
    const offset = String(i).padStart(10, '0');
    const key = `topics/${MOCK_TOPIC}/year=${y}/month=${m}/day=${d}/hour=${h}/${MOCK_TOPIC}+0+${offset}.json`;

    entries.push({
      key,
      data: {
        device: { name: 'mock-device' },
        sensors: [
          {
            name: 'light',
            type: 'light',
            timestamp: ts.toISOString(),
            value: 200 + Math.sin(i * 0.3) * 50,
          },
          {
            name: 'magnetic_field',
            type: 'magnetic_field',
            timestamp: ts.toISOString(),
            values: [
              20 + Math.sin(i * 0.1) * 5,
              -30 + Math.cos(i * 0.15) * 3,
              -40 + Math.sin(i * 0.2) * 4,
            ],
          },
          {
            name: 'gravity',
            type: 'gravity',
            timestamp: ts.toISOString(),
            values: [
              Math.sin(i * 0.05) * 0.3,
              9.8 + Math.cos(i * 0.08) * 0.1,
              Math.sin(i * 0.06) * 0.2,
            ],
          },
        ],
      },
    });
  }
  return entries;
}

function buildListXml(filteredEntries: MockEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <IsTruncated>false</IsTruncated>
  ${filteredEntries.map((e) => `<Contents><Key>${e.key}</Key></Contents>`).join('\n  ')}
</ListBucketResult>`;
}

export function devMockSensorData(): Plugin {
  // VITE_SENSOR_DATA_URL が設定されていればモックを無効化し、実際の S3 からデータを取得する
  if (process.env.VITE_SENSOR_DATA_URL) {
    return { name: 'dev-mock-sensor-data' };
  }

  const entries = generateMockData();

  return {
    name: 'dev-mock-sensor-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/sensor-data/')) return next();

        if (url.includes('list-type=2')) {
          // prefix パラメータによるフィルタリング
          const parsedUrl = new URL(url, 'http://localhost');
          const prefix = parsedUrl.searchParams.get('prefix') ?? '';
          const filtered = prefix ? entries.filter((e) => e.key.startsWith(prefix)) : entries;
          res.setHeader('Content-Type', 'application/xml');
          res.end(buildListXml(filtered));
          return;
        }

        // 個別 JSON: /sensor-data/ 以降のパス全体をキーとしてマッチ
        const key = url.replace('/sensor-data/', '');
        const entry = entries.find((e) => e.key === key);
        if (entry) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(entry.data));
          return;
        }

        res.statusCode = 404;
        res.end('Not Found');
      });
    },
  };
}
