// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { writable } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import type { AppSettings, TimeSeriesChartData } from './types';

const DEFAULT_ENABLED_SENSORS: string[] = ['light', 'magnetic_field', 'gravity'];

const DEFAULT_APP_SETTINGS: AppSettings = {
  displayMaxMinutes: 60,
  refreshInterval: 3,
};

export const enabledSensors = persisted<string[]>('enabled-sensors', DEFAULT_ENABLED_SENSORS);

export const appSettings = persisted<AppSettings>('app-settings', DEFAULT_APP_SETTINGS);

// Chart.js データセット（非永続化、更新のたびに上書き）
export const chartDatasets = writable<Record<string, TimeSeriesChartData>>({});
