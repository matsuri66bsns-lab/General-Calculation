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
  /** 使い方・注意事項 */
  notes?: string[];
  /** 公開日（YYYY-MM-DD）。新着表示に使う */
  publishedAt: string;
}
