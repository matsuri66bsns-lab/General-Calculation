import type { CategoryId } from '../core/types';
import { categoryOf } from '../tools/categories';

/** 配管の識別表示にならった矢印形の分類ラベル。色だけでなく分類名を必ず併記する */
export function CategoryTag({ id, size = 'md' }: { id: CategoryId; size?: 'sm' | 'md' }) {
  const c = categoryOf(id);
  return (
    <span className={`tag tag--${id} tag--${size}`} title={`JIS Z 9102 の識別色：${c.ident}`}>
      {c.name}
    </span>
  );
}
