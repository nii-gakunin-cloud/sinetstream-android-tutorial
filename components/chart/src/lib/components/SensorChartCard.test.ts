// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { Chart } from 'chart.js';
import SensorChartCard from './SensorChartCard.svelte';
import { enabledSensors, chartDatasets } from '../stores';

beforeEach(() => {
  localStorage.clear();
  enabledSensors.set(['light', 'magnetic_field']);
  chartDatasets.set({});
});

describe('SensorChartCard', () => {
  it('センサーラベルがカードタイトルとして表示される', () => {
    render(SensorChartCard, { props: { sensorKey: 'light' } });
    expect(screen.getByText('Light')).toBeTruthy();
  });

  it('閉じるボタンでストアからエントリが削除される', async () => {
    render(SensorChartCard, { props: { sensorKey: 'light' } });
    const closeBtn = screen.getByText('close').closest('button')!;
    await closeBtn.click();
    const sensors = get(enabledSensors);
    expect(sensors).not.toContain('light');
    expect(sensors).toContain('magnetic_field');
  });

  it('chartDatasets 更新時に chart.update() が呼ばれる', async () => {
    render(SensorChartCard, { props: { sensorKey: 'light' } });

    const MockChart = vi.mocked(Chart);
    const instance = MockChart.mock.instances[MockChart.mock.instances.length - 1] as unknown as {
      update: ReturnType<typeof vi.fn>;
    };
    expect(instance).toBeDefined();

    chartDatasets.update((ds) => ({
      ...ds,
      light: {
        datasets: [{ label: 'test', data: [{ x: '2026-01-01T00:00:00Z', y: 42 }] }],
      },
    }));

    await new Promise((r) => setTimeout(r, 0));

    expect(instance.update).toHaveBeenCalled();
  });

  it('アンマウント時に chart.destroy() が呼ばれる', () => {
    render(SensorChartCard, { props: { sensorKey: 'light' } });

    const MockChart = vi.mocked(Chart);
    const instance = MockChart.mock.instances[MockChart.mock.instances.length - 1] as unknown as {
      destroy: ReturnType<typeof vi.fn>;
    };
    expect(instance).toBeDefined();
    expect(instance.destroy).not.toHaveBeenCalled();

    cleanup();

    expect(instance.destroy).toHaveBeenCalled();
  });
});
