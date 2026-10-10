/**
 * 計算ツールの共通型。
 *
 * 1つのツールは「入力フォームの定義（fields）」と「計算本体（build）」で構成する。
 * build は画面表示・計算根拠・Excel出力のすべてに使う行データ（SheetRow）を返す。
 * 計算式は次の2通りで書く。
 *   - expr    : 画面表示用の式。{key} は記号と数値に置き換えて表示する
 *   - formula : Excel 用の式。{key} はセル番地に置き換えて出力する
 */

export type CategoryId = 'hvac' | 'plumbing' | 'electrical' | 'common';

export interface Category {
  id: CategoryId;
  /** ツールIDの接頭辞（HV, PL, EL, CM） */
  prefix: string;
  name: string;
  description: string;
  /** JIS Z 9102 の識別色の意味（分類ラベルの色の説明） */
  ident: string;
}

/** フォームの生の入力値。編集途中の "0." なども保持するため文字列で持つ */
export type RawValues = Record<string, string>;
/** 型変換後の入力値。number フィールドは数値、select フィールドは文字列 */
export type Values = Record<string, number | string>;

export interface NumberField {
  type: 'number';
  key: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  /** 下限値そのものを不可とする（0より大きい、など） */
  exclusiveMin?: boolean;
  step?: number;
  help?: string;
  /** よく使う値の候補。押すとその値が入る */
  suggestions?: { label: string; value: number }[];
  visible?: (v: RawValues) => boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  /** 選んだときに他のフィールドへ入れる値（用途別の原単位など） */
  apply?: RawValues;
}

export interface SelectField {
  type: 'select';
  key: string;
  label: string;
  options: SelectOption[];
  help?: string;
  /** 'segmented' は選択肢が少ないときのボタン型表示 */
  display?: 'dropdown' | 'segmented';
  visible?: (v: RawValues) => boolean;
}

export type Field = NumberField | SelectField;

export interface InputRow {
  kind: 'input';
  key: string;
  symbol?: string;
  label: string;
  value: number | string;
  unit?: string;
  note?: string;
  digits?: number;
}

export interface CalcRow {
  kind: 'calc';
  key: string;
  symbol?: string;
  label: string;
  value: number | string;
  unit?: string;
  expr: string;
  formula: string;
  digits?: number;
  note?: string;
  /** 'judge' は値 "OK" / "NG" を合否として色付けする */
  format?: 'number' | 'judge' | 'text';
}

export interface SectionRow {
  kind: 'section';
  label: string;
}

export type SheetRow = InputRow | CalcRow | SectionRow;

export interface CalcResult {
  rows: SheetRow[];
  /** 結果カードとして大きく表示する行の key */
  highlights: string[];
  warnings: string[];
}

/** 記号・略号の説明。「何の略か」と「どんな意味か」を分けて書く */
export interface SymbolDoc {
  symbol: string;
  /** 何の略か・由来（例：Area（面積）の頭文字）。本サイト独自の表記はその旨を書く */
  origin: string;
  meaning: string;
  unit?: string;
}

/** 計算式の解説。入力（計算方式など）によって内容が変わるので build と同じ値から作る */
export interface ToolDoc {
  formulas: { title: string; expr: string; body: string }[];
  symbols: SymbolDoc[];
}

/** 初学者向けの解説（画面の末尾に折りたたみで表示） */
export interface BeginnerDoc {
  /** そもそも何を求める計算か、設計のどの段階で使うか */
  purpose: string[];
  /** 用語と単位 */
  terms: { term: string; desc: string }[];
  /** 手計算の例 */
  example: { title: string; steps: string[] };
  /** よくある間違い・注意点 */
  pitfalls: string[];
}

export interface ToolDef {
  /** 例: HV-01 */
  id: string;
  slug: string;
  category: CategoryId;
  title: string;
  summary: string;
  keywords: string[];
  /** 根拠とする法令・規格・文献 */
  references: string[];
  fields: Field[];
  defaults: RawValues;
  build: (v: Values) => CalcResult;
  /** 計算式の解説と記号の説明 */
  doc: (v: Values) => ToolDoc;
  /** 初学者向けの解説 */
  beginner: BeginnerDoc;
  /** 使い方・注意事項 */
  notes?: string[];
  /** 公開日（YYYY-MM-DD）。新着表示に使う */
  publishedAt: string;
}
