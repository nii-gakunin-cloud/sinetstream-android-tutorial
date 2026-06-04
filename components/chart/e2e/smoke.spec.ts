// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test';

test.describe('スモークテスト', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage をクリアしてデフォルト状態で開始
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // dev-mock-plugin からのデータ取得を待つ
    await page.waitForSelector('canvas', { timeout: 10_000 });
  });

  test('01ページが読み込まれる', async ({ page }) => {
    await expect(page.locator('h5', { hasText: 'SINETStream' })).toBeVisible();
    await expect(page.locator('header nav')).toBeVisible();
  });

  test('02デフォルト3件のチャートカードが表示される', async ({ page }) => {
    const cards = page.locator('article');
    await expect(cards).toHaveCount(3);

    // 各カードにセンサーラベルが表示されている
    await expect(cards.nth(0).locator('h6')).toContainText('Light');
    await expect(cards.nth(1).locator('h6')).toContainText('Magnetic Field');
    await expect(cards.nth(2).locator('h6')).toContainText('Gravity');
  });

  test('03canvasが描画されている', async ({ page }) => {
    const canvases = page.locator('canvas');
    await expect(canvases).toHaveCount(3);

    // 各 canvas の幅・高さが 0 でないことを確認
    for (let i = 0; i < 3; i++) {
      const box = await canvases.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    }
  });

  test('04レイアウトが崩壊していない', async ({ page }) => {
    const viewport = page.viewportSize()!;
    const cards = page.locator('article');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box).not.toBeNull();
      // カードが viewport 幅内に収まっている
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    }

    // カード同士が完全に重なっていないことを確認（Y座標が異なる）
    if (count >= 2) {
      const boxes = [];
      for (let i = 0; i < count; i++) {
        boxes.push(await cards.nth(i).boundingBox());
      }
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.y);
      }
    }
  });

  test('05設定ダイアログが動作する', async ({ page }) => {
    await page.click('button[aria-label="設定"]');
    const dialog = page.locator('dialog', { hasText: '設定' });
    await expect(dialog).toBeVisible();

    // センサー選択チェックボックスが存在する
    const sensorCheckboxes = dialog.locator('label.switch input[type="checkbox"]');
    await expect(sensorCheckboxes).toHaveCount(17);

    // 全選択・全クリアボタンが存在する
    await expect(dialog.locator('button:has-text("全選択")')).toBeVisible();
    await expect(dialog.locator('button:has-text("全クリア")')).toBeVisible();

    // 閉じる
    await page.click('button:has-text("決定")');
    await expect(dialog).not.toBeVisible();
  });

  test('06チャート削除が動作する', async ({ page }) => {
    const cards = page.locator('article');
    await expect(cards).toHaveCount(3);

    // 最初のカードの閉じるボタンをクリック
    await cards.first().locator('button:has-text("close")').click();

    // カードが2件に減少
    await expect(cards).toHaveCount(2);
  });

  test('07スクリーンショット保存', async ({ page }) => {
    await page.screenshot({ path: 'test-results/default-view.png', fullPage: true });
  });
});
