/**
 * 計算書の表題欄・表紙に入れる案件情報と、Excel 出力の構成の選択。
 * どちらも端末（localStorage）に保存し、すべてのツールの計算書で共通に使う。
 */

export interface ProjectInfo {
  /** 工事名称（例：○○庁舎改修機械設備工事） */
  projectName: string;
  /** 施設・建物の名称 */
  buildingName: string;
  /** 設計者（会社・事務所名） */
  company: string;
  /** 作成者（設計担当者） */
  author: string;
  /** 照査者 */
  checker: string;
}

export const EMPTY_PROJECT: ProjectInfo = {
  projectName: '',
  buildingName: '',
  company: '',
  author: '',
  checker: '',
};

export const PROJECT_FIELDS: { key: keyof ProjectInfo; label: string; placeholder: string }[] = [
  { key: 'projectName', label: '工事名称', placeholder: '例：○○庁舎改修機械設備工事' },
  { key: 'buildingName', label: '施設名称', placeholder: '例：○○庁舎' },
  { key: 'company', label: '設計者（会社・事務所名）', placeholder: '例：○○設計事務所' },
  { key: 'author', label: '作成者', placeholder: '例：設備 太郎' },
  { key: 'checker', label: '照査者', placeholder: '例：照査 花子' },
];

/** Excel 計算書に含める内容 */
export interface ExportOptions {
  /** 表紙 */
  cover: boolean;
  /** 計算式の解説 */
  formulas: boolean;
  /** 記号の説明 */
  symbols: boolean;
  /** 根拠と注意事項（参考規格・注意事項・警告） */
  notes: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  cover: true,
  formulas: true,
  symbols: true,
  notes: true,
};

export const EXPORT_OPTION_FIELDS: { key: keyof ExportOptions; label: string; desc: string }[] = [
  { key: 'cover', label: '表紙', desc: '標題・工事名称・作成年月日・設計者・作成者・照査者' },
  { key: 'formulas', label: '計算式の解説', desc: '画面の「計算式の解説」と同じ内容' },
  { key: 'symbols', label: '記号の説明', desc: '記号・何の略か・意味・単位の表' },
  { key: 'notes', label: '根拠と注意事項', desc: '参考規格・文献、注意事項、計算時の警告' },
];
