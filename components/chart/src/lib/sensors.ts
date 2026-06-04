// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

export interface SensorTypeDef {
  key: string;
  label: string;
  unit: string;
  dimensions: number;
  dimensionLabels?: string[]; // 凡例表示用（dimensions > 1 の場合）
}

export const SENSOR_TYPES: readonly SensorTypeDef[] = [
  {
    key: 'accelerometer',
    label: 'Accelerometer',
    unit: 'm/s²',
    dimensions: 3,
    dimensionLabels: ['X', 'Y', 'Z'],
  },
  {
    key: 'magnetic_field',
    label: 'Magnetic Field',
    unit: 'μT',
    dimensions: 3,
    dimensionLabels: ['X', 'Y', 'Z'],
  },
  {
    key: 'gyroscope',
    label: 'Gyroscope',
    unit: 'rad/s',
    dimensions: 3,
    dimensionLabels: ['X', 'Y', 'Z'],
  },
  { key: 'light', label: 'Light', unit: 'lx', dimensions: 1 },
  { key: 'pressure', label: 'Pressure', unit: 'hPa', dimensions: 1 },
  { key: 'proximity', label: 'Proximity', unit: 'cm', dimensions: 1 },
  {
    key: 'gravity',
    label: 'Gravity',
    unit: 'm/s²',
    dimensions: 3,
    dimensionLabels: ['X', 'Y', 'Z'],
  },
  {
    key: 'linear_acceleration',
    label: 'Linear Acceleration',
    unit: 'm/s²',
    dimensions: 3,
    dimensionLabels: ['X', 'Y', 'Z'],
  },
  {
    key: 'rotation_vector',
    label: 'Rotation Vector',
    unit: '',
    dimensions: 5,
    dimensionLabels: ['X', 'Y', 'Z', 'Scalar', 'Accuracy'],
  },
  {
    key: 'magnetic_field_uncalibrated',
    label: 'Magnetic Field (Uncalibrated)',
    unit: 'μT',
    dimensions: 6,
    dimensionLabels: ['X', 'Y', 'Z', 'X Bias', 'Y Bias', 'Z Bias'],
  },
  {
    key: 'gyroscope_uncalibrated',
    label: 'Gyroscope (Uncalibrated)',
    unit: 'rad/s',
    dimensions: 6,
    dimensionLabels: ['X', 'Y', 'Z', 'X Drift', 'Y Drift', 'Z Drift'],
  },
  {
    key: 'accelerometer_uncalibrated',
    label: 'Accelerometer (Uncalibrated)',
    unit: 'm/s²',
    dimensions: 6,
    dimensionLabels: ['X', 'Y', 'Z', 'X Bias', 'Y Bias', 'Z Bias'],
  },
  { key: 'significant_motion', label: 'Significant Motion', unit: '', dimensions: 1 },
  { key: 'step_detector', label: 'Step Detector', unit: '', dimensions: 1 },
  { key: 'step_counter', label: 'Step Counter', unit: 'steps', dimensions: 1 },
  {
    key: 'game_rotation_vector',
    label: 'Game Rotation Vector',
    unit: '',
    dimensions: 4,
    dimensionLabels: ['X', 'Y', 'Z', 'Scalar'],
  },
  {
    key: 'geomagnetic_rotation_vector',
    label: 'Geomagnetic Rotation Vector',
    unit: '',
    dimensions: 5,
    dimensionLabels: ['X', 'Y', 'Z', 'Scalar', 'Accuracy'],
  },
] as const;

export const SENSOR_TYPE_MAP: ReadonlyMap<string, SensorTypeDef> = new Map(
  SENSOR_TYPES.map((s) => [s.key, s]),
);

export type SensorTypeKey = (typeof SENSOR_TYPES)[number]['key'];
