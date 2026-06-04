// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SensorChart from './SensorChart.svelte';
import { enabledSensors, appSettings, chartDatasets } from '../stores';

// fetchSensorData をモック
vi.mock('../api/sensor', () => ({
  fetchSensorData: vi.fn().mockResolvedValue([]),
}));

import { fetchSensorData } from '../api/sensor';

beforeEach(() => {
  localStorage.clear();
  enabledSensors.set(['light', 'magnetic_field']);
  appSettings.set({
    refreshInterval: 3,
    displayMaxMinutes: 60,
  });
  chartDatasets.set({});
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SensorChart', () => {
  it('チャート数分のカードが描画される', () => {
    const { container } = render(SensorChart);
    const cards = container.querySelectorAll('article');
    expect(cards).toHaveLength(2);
  });

  it('updateData が fetchSensorData を呼ぶ', async () => {
    render(SensorChart);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchSensorData).toHaveBeenCalled();
  });

  it('チャート 0 件でタイマーが停止する', async () => {
    render(SensorChart);
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(fetchSensorData).mockClear();

    enabledSensors.set([]);
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(fetchSensorData).mockClear();

    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchSensorData).not.toHaveBeenCalled();
  });

  it('fetch エラー時にエラーバナーが表示される', async () => {
    vi.mocked(fetchSensorData).mockRejectedValue(new Error('Network error'));
    render(SensorChart);

    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByText('Network error')).toBeTruthy();
  });

  it('エラー後にデータ取得が成功するとエラーバナーが消える', async () => {
    vi.mocked(fetchSensorData).mockRejectedValueOnce(new Error('Network error'));
    render(SensorChart);

    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByText('Network error')).toBeTruthy();

    vi.mocked(fetchSensorData).mockResolvedValue([]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(screen.queryByText('Network error')).toBeNull();
  });

  it('refreshInterval 変更時にタイマーが再起動される', async () => {
    render(SensorChart);
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(fetchSensorData).mockClear();

    appSettings.update((s) => ({ ...s, refreshInterval: 10 }));
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(fetchSensorData).mockClear();

    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchSensorData).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(7000);
    expect(fetchSensorData).toHaveBeenCalledTimes(1);
  });

  it('同件数でセンサーを入れ替えた場合に即時再取得される', async () => {
    render(SensorChart);
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(fetchSensorData).mockClear();

    // 2件 → 別の2件に変更
    enabledSensors.set(['gyroscope', 'pressure']);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchSensorData).toHaveBeenCalledTimes(1);
  });

  it('古いリクエストの完了が新しい結果を上書きしない', async () => {
    const oldData = [{ sensor: 'light', datasets: [[{ x: '2026-01-01T00:00:00Z', y: 1 }]] }];
    const newData = [{ sensor: 'light', datasets: [[{ x: '2026-01-01T00:01:00Z', y: 2 }]] }];

    // 1回目（古い）: resolve を手動制御するため保留
    let resolveOld!: (v: typeof oldData) => void;
    vi.mocked(fetchSensorData).mockImplementationOnce(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          resolveOld = resolve;
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );

    render(SensorChart);
    // 初回 updateData が呼ばれる（古いリクエスト開始）
    await vi.advanceTimersByTimeAsync(0);

    // 2回目（新しい）: 即座に resolve
    vi.mocked(fetchSensorData).mockResolvedValueOnce(newData);

    // interval 発火で新しいリクエスト開始 → 古いリクエストが abort される
    await vi.advanceTimersByTimeAsync(3000);

    // 古いリクエストを遅延 resolve（abort 済みなので無視されるはず）
    resolveOld(oldData);
    await vi.advanceTimersByTimeAsync(0);

    // chartDatasets には新しいデータのみ反映されている
    const { get } = await import('svelte/store');
    const datasets = get(chartDatasets);
    expect(datasets['light']?.datasets[0]?.data).toEqual([{ x: '2026-01-01T00:01:00Z', y: 2 }]);
  });

  it('abort されたリクエストのエラーが表示されない', async () => {
    // 1回目: abort 時に AbortError を投げる
    vi.mocked(fetchSensorData).mockImplementationOnce(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );

    render(SensorChart);
    await vi.advanceTimersByTimeAsync(0);

    // 2回目: 正常に返す
    vi.mocked(fetchSensorData).mockResolvedValueOnce([]);

    // interval 発火で古いリクエストが abort される
    await vi.advanceTimersByTimeAsync(3000);

    // abort によるエラーがバナーに表示されていないこと
    expect(screen.queryByText('aborted')).toBeNull();
  });
});
