// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

import { mount } from 'svelte';
import 'beercss';
import 'material-dynamic-colors';
import './app.css';
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import autocolors from 'chartjs-plugin-autocolors';
import 'chartjs-adapter-date-fns';
import App from './App.svelte';

Chart.register(
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  autocolors,
);

mount(App, {
  target: document.getElementById('app')!,
});
