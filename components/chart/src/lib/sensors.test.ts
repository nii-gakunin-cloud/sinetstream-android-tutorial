// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { SENSOR_TYPES, SENSOR_TYPE_MAP } from './sensors';

describe('SENSOR_TYPES', () => {
  it('17 種のセンサーが定義されている', () => {
    expect(SENSOR_TYPES).toHaveLength(17);
  });

  it('全エントリの key が空でない', () => {
    for (const s of SENSOR_TYPES) {
      expect(s.key).not.toBe('');
    }
  });

  it('全エントリの dimensions が 1 以上', () => {
    for (const s of SENSOR_TYPES) {
      expect(s.dimensions).toBeGreaterThanOrEqual(1);
    }
  });

  it('key に重複がない', () => {
    const keys = SENSOR_TYPES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('多次元センサーの dimensionLabels の長さが dimensions と一致する', () => {
    for (const s of SENSOR_TYPES) {
      if (s.dimensions > 1) {
        expect(s.dimensionLabels, `${s.key} に dimensionLabels がない`).toBeDefined();
        expect(s.dimensionLabels!.length, `${s.key} の dimensionLabels の長さが不一致`).toBe(
          s.dimensions,
        );
      }
    }
  });

  it('スカラーセンサーには dimensionLabels が設定されていない', () => {
    for (const s of SENSOR_TYPES) {
      if (s.dimensions === 1) {
        expect(s.dimensionLabels, `${s.key} にスカラーだが dimensionLabels がある`).toBeUndefined();
      }
    }
  });
});

describe('SENSOR_TYPE_MAP', () => {
  it('キーから定義を取得できる', () => {
    const accel = SENSOR_TYPE_MAP.get('accelerometer');
    expect(accel).toBeDefined();
    expect(accel!.label).toBe('Accelerometer');
    expect(accel!.unit).toBe('m/s²');
    expect(accel!.dimensions).toBe(3);
  });

  it('存在しないキーは undefined を返す', () => {
    expect(SENSOR_TYPE_MAP.get('nonexistent')).toBeUndefined();
  });
});
