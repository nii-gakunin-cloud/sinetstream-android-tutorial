<!--
  SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
  SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, type ChartData } from 'chart.js';
  import { enabledSensors, chartDatasets } from '../stores';
  import { SENSOR_TYPE_MAP } from '../sensors';

  interface Props {
    sensorKey: string;
  }

  let { sensorKey }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | undefined;

  const sensorDef = $derived(SENSOR_TYPE_MAP.get(sensorKey));

  onMount(() => {
    const def = SENSOR_TYPE_MAP.get(sensorKey);
    chart = new Chart(canvas, {
      type: 'line' as const,
      data: { datasets: [] as never[] },
      options: {
        animation: false as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom' as const,
            labels: {
              filter: (item: { text: string }) => item.text !== '',
            },
          },
          autocolors: { mode: 'dataset' as const },
        },
        scales: {
          x: {
            type: 'time' as const,
            time: { unit: 'minute' as const },
          },
          y: {
            beginAtZero: true,
            title: {
              display: !!def?.unit,
              text: def?.unit ?? '',
            },
          },
        },
      },
    });
  });

  onDestroy(() => {
    chart?.destroy();
  });

  $effect(() => {
    const data = $chartDatasets[sensorKey];
    if (chart && data) {
      // TimeScale は x に ISO 文字列を受け入れるが、ChartData の型定義は number を要求する
      // Chart.js API 境界でのみキャストし、アプリ内部では string 型を維持する
      chart.data = data as unknown as ChartData;
      chart.update();
    }
  });

  function handleClose() {
    enabledSensors.update((s: string[]) => s.filter((k: string) => k !== sensorKey));
  }
</script>

<article class="border round">
  <div class="row padding">
    <h6 class="max">{sensorDef?.label ?? sensorKey}</h6>
    <button class="circle transparent" onclick={handleClose}>
      <i>close</i>
    </button>
  </div>
  <div class="padding" style="position: relative; height: 300px;">
    <canvas bind:this={canvas} style="border-radius: 0;"></canvas>
  </div>
</article>
