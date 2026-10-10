import type { Category, CategoryId } from '../core/types';

/**
 * 分類の色は JIS Z 9102（配管系の識別表示）の識別色に対応させる。
 * 空調＝空気（白）、給排水＝水（青）、電気＝電気（うすい黄赤）。共通は該当がないため灰色。
 */
export const CATEGORIES: Category[] = [
  { id: 'hvac', prefix: 'HV', name: '空調・換気', description: '換気量、空調負荷、ダクト、湿り空気など', ident: '空気（白）' },
  { id: 'plumbing', prefix: 'PL', name: '給排水衛生', description: '給水量、水槽容量、管径、ポンプなど', ident: '水（青）' },
  { id: 'electrical', prefix: 'EL', name: '電気設備', description: '電圧降下、ケーブル選定、電力換算など', ident: '電気（うすい黄赤）' },
  { id: 'common', prefix: 'CM', name: '共通・単位換算', description: '圧力・流量・熱量などの単位換算', ident: '共通（灰）' },
];

export function categoryOf(id: CategoryId): Category {
  const c = CATEGORIES.find((c) => c.id === id);
  if (!c) throw new Error(`未定義のカテゴリ: ${id}`);
  return c;
}
