import type { Category, CategoryId } from '../core/types';

export const CATEGORIES: Category[] = [
  { id: 'hvac', prefix: 'HV', name: '空調・換気', description: '換気量、空調負荷、ダクト、湿り空気など' },
  { id: 'plumbing', prefix: 'PL', name: '給排水衛生', description: '給水量、水槽容量、管径、ポンプなど' },
  { id: 'electrical', prefix: 'EL', name: '電気設備', description: '電圧降下、ケーブル選定、電力換算など' },
  { id: 'common', prefix: 'CM', name: '共通・単位換算', description: '圧力・流量・熱量などの単位換算' },
];

export function categoryOf(id: CategoryId): Category {
  const c = CATEGORIES.find((c) => c.id === id);
  if (!c) throw new Error(`未定義のカテゴリ: ${id}`);
  return c;
}
