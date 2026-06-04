// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

export interface AppSettings {
  displayMaxMinutes: number;
  refreshInterval: number; // 秒
}

export interface DataPoint {
  x: string; // ISO timestamp
  y: number;
}

export interface SensorResult {
  sensor: string;
  datasets: DataPoint[][]; // datasets[i] = 第 i 次元の時系列
}

// Chart.js TimeScale 互換のデータセット構造
// TimeScale は x に ISO 文字列を受け入れるが、ChartData の型定義は number を要求するため独自に定義
export interface TimeSeriesDataset {
  label: string;
  data: DataPoint[];
}

export interface TimeSeriesChartData {
  datasets: TimeSeriesDataset[];
}
