# 設備計算ラボ（General-Calculation）

建築設備設計（空調・換気、給排水衛生、電気設備）のための汎用計算サイトです。
ブラウザだけで動き、インストールや会員登録は要りません。

## 主な機能

- 計算ツール（現在5件）
  - HV-01 必要換気量（換気回数・在室人員・CO₂濃度・火気使用室）
  - PL-01 受水槽・高置水槽容量
  - EL-01 電圧降下（内線規程の簡易式、判定・推奨サイズ付き）
  - EL-02 電力⇔電流換算
  - CM-01 単位換算（圧力・流量・熱量・エネルギー・温度）
- 計算根拠の表示：計算式と代入値を並べて表示
- Excel 出力：計算式を Excel の関数として書き込んだ計算書（.xlsx）。入力セルを変えると Excel 上で再計算される
- 印刷：A4 の計算書として印刷・PDF 保存
- 検索（Ctrl / ⌘ + K）、カテゴリ絞り込み、閲覧履歴、お気に入り、ダークモード（いずれもブラウザ内に保存）

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # テスト（計算値の検証、Excel 式と画面の値の一致確認）
npm run typecheck  # 型チェック
npm run build      # 本番ビルド（dist/）
```

技術構成：Vite + React + TypeScript、react-router（HashRouter）、exceljs（Excel 出力時のみ遅延読み込み）。
テストでは HyperFormula（Excel 互換の計算エンジン）で、出力する Excel 式を実際に評価しています。

## ディレクトリ構成

```
src/
  core/        計算書の行データ、数式の置換、入力の検証、Excel 出力、保存処理
  tools/       計算ツール本体（1ツール1ファイル）と登録一覧 registry.ts
  components/  画面部品（入力欄、結果表示、検索ダイアログなど）
  pages/       ホーム、ツール画面、履歴、このサイトについて
  styles/      デザイン（CSS 変数でライト／ダークを切替）
```

## ツールの追加方法

1. `src/tools/` にファイルを追加し、`ToolDef` を定義する
   - `fields`：入力フォームの定義（数値・選択）
   - `build`：計算本体。`SheetBuilder` で行を積み上げる
     - `input(key, ...)`：入力値の行
     - `calc(key, ..., { value, expr, formula })`：計算行
       - `value`：JavaScript で計算した値（画面表示用）
       - `expr`：表示用の式。`{key}` が記号と数値に置き換わる
       - `formula`：Excel 用の式。`{key}` がセル番地に置き換わる
     - `judge(...)`：OK / NG の判定行
2. `src/tools/registry.ts` の `TOOLS` に登録する
3. `src/__tests__/tools.test.ts` に手計算値のテストを追加する
   （Excel 式と `value` の一致は全ツール共通のテストで自動的に確認される）

## 公開

`main` へのマージで GitHub Pages に公開するワークフロー（`.github/workflows/deploy.yml`）を用意しています。
初回のみ、リポジトリの Settings → Pages → Source を「GitHub Actions」に設定してください。
`dist/` は静的ファイルのみなので、Vercel・Netlify・Cloudflare Pages などにもそのまま置けます。

## 免責

計算結果は設計検討の目安です。最終的な判断は最新の法令・規格・メーカー資料に基づき、設計者の責任で行ってください。
