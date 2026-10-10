import { describe, expect, it } from 'vitest';
import { closeTab, openTab } from '../core/tabs';

describe('ツールのタブ', () => {
  it('開くと末尾に追加し、開いていれば並びを変えない', () => {
    expect(openTab([], 'EL-01')).toEqual(['EL-01']);
    const tabs = ['EL-01', 'HV-01'];
    expect(openTab(tabs, 'EL-01')).toBe(tabs);
  });

  it('上限を超えたら、開くタブ以外の最も古いものを閉じる', () => {
    expect(openTab(['A', 'B', 'C'], 'D', 3)).toEqual(['B', 'C', 'D']);
  });

  it('表示中のタブを閉じると右隣、なければ左隣を次に表示する', () => {
    expect(closeTab(['A', 'B', 'C'], 'B', 'B')).toEqual({ tabs: ['A', 'C'], next: 'C' });
    expect(closeTab(['A', 'B', 'C'], 'C', 'C')).toEqual({ tabs: ['A', 'B'], next: 'B' });
    expect(closeTab(['A'], 'A', 'A')).toEqual({ tabs: [], next: null });
  });

  it('表示中でないタブを閉じても表示は変えない', () => {
    expect(closeTab(['A', 'B', 'C'], 'A', 'C')).toEqual({ tabs: ['B', 'C'], next: 'C' });
    expect(closeTab(['A', 'B'], 'A', null)).toEqual({ tabs: ['B'], next: null });
  });
});
