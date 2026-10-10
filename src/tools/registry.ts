import type { CategoryId, ToolDef } from '../core/types';
import { ventilation } from './hv-01-ventilation';
import { waterTank } from './pl-01-water-tank';
import { voltageDrop } from './el-01-voltage-drop';
import { powerCurrent } from './el-02-power-current';
import { unitConvert } from './cm-01-unit-convert';

/**
 * 公開するツールの一覧。新しいツールはファイルを追加してここに登録する。
 */
export const TOOLS: ToolDef[] = [ventilation, waterTank, voltageDrop, powerCurrent, unitConvert];

export function findTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function findToolById(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function toolsIn(category: CategoryId): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}

/** 検索。ID・名称・概要・キーワードに対して、空白区切りの全語を含むものを返す */
export function searchTools(query: string): ToolDef[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return TOOLS;
  return TOOLS.filter((t) => {
    const hay = [t.id, t.title, t.summary, ...t.keywords].join(' ').toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}
