<!--
  SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
  SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { enabledSensors, appSettings, chartDatasets } from '../stores';
  import type { TimeSeriesChartData } from '../stores';
  import { SENSOR_TYPE_MAP } from '../sensors';
  import { fetchSensorData } from '../api/sensor';
  import SensorChartCard from './SensorChartCard.svelte';

  let timer: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;

  let fetchError = $state('');

  async function updateData(signal: AbortSignal) {
    const sensorKeys = $enabledSensors;
    if (sensorKeys.length === 0) return;

    const sensors = new Set<string>(sensorKeys);
    try {
      const results = await fetchSensorData({
        sensors,
        displayMaxMinutes: $appSettings.displayMaxMinutes,
        signal,
      });

      if (signal.aborted) return;

      fetchError = '';
      const newDatasets: Record<string, TimeSeriesChartData> = {};
      for (const key of sensorKeys) {
        const result = results.find((r) => r.sensor === key);
        if (result) {
          const sensorDef = SENSOR_TYPE_MAP.get(key);
          newDatasets[key] = {
            datasets: result.datasets.map((dim, i) => ({
              label:
                sensorDef?.dimensionLabels?.[i] ?? (result.datasets.length > 1 ? `[${i}]` : ''),
              data: dim,
            })),
          };
        }
      }
      chartDatasets.set(newDatasets);
    } catch (e) {
      if (signal.aborted) return;
      fetchError = e instanceof Error ? e.message : 'データの取得に失敗しました';
      console.error('センサーデータ取得エラー:', e);
    }
  }

  function startUpdate() {
    abortController?.abort();
    abortController = new AbortController();
    updateData(abortController.signal);
  }

  // refreshInterval または enabledSensors の変更時にタイマーを再起動
  // $effect は初回マウント時にも実行されるため onMount は不要
  // return のクリーンアップ関数により再実行時・アンマウント時にタイマーとリクエストが破棄される
  $effect(() => {
    void $appSettings.refreshInterval;
    void $enabledSensors.join(',');

    clearInterval(timer);
    timer = undefined;
    if ($enabledSensors.length > 0) {
      startUpdate();
      timer = setInterval(startUpdate, $appSettings.refreshInterval * 1000);
    }

    return () => {
      clearInterval(timer);
      abortController?.abort();
    };
  });
</script>

{#if fetchError}
  <div class="row padding">
    <div class="error-text max">
      <i>error</i>
      <span>{fetchError}</span>
    </div>
  </div>
{/if}

{#each $enabledSensors as sensorKey (sensorKey)}
  <SensorChartCard {sensorKey} />
{/each}
