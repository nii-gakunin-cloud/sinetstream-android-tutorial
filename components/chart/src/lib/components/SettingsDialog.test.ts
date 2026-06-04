// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import SettingsDialog from './SettingsDialog.svelte';
import { appSettings, enabledSensors } from '../stores';
import { SENSOR_TYPES } from '../sensors';

beforeEach(() => {
  localStorage.clear();
  appSettings.set({
    refreshInterval: 3,
    displayMaxMinutes: 60,
  });
  enabledSensors.set(['light', 'magnetic_field', 'gravity']);
});

describe('SettingsDialog', () => {
  it('設定値が反映される', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '10');

    await user.click(screen.getByText('決定'));

    const settings = get(appSettings);
    expect(settings.refreshInterval).toBe(10);
  });
});

describe('SettingsDialog バリデーション', () => {
  it('空欄はデフォルト値にフォールバックする', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]); // refreshInterval を空に
    await user.clear(inputs[1]); // displayMaxMinutes を空に

    await user.click(screen.getByText('決定'));

    const settings = get(appSettings);
    expect(settings.refreshInterval).toBe(3);
    expect(settings.displayMaxMinutes).toBe(60);
  });

  it('0以下の値はデフォルト値にフォールバックする', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '0');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '-5');

    await user.click(screen.getByText('決定'));

    const settings = get(appSettings);
    expect(settings.refreshInterval).toBe(3);
    expect(settings.displayMaxMinutes).toBe(60);
  });

  it('小数は整数に丸められる', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '5.7');

    await user.click(screen.getByText('決定'));

    const settings = get(appSettings);
    expect(settings.refreshInterval).toBe(6);
  });
});

describe('SettingsDialog センサー選択', () => {
  it('センサーチェックボックスが 17 個表示される', () => {
    render(SettingsDialog, { props: { open: true } });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(17);
  });

  it('デフォルトで 3 件がチェック済み', () => {
    render(SettingsDialog, { props: { open: true } });
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const checked = checkboxes.filter((cb) => cb.checked);
    expect(checked).toHaveLength(3);
  });

  it('チェック変更 → 決定で enabledSensors が更新される', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    // gyroscope のチェックボックスをクリック
    const gyroLabel = screen.getByText('Gyroscope');
    const gyroCheckbox = gyroLabel.closest('label')!.querySelector('input')!;
    await user.click(gyroCheckbox);

    await user.click(screen.getByText('決定'));

    const sensors = get(enabledSensors);
    expect(sensors).toContain('gyroscope');
    expect(sensors).toHaveLength(4);
  });

  it('全選択ボタンで全センサーがチェックされる', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    await user.click(screen.getByText('全選択'));
    await user.click(screen.getByText('決定'));

    const sensors = get(enabledSensors);
    expect(sensors).toHaveLength(SENSOR_TYPES.length);
  });

  it('全クリアボタンで全センサーのチェックが解除される', async () => {
    const user = userEvent.setup();
    render(SettingsDialog, { props: { open: true } });

    await user.click(screen.getByText('全クリア'));
    await user.click(screen.getByText('決定'));

    const sensors = get(enabledSensors);
    expect(sensors).toHaveLength(0);
  });
});
