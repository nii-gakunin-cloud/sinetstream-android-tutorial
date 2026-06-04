// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { parseISO, subMinutes } from 'date-fns';
import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';
import type { DataPoint, SensorResult } from '../stores/types';

const SENSOR_DATA_URL = import.meta.env.VITE_SENSOR_DATA_URL ?? '/sensor-data/';
const TOPIC = import.meta.env.VITE_SENSOR_TOPIC ?? 'sensor-data';
const MAX_KEYS_PER_PAGE = 1000;
const CONCURRENCY = 10;
const CACHE_MAX_ENTRIES = 2000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30分

interface SensorDataset {
  sensors: SensorData[];
  device: unknown;
}

interface SensorData {
  name: string;
  type: string;
  timestamp: string;
  value?: number;
  values?: number[];
}

interface DimensionalDataPoint {
  sensor: string;
  timestamp: string;
  dimensions: number[];
}

// キー単位でパース済みセンサーデータをキャッシュ（全センサー分を保持）
const sensorDataCache = new LRUCache<string, DimensionalDataPoint[]>({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS,
});

export function clearSensorDataCache(): void {
  sensorDataCache.clear();
}

export function toDimensionalValues(sensor: {
  value?: number | null;
  values?: number[];
}): number[] {
  if (sensor.value != null) return [sensor.value];
  if (sensor.values) return sensor.values;
  return [0];
}

export function buildPrefixes(topic: string, displayMaxMinutes: number): string[] {
  if (displayMaxMinutes <= 0) {
    return [`topics/${topic}/`];
  }

  const now = new Date();
  const from = subMinutes(now, displayMaxMinutes);
  const prefixes: string[] = [];

  const current = new Date(from);
  current.setUTCMinutes(0, 0, 0);
  while (current <= now) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    const h = String(current.getUTCHours()).padStart(2, '0');
    prefixes.push(`topics/${topic}/year=${y}/month=${m}/day=${d}/hour=${h}/`);
    current.setUTCHours(current.getUTCHours() + 1);
  }

  return prefixes;
}

export async function getObjectList(
  url: string = SENSOR_DATA_URL,
  prefix: string = '',
  signal?: AbortSignal,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  let truncated = true;

  while (truncated) {
    const params = new URLSearchParams({
      'list-type': '2',
      'max-keys': String(MAX_KEYS_PER_PAGE),
    });
    if (prefix) {
      params.set('prefix', prefix);
    }
    if (continuationToken) {
      params.set('continuation-token', continuationToken);
    }

    const res = await fetch(`${url}?${params}`, { signal });
    if (!res.ok) throw new Error(`Failed to list objects: ${res.status} ${res.statusText}`);
    const xml = new DOMParser().parseFromString(await res.text(), 'application/xml');

    const parseError = xml.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      throw new Error(`Invalid XML response: ${parseError[0].textContent}`);
    }
    if (!xml.getElementsByTagName('ListBucketResult').length) {
      throw new Error('Unexpected XML response: missing ListBucketResult element');
    }

    const keyElements = xml.getElementsByTagName('Key');
    for (let i = 0; i < keyElements.length; i++) {
      keys.push(keyElements[i].textContent ?? '');
    }

    const isTruncated = xml.getElementsByTagName('IsTruncated')[0]?.textContent;
    truncated = isTruncated === 'true';
    if (truncated) {
      const nextToken = xml.getElementsByTagName('NextContinuationToken')[0]?.textContent;
      continuationToken = nextToken ?? undefined;
    }
  }

  return keys;
}

async function getSensorData(
  url: string,
  keys: string[],
  sensors: Set<string>,
  concurrency: number = CONCURRENCY,
  signal?: AbortSignal,
): Promise<DimensionalDataPoint[]> {
  // キャッシュ済みキーと未取得キーを分離
  const cached: DimensionalDataPoint[] = [];
  const uncachedKeys: string[] = [];
  for (const key of keys) {
    const hit = sensorDataCache.get(key);
    if (hit) {
      cached.push(...hit.filter((v) => sensors.has(v.sensor)));
    } else {
      uncachedKeys.push(key);
    }
  }

  // 未取得キーのみ fetch
  const limit = pLimit(concurrency);
  const fetched = await Promise.all(
    uncachedKeys.map((key) =>
      limit(async () => {
        const res = await fetch(`${url}${key}`, { signal });
        if (!res.ok) throw new Error(`Failed to fetch ${key}: ${res.status} ${res.statusText}`);
        const ds: SensorDataset = await res.json();
        // キャッシュには全センサー分を保持（次回別センサーでも再利用可能）
        const allPoints = ds.sensors.map((v) => ({
          sensor: v.type,
          timestamp: v.timestamp,
          dimensions: toDimensionalValues(v),
        }));
        sensorDataCache.set(key, allPoints);
        return allPoints.filter((v) => sensors.has(v.sensor));
      }),
    ),
  );

  return [...cached, ...fetched.flat()];
}

export async function fetchSensorData({
  url = SENSOR_DATA_URL,
  topic = TOPIC,
  sensors,
  displayMaxMinutes = -1,
  signal,
}: {
  url?: string;
  topic?: string;
  sensors: Set<string>;
  displayMaxMinutes?: number;
  signal?: AbortSignal;
}): Promise<SensorResult[]> {
  const prefixes = buildPrefixes(topic, displayMaxMinutes);

  const allKeys: string[] = [];
  for (const prefix of prefixes) {
    const keys = await getObjectList(url, prefix, signal);
    allKeys.push(...keys);
  }

  const data = await getSensorData(url, allKeys, sensors, CONCURRENCY, signal);

  const timeLimit = displayMaxMinutes > 0 ? subMinutes(Date.now(), displayMaxMinutes) : new Date(0);

  return Array.from(sensors).map((sensor) => {
    const sensorData = data
      .filter((d) => d.sensor === sensor)
      .filter((d) => displayMaxMinutes <= 0 || parseISO(d.timestamp) >= timeLimit)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // 次元数の一貫性: 最初に登場した次元数を基準
    const dimCount = sensorData.length > 0 ? sensorData[0].dimensions.length : 1;

    const datasets: DataPoint[][] = Array.from({ length: dimCount }, () => []);
    for (const point of sensorData) {
      for (let i = 0; i < dimCount; i++) {
        if (i < point.dimensions.length) {
          datasets[i].push({ x: point.timestamp, y: point.dimensions[i] });
        }
      }
    }

    return { sensor, datasets };
  });
}
