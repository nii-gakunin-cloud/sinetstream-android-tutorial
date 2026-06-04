// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const DEFAULT_ENABLED_SENSORS = ['light', 'magnetic_field', 'gravity'];

const DEFAULT_SETTINGS = {
  displayMaxMinutes: 60,
  refreshInterval: 3,
};

describe('enabledSensors ストア', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('デフォルトで 3 件のセンサーが有効', async () => {
    const { enabledSensors } = await import('./chart');
    expect(get(enabledSensors)).toEqual(DEFAULT_ENABLED_SENSORS);
  });

  it('センサーを追加できる', async () => {
    const { enabledSensors } = await import('./chart');
    enabledSensors.update((s) => [...s, 'gyroscope']);
    expect(get(enabledSensors)).toContain('gyroscope');
    expect(get(enabledSensors)).toHaveLength(4);
  });

  it('センサーを削除できる', async () => {
    const { enabledSensors } = await import('./chart');
    enabledSensors.update((s) => s.filter((k) => k !== 'light'));
    const sensors = get(enabledSensors);
    expect(sensors).not.toContain('light');
    expect(sensors).toHaveLength(2);
  });
});

describe('appSettings ストア', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('デフォルト値が正しい', async () => {
    const { appSettings } = await import('./chart');
    expect(get(appSettings)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('localStorage 永続化', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('enabledSensors の変更が localStorage に反映される', async () => {
    const { enabledSensors } = await import('./chart');
    enabledSensors.update((s) => [...s, 'gyroscope']);
    const stored = JSON.parse(localStorage.getItem('enabled-sensors') ?? '[]') as string[];
    expect(stored).toContain('gyroscope');
  });

  it('appSettings の変更が localStorage に反映される', async () => {
    const { appSettings } = await import('./chart');
    appSettings.update((s) => ({ ...s, refreshInterval: 10 }));
    const stored = JSON.parse(localStorage.getItem('app-settings') ?? '{}') as Record<
      string,
      unknown
    >;
    expect(stored['refreshInterval']).toBe(10);
  });
});
