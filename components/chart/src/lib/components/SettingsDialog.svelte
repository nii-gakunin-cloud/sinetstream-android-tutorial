<!--
  SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
  SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { appSettings, enabledSensors } from '../stores';
  import { SENSOR_TYPES } from '../sensors';

  interface Props {
    open: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let refreshInterval = $state($appSettings.refreshInterval);
  let displayMaxMinutes = $state($appSettings.displayMaxMinutes);
  // eslint-disable-next-line svelte/no-unnecessary-state-wrap -- selectAll/clearAll で再代入するため $state が必要
  let selectedSensors = $state(new SvelteSet<string>($enabledSensors));
  let dialogEl: HTMLDialogElement;

  $effect(() => {
    if (open) {
      refreshInterval = $appSettings.refreshInterval;
      displayMaxMinutes = $appSettings.displayMaxMinutes;
      selectedSensors = new SvelteSet<string>($enabledSensors);
      dialogEl?.showModal();
    } else {
      dialogEl?.close();
    }
  });

  function toggleSensor(key: string) {
    if (selectedSensors.has(key)) {
      selectedSensors.delete(key);
    } else {
      selectedSensors.add(key);
    }
  }

  function selectAll() {
    selectedSensors = new SvelteSet(SENSOR_TYPES.map((s) => s.key));
  }

  function clearAll() {
    selectedSensors = new SvelteSet();
  }

  function sanitize(value: number, min: number, fallback: number): number {
    return Number.isFinite(value) && value >= min ? Math.round(value) : fallback;
  }

  function handleSubmit() {
    enabledSensors.set(SENSOR_TYPES.filter((s) => selectedSensors.has(s.key)).map((s) => s.key));
    appSettings.set({
      refreshInterval: sanitize(refreshInterval, 1, 3),
      displayMaxMinutes: sanitize(displayMaxMinutes, 1, 60),
    });
    open = false;
  }

  function handleClose() {
    open = false;
  }
</script>

<dialog bind:this={dialogEl} onclose={handleClose}>
  <h5>設定</h5>

  <div class="field label border">
    <input id="settings-refresh-interval" type="number" bind:value={refreshInterval} min="1" />
    <label for="settings-refresh-interval">更新間隔(秒)</label>
  </div>

  <div class="field label border">
    <input id="settings-display-max-minutes" type="number" bind:value={displayMaxMinutes} min="1" />
    <label for="settings-display-max-minutes">最大表示範囲(分)</label>
  </div>

  <h6>センサー</h6>
  <div class="no-border no-round" style="max-height: 300px; overflow-y: auto;">
    {#each SENSOR_TYPES as sensor (sensor.key)}
      <div class="padding-left padding-right" style="padding-top: 0.4rem; padding-bottom: 0.4rem;">
        <label class="switch">
          <input
            type="checkbox"
            checked={selectedSensors.has(sensor.key)}
            onchange={() => toggleSensor(sensor.key)}
          />
          <span class="small-padding">{sensor.label}</span>
        </label>
      </div>
    {/each}
  </div>
  <div class="row" style="padding-top: 0.5rem;">
    <button class="small border" onclick={selectAll}>全選択</button>
    <button class="small border" onclick={clearAll}>全クリア</button>
  </div>

  <nav class="right-align">
    <button class="border" onclick={handleClose}>閉じる</button>
    <button onclick={handleSubmit}>決定</button>
  </nav>
</dialog>
