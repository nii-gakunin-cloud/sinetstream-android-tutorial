# SINETStream Converter

SINETStream メッセージ形式と Kafka Connect 間の変換を行うライブラリです。

## コンポーネント

- **SinetStreamConverter** - Kafka Connect の `Converter` 実装。SINETStream メッセージ形式と Connect データの相互変換を行います。
- **ParseJson** - JSON 文字列を Kafka Connect の Struct に変換する SMT (Single Message Transform) です。
- **StringCast** - バイト列を文字列に変換する SMT です。

## ビルド

```bash
./gradlew build
```

依存ライブラリを収集する場合:

```bash
./gradlew copyDeps
```

## 動作要件

- Java 11 以上
- Apache Kafka 4.2.0

## ライセンス

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
