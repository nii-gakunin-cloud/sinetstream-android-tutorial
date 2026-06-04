<!--
  SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
  SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import logo from './assets/logo.png';
  import SensorChart from './lib/components/SensorChart.svelte';
  import SettingsDialog from './lib/components/SettingsDialog.svelte';

  let settingsDialogOpen = $state(false);
</script>

<header>
  <nav>
    <img src={logo} alt="SINETStream" class="circle" style="height: 2.5rem;" />
    <h5 class="max">SINETStream</h5>
    <button
      class="circle transparent"
      aria-label="設定"
      onclick={() => (settingsDialogOpen = true)}
    >
      <i>settings</i>
    </button>
  </nav>
</header>

<main class="responsive">
  <SensorChart />
</main>

<SettingsDialog bind:open={settingsDialogOpen} />
