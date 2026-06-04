// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/svelte/vitest';
import { vi } from 'vitest';

// jsdom は HTMLDialogElement.showModal/close を実装していないためモック
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});

// Chart.js の canvas 依存をモック（jsdom 環境では canvas が使えないため）
// vi.fn() ベースにすることで .mock.instances からインスタンスを取得可能にする
vi.mock('chart.js', async () => {
  const actual = await vi.importActual<typeof import('chart.js')>('chart.js');
  const MockChart = vi.fn(function (this: Record<string, unknown>) {
    this.data = { datasets: [] };
    this.update = vi.fn();
    this.destroy = vi.fn();
  });
  return {
    ...actual,
    Chart: MockChart,
  };
});
