# SINETStream Sensor Chart

SINETStream の Android アプリで収集したセンサーデータをブラウザ上でチャート表示する Web アプリケーションです。
チュートリアル用途を想定しており、本番環境での利用を目的としたものではありません。

## 必要環境

- Node.js 24 以上

## セットアップ

```bash
npm ci
```

## 開発

```bash
npm run dev
```

開発サーバ (http://localhost:5173) が起動します。
環境変数 `VITE_SENSOR_DATA_URL` が未設定の場合、モックデータが自動的に配信されます。

### 環境変数

| 変数名 | 説明 | デフォルト値 |
| --- | --- | --- |
| `VITE_SENSOR_DATA_URL` | センサーデータストレージの URL | (未設定時はモックデータ) |
| `VITE_SENSOR_TOPIC` | トピック名 | `sensor-data` |

## ビルド

```bash
npm run build
```

成果物は `dist/` に出力されます。

## テスト

```bash
npm run test          # 単体テスト
npm run test:smoke    # E2E スモークテスト (Playwright)
```

## 技術スタック

- Svelte 5 / TypeScript / Vite
- Chart.js（時系列グラフ描画）
- Beer CSS（Material Design 3 UI）

## ライセンス

[Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
