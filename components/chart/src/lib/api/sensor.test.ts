// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toDimensionalValues,
  buildPrefixes,
  getObjectList,
  fetchSensorData,
  clearSensorDataCache,
} from './sensor';

// --- helpers ---

function listXml(keys: string[], isTruncated = false, nextToken?: string): string {
  const keyEls = keys.map((k) => `<Contents><Key>${k}</Key></Contents>`).join('');
  const tokenEl = nextToken ? `<NextContinuationToken>${nextToken}</NextContinuationToken>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
    <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <IsTruncated>${isTruncated}</IsTruncated>
      ${tokenEl}${keyEls}
    </ListBucketResult>`;
}

function sensorJson(
  sensors: Array<{
    type: string;
    timestamp: string;
    value?: number;
    values?: number[];
  }>,
): string {
  return JSON.stringify({
    sensors: sensors.map((s) => ({
      name: s.type,
      type: s.type,
      timestamp: s.timestamp,
      ...(s.value !== undefined ? { value: s.value } : {}),
      ...(s.values !== undefined ? { values: s.values } : {}),
    })),
    device: {},
  });
}

function mockResponse(body: string, contentType = 'text/xml'): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
    headers: new Headers({ 'content-type': contentType }),
  } as unknown as Response;
}

function mockErrorResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(''),
    json: () => Promise.reject(new Error('not json')),
    headers: new Headers(),
  } as unknown as Response;
}

// --- tests ---

describe('toDimensionalValues', () => {
  it('スカラー値を 1 要素の配列で返す', () => {
    expect(toDimensionalValues({ value: 42 })).toEqual([42]);
  });

  it('ベクトル値をそのまま返す', () => {
    expect(toDimensionalValues({ values: [1, 2, 3] })).toEqual([1, 2, 3]);
  });

  it('値なしの場合は [0] を返す', () => {
    expect(toDimensionalValues({})).toEqual([0]);
  });

  it('value が 0 でもスカラーとして扱う', () => {
    expect(toDimensionalValues({ value: 0 })).toEqual([0]);
  });
});

describe('buildPrefixes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('displayMaxMinutes <= 0 で topic prefix のみ返す', () => {
    expect(buildPrefixes('my-topic', -1)).toEqual(['topics/my-topic/']);
    expect(buildPrefixes('my-topic', 0)).toEqual(['topics/my-topic/']);
  });

  it('displayMaxMinutes = 60 で最大 2 個の時間別 prefix を返す', () => {
    // 2026-04-01 12:30:00 UTC に固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:30:00Z'));

    const prefixes = buildPrefixes('my-topic', 60);
    expect(prefixes).toEqual([
      'topics/my-topic/year=2026/month=04/day=01/hour=11/',
      'topics/my-topic/year=2026/month=04/day=01/hour=12/',
    ]);
  });

  it('prefix の日時が UTC であること', () => {
    // 2026-04-01 00:30:00 UTC（JST だと 09:30）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:30:00Z'));

    const prefixes = buildPrefixes('my-topic', 90);
    // 90分前 = 2026-03-31 23:00 UTC ～ 2026-04-01 00:30 UTC
    expect(prefixes).toEqual([
      'topics/my-topic/year=2026/month=03/day=31/hour=23/',
      'topics/my-topic/year=2026/month=04/day=01/hour=00/',
    ]);
  });

  it('同一時間内の場合は prefix が 1 個', () => {
    // 2026-04-01 12:10:00 UTC に固定、displayMaxMinutes=5
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:10:00Z'));

    const prefixes = buildPrefixes('my-topic', 5);
    expect(prefixes).toEqual(['topics/my-topic/year=2026/month=04/day=01/hour=12/']);
  });

  it('長時間範囲で複数の prefix が生成される', () => {
    // 2026-04-01 14:30:00 UTC に固定、displayMaxMinutes=180（3時間）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T14:30:00Z'));

    const prefixes = buildPrefixes('my-topic', 180);
    expect(prefixes).toEqual([
      'topics/my-topic/year=2026/month=04/day=01/hour=11/',
      'topics/my-topic/year=2026/month=04/day=01/hour=12/',
      'topics/my-topic/year=2026/month=04/day=01/hour=13/',
      'topics/my-topic/year=2026/month=04/day=01/hour=14/',
    ]);
  });
});

describe('getObjectList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('単一ページのキー一覧を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse(listXml(['obj1', 'obj2', 'obj3']))),
    );
    const keys = await getObjectList('http://localhost/sensor-data/');
    expect(keys).toEqual(['obj1', 'obj2', 'obj3']);
  });

  it('ページネーションで継続取得する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(listXml(['obj1', 'obj2'], true, 'token-abc')))
      .mockResolvedValueOnce(mockResponse(listXml(['obj3', 'obj4'])));
    vi.stubGlobal('fetch', fetchMock);

    const keys = await getObjectList('http://localhost/sensor-data/');
    expect(keys).toEqual(['obj1', 'obj2', 'obj3', 'obj4']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // 2 回目のリクエストに continuation-token が含まれる
    const secondUrl = fetchMock.mock.calls[1][0] as string;
    expect(secondUrl).toContain('continuation-token=token-abc');
  });

  it('prefix が fetch の URL パラメータに含まれる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(listXml(['obj1'])));
    vi.stubGlobal('fetch', fetchMock);

    await getObjectList('http://localhost/sensor-data/', 'topics/my-topic/year=2026/');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('prefix=topics%2Fmy-topic%2Fyear%3D2026%2F');
  });

  it('prefix が空の場合は prefix パラメータが付与されない', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(listXml(['obj1'])));
    vi.stubGlobal('fetch', fetchMock);

    await getObjectList('http://localhost/sensor-data/', '');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain('prefix=');
  });

  it('S3 が非200を返した場合に Error が投げられる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockErrorResponse(403, 'Forbidden')));
    await expect(getObjectList('http://localhost/sensor-data/')).rejects.toThrow(
      'Failed to list objects: 403 Forbidden',
    );
  });

  it('HTML エラーページが返された場合に Error が投げられる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse('<html><body>Error</body></html>')),
    );
    await expect(getObjectList('http://localhost/sensor-data/')).rejects.toThrow(
      'Unexpected XML response: missing ListBucketResult element',
    );
  });

  it('壊れた XML レスポンスで Error が投げられる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse('this is not xml at all')));
    await expect(getObjectList('http://localhost/sensor-data/')).rejects.toThrow(
      'Invalid XML response',
    );
  });

  it('signal が fetch に伝播される', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(listXml(['obj1'])));
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    await getObjectList('http://localhost/sensor-data/', '', controller.signal);
    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it('abort 済みの signal で fetch が中断される', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
        }
        return Promise.resolve(mockResponse(listXml(['obj1'])));
      }),
    );

    const controller = new AbortController();
    controller.abort();
    await expect(
      getObjectList('http://localhost/sensor-data/', '', controller.signal),
    ).rejects.toThrow('The operation was aborted.');
  });
});

describe('fetchSensorData', () => {
  const BASE_URL = 'http://localhost/sensor-data/';
  const TEST_TOPIC = 'test-topic';
  const KEY_PREFIX = `topics/${TEST_TOPIC}/`;

  // テスト用キーに topic prefix を付与するヘルパー
  function prefixKey(name: string): string {
    return `${KEY_PREFIX}${name}`;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    clearSensorDataCache();
  });

  function setupFetchMock(objectKeys: string[], objectBodies: Record<string, string>): void {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('list-type=2')) {
          const parsedUrl = new URL(url);
          const prefix = parsedUrl.searchParams.get('prefix') ?? '';
          const filtered = prefix ? objectKeys.filter((k) => k.startsWith(prefix)) : objectKeys;
          return Promise.resolve(mockResponse(listXml(filtered)));
        }
        const key = objectKeys.find((k) => url.endsWith(k));
        if (key && objectBodies[key]) {
          return Promise.resolve(mockResponse(objectBodies[key], 'application/json'));
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );
  }

  it('スカラーデータを datasets.length === 1 で返す', async () => {
    const k1 = prefixKey('obj1');
    const keys = [k1];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 100 }]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
    });
    expect(results).toHaveLength(1);
    expect(results[0].sensor).toBe('light');
    expect(results[0].datasets).toHaveLength(1);
    expect(results[0].datasets[0]).toEqual([{ x: '2026-03-10T00:00:00.000Z', y: 100 }]);
  });

  it('ベクトルデータ（3次元）を datasets.length === 3 で返す', async () => {
    const k1 = prefixKey('obj1');
    const keys = [k1];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([
        {
          type: 'accelerometer',
          timestamp: '2026-03-10T00:00:00.000Z',
          values: [1.2, 0.3, 9.8],
        },
      ]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['accelerometer']),
    });
    expect(results).toHaveLength(1);
    expect(results[0].datasets).toHaveLength(3);
    expect(results[0].datasets[0]).toEqual([{ x: '2026-03-10T00:00:00.000Z', y: 1.2 }]);
    expect(results[0].datasets[1]).toEqual([{ x: '2026-03-10T00:00:00.000Z', y: 0.3 }]);
    expect(results[0].datasets[2]).toEqual([{ x: '2026-03-10T00:00:00.000Z', y: 9.8 }]);
  });

  it('次元数の一貫性: 最初の次元数を基準にする', async () => {
    const k1 = prefixKey('obj1');
    const k2 = prefixKey('obj2');
    const keys = [k1, k2];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'accel', timestamp: '2026-03-10T00:00:00.000Z', values: [1, 2] }]),
      [k2]: sensorJson([
        { type: 'accel', timestamp: '2026-03-10T00:01:00.000Z', values: [3, 4, 5] },
      ]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['accel']),
    });
    expect(results[0].datasets).toHaveLength(2);
    expect(results[0].datasets[0]).toHaveLength(2);
    expect(results[0].datasets[1]).toHaveLength(2);
  });

  it('時間フィルタ: displayMaxMinutes 内のデータのみ返す', async () => {
    // 2026-04-01 12:30:00 UTC に固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:30:00Z'));

    const recent = '2026-04-01T12:00:00.000Z'; // 30分前（範囲内）
    const old = '2026-04-01T10:30:00.000Z'; // 2時間前（範囲外）

    // recent は hour=12 prefix に、old は hour=10 prefix に属するが
    // displayMaxMinutes=60 では hour=11 と hour=12 の prefix しか生成されない
    // → old は LIST に含まれない
    const k1 = `topics/${TEST_TOPIC}/year=2026/month=04/day=01/hour=12/obj1.json`;
    const k2 = `topics/${TEST_TOPIC}/year=2026/month=04/day=01/hour=10/obj2.json`;
    const keys = [k1, k2];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: recent, value: 10 }]),
      [k2]: sensorJson([{ type: 'light', timestamp: old, value: 20 }]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
      displayMaxMinutes: 60,
    });
    expect(results[0].datasets[0]).toHaveLength(1);
    expect(results[0].datasets[0][0].y).toBe(10);

    vi.useRealTimers();
  });

  it('全件取得: displayMaxMinutes === -1 ですべてのデータが含まれる', async () => {
    const k1 = prefixKey('obj1');
    const k2 = prefixKey('obj2');
    const keys = [k1, k2];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2020-01-01T00:00:00.000Z', value: 10 }]),
      [k2]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 20 }]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
      displayMaxMinutes: -1,
    });
    expect(results[0].datasets[0]).toHaveLength(2);
  });

  it('タイムスタンプ昇順でソートされる', async () => {
    const k1 = prefixKey('obj1');
    const k2 = prefixKey('obj2');
    const k3 = prefixKey('obj3');
    const keys = [k1, k2, k3];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:03:00.000Z', value: 3 }]),
      [k2]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:01:00.000Z', value: 1 }]),
      [k3]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:02:00.000Z', value: 2 }]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
    });
    const ys = results[0].datasets[0].map((d) => d.y);
    expect(ys).toEqual([1, 2, 3]);
  });

  it('キャッシュ済みキーは再 fetch しない', async () => {
    const k1 = prefixKey('obj1');
    const k2 = prefixKey('obj2');
    const keys = [k1, k2];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 10 }]),
      [k2]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:01:00.000Z', value: 20 }]),
    };
    setupFetchMock(keys, bodies);

    await fetchSensorData({ url: BASE_URL, topic: TEST_TOPIC, sensors: new Set(['light']) });
    // list (1回) + k1 + k2 = 3回
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);

    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
    });
    // list (1回) のみ
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(results[0].datasets[0]).toHaveLength(2);
  });

  it('新規キーのみ fetch し、キャッシュ済みと結合する', async () => {
    const k1 = prefixKey('obj1');
    const k2 = prefixKey('obj2');
    const k3 = prefixKey('obj3');
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 10 }]),
      [k2]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:01:00.000Z', value: 20 }]),
      [k3]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:02:00.000Z', value: 30 }]),
    };

    setupFetchMock([k1], bodies);
    await fetchSensorData({ url: BASE_URL, topic: TEST_TOPIC, sensors: new Set(['light']) });

    setupFetchMock([k1, k2, k3], bodies);
    vi.mocked(fetch).mockClear();
    setupFetchMock([k1, k2, k3], bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
    });
    // list (1回) + k2 + k3 = 3回（k1 はキャッシュ）
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(results[0].datasets[0]).toHaveLength(3);
    const ys = results[0].datasets[0].map((d) => d.y);
    expect(ys).toEqual([10, 20, 30]);
  });

  it('キャッシュは全センサー分を保持し、別センサーでも再利用される', async () => {
    const k1 = prefixKey('obj1');
    const keys = [k1];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([
        { type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 100 },
        { type: 'step_counter', timestamp: '2026-03-10T00:00:00.000Z', value: 50 },
      ]),
    };

    setupFetchMock(keys, bodies);
    await fetchSensorData({ url: BASE_URL, topic: TEST_TOPIC, sensors: new Set(['light']) });

    vi.mocked(fetch).mockClear();
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['step_counter']),
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(results[0].datasets[0]).toEqual([{ x: '2026-03-10T00:00:00.000Z', y: 50 }]);
  });

  it('個別 JSON fetch が非200を返した場合に Error が投げられる', async () => {
    const k1 = prefixKey('obj1');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('list-type=2')) {
          return Promise.resolve(mockResponse(listXml([k1])));
        }
        return Promise.resolve(mockErrorResponse(500, 'Internal Server Error'));
      }),
    );

    await expect(
      fetchSensorData({ url: BASE_URL, topic: TEST_TOPIC, sensors: new Set(['light']) }),
    ).rejects.toThrow('Failed to fetch');
  });

  it('clearSensorDataCache でキャッシュがクリアされる', async () => {
    const k1 = prefixKey('obj1');
    const keys = [k1];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 10 }]),
    };
    setupFetchMock(keys, bodies);
    await fetchSensorData({ url: BASE_URL, topic: TEST_TOPIC, sensors: new Set(['light']) });

    clearSensorDataCache();

    vi.mocked(fetch).mockClear();
    setupFetchMock(keys, bodies);

    await fetchSensorData({ url: BASE_URL, topic: TEST_TOPIC, sensors: new Set(['light']) });
    // list (1回) + k1 (1回) = 2回
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('displayMaxMinutes > 0 で時間別 prefix ごとに LIST が呼ばれる', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:30:00Z'));

    const k1 = `topics/${TEST_TOPIC}/year=2026/month=04/day=01/hour=11/obj1.json`;
    const k2 = `topics/${TEST_TOPIC}/year=2026/month=04/day=01/hour=12/obj2.json`;
    const keys = [k1, k2];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-04-01T11:30:00.000Z', value: 10 }]),
      [k2]: sensorJson([{ type: 'light', timestamp: '2026-04-01T12:10:00.000Z', value: 20 }]),
    };
    setupFetchMock(keys, bodies);

    const results = await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
      displayMaxMinutes: 60,
    });

    // 2 つの prefix で LIST が呼ばれる + 2 つの JSON fetch = 4回
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4);
    expect(results[0].datasets[0]).toHaveLength(2);

    vi.useRealTimers();
  });

  it('displayMaxMinutes <= 0 で topic prefix 1 回のみ LIST が呼ばれる', async () => {
    const k1 = prefixKey('obj1');
    const keys = [k1];
    const bodies: Record<string, string> = {
      [k1]: sensorJson([{ type: 'light', timestamp: '2026-03-10T00:00:00.000Z', value: 10 }]),
    };
    setupFetchMock(keys, bodies);

    await fetchSensorData({
      url: BASE_URL,
      topic: TEST_TOPIC,
      sensors: new Set(['light']),
      displayMaxMinutes: -1,
    });

    // topic prefix で LIST 1回 + JSON 1回 = 2回
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    // LIST の URL に topic prefix が含まれる
    const listUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(listUrl).toContain(`prefix=topics%2F${TEST_TOPIC}%2F`);
  });
});
