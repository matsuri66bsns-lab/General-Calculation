import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { str } from '../core/values';
import { CalcError } from '../core/errors';
import { WIRES, findWire } from './el-03-allowable-current';
import { el05Beginner, el05Doc } from './docs/el-05';

/**
 * 分岐回路の過電流遮断器の定格電流と、軟銅線の太さ・コンセントの定格電流の組合せ（電気設備の技術基準の解釈 第149条）。
 * outMin が 0 のものは「◯A以下」で下限なし。
 */
const BREAKERS: Record<string, { label: string; wire: string; outMin: number; outMax: number; outLabel: string }> = {
  '15': { label: '15A以下', wire: 's1.6', outMin: 0, outMax: 15, outLabel: '15A以下' },
  '20m': { label: '15A超20A以下の配線用遮断器', wire: 's1.6', outMin: 0, outMax: 20, outLabel: '20A以下（15A、20A）' },
  '20f': { label: '15A超20A以下（配線用遮断器以外：ヒューズなど）', wire: 's2.0', outMin: 20, outMax: 20, outLabel: '20A（20A未満の差込みプラグが接続できるものを除く）' },
  '30': { label: '20A超30A以下', wire: 's2.6', outMin: 20, outMax: 30, outLabel: '20A以上30A以下（20A未満の差込みプラグが接続できるものを除く）' },
  '40': { label: '30A超40A以下', wire: 'y8', outMin: 30, outMax: 40, outLabel: '30A以上40A以下' },
  '50': { label: '40A超50A以下', wire: 'y14', outMin: 40, outMax: 50, outLabel: '40A以上50A以下' },
};

/** 分岐回路で選べる電線（EL-03 の表の 38 mm² まで） */
const BRANCH_WIRES = WIRES.slice(0, WIRES.findIndex((w) => w.value === 'y38') + 1);

export const branchCircuit: ToolDef = {
  id: 'EL-05',
  slug: 'branch-circuit',
  category: 'electrical',
  title: '低圧分岐回路の遮断器・電線・コンセント',
  summary: '分岐回路の過電流遮断器の定格から、使える電線の最小太さとコンセントの定格を示し、組合せを判定します。',
  keywords: ['分岐回路', '配線用遮断器', 'ブレーカー', 'コンセント', '電線の太さ', '1.6mm', '2.0mm', '20A', '30A', '電技解釈', '149条'],
  references: ['電気設備の技術基準の解釈 第149条第1項第一号・第2項第一号（149-1表〜149-3表。低圧分岐回路の過電流遮断器の定格電流と、電線の太さ・コンセントの組合せ）'],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'cb',
      label: '分岐回路の過電流遮断器の定格電流',
      options: Object.entries(BREAKERS).map(([value, b]) => ({ value, label: b.label })),
    },
    {
      type: 'select',
      key: 'w',
      label: '実際に使う電線の太さ（軟銅線）',
      options: BRANCH_WIRES.map((w) => ({ value: w.value, label: w.label })),
      help: '括弧内は第146条の基準の許容電流です。太さの比較にこの値を使います。',
    },
    {
      type: 'select',
      key: 'o',
      label: 'コンセントの定格電流',
      options: [
        { value: 'none', label: 'コンセントなし（判定しない）' },
        { value: '15', label: '15A' },
        { value: '20', label: '20A' },
        { value: '30', label: '30A' },
        { value: '40', label: '40A' },
        { value: '50', label: '50A' },
      ],
    },
  ],
  defaults: { cb: '20m', w: 's1.6', o: '15' },
  notes: [
    '組合せは電気設備の技術基準の解釈 第149条第2項第一号の 149-1表（電線の太さ）と 149-3表（コンセント）によります（令和7年11月20日改正の解釈で確認）。',
    '表の電線の太さは軟銅線の値です。MI ケーブルには別の値があります。また、1個のコンセント・ソケットなどから分岐点に至る長さ 3m 以下の部分は、細い電線が認められます（149-2表：15A超20A以下（配線用遮断器を除く）と 20A超30A以下は直径 1.6 mm、30A超50A以下は直径 2 mm）。本ツールはこの例外を判定しません。',
    '149-1表は「軟銅線若しくはこれと同等以上の許容電流のあるもの」としているため、本ツールでは電線の太さの比較を第146条の基準の許容電流（周囲温度 30℃以下）で行っています。たとえば 2 mm² より線は直径 1.6 mm と同じ 27 A なので、1.6 mm の代わりに使えるとして判定します。',
    '電線は、この表の太さに加えて許容電流（EL-03）と電圧降下（EL-01）も満たす必要があります。',
    '分岐回路の過電流遮断器を分岐点から3mを超える位置に設ける場合の条件（8m以下で許容電流が幹線の遮断器定格の35%以上、または55%以上）は第149条第1項によります。',
  ],
  doc: el05Doc,
  beginner: el05Beginner,
  build(v) {
    const b = BREAKERS[str(v, 'cb')];
    if (!b) throw new CalcError('過電流遮断器の定格電流を選び直してください。');
    const wmin = findWire(b.wire);
    const wsel = findWire(str(v, 'w'));
    const o = str(v, 'o');

    const s = new SheetBuilder();
    s.section('組合せの基準（第149条）')
      .input('cb', '過電流遮断器の定格電流', b.label)
      .input('wmin', '電線の最小太さ（軟銅線）', wmin.short)
      .input('Imin', '最小太さの基準の許容電流', wmin.I0, { symbol: 'I₀min', unit: 'A', note: '第146条の表' })
      .input('olabel', '使えるコンセントの定格電流', b.outLabel)
      .section('電線の判定')
      .input('wsel', '実際に使う電線の太さ', wsel.short)
      .input('Isel', '実際に使う電線の基準の許容電流', wsel.I0, { symbol: 'I₀', unit: 'A', note: '第146条の表' })
      .judge('okW', '電線の判定', wsel.I0 >= wmin.I0, { expr: '{Isel} ≥ {Imin}', formula: 'IF({Isel}>={Imin},"OK","NG")' });

    const keys = ['wmin', 'olabel', 'okW'];
    if (o !== 'none') {
      const Ic = Number(o);
      s.section('コンセントの判定').input('Ic', 'コンセントの定格電流', Ic, { symbol: 'Ic', unit: 'A' });
      if (b.outMin > 0) {
        s.input('Icmin', 'コンセントの定格電流の下限', b.outMin, { symbol: 'Icmin', unit: 'A' })
          .input('Icmax', 'コンセントの定格電流の上限', b.outMax, { symbol: 'Icmax', unit: 'A' })
          .judge('okO', 'コンセントの判定', Ic >= b.outMin && Ic <= b.outMax, {
            expr: '{Icmin} ≤ {Ic} ≤ {Icmax}',
            formula: 'IF(AND({Ic}>={Icmin},{Ic}<={Icmax}),"OK","NG")',
          });
      } else {
        s.input('Icmax', 'コンセントの定格電流の上限', b.outMax, { symbol: 'Icmax', unit: 'A' }).judge('okO', 'コンセントの判定', Ic <= b.outMax, {
          expr: '{Ic} ≤ {Icmax}',
          formula: 'IF({Ic}<={Icmax},"OK","NG")',
        });
      }
      keys.push('okO');
      if (Ic < b.outMin || Ic > b.outMax) s.warn(`この遮断器に接続できるコンセントは ${b.outLabel} です。`);
    }
    s.highlight(...keys);
    if (wsel.I0 < wmin.I0) s.warn(`電線が細すぎます。${wmin.short} 以上（基準の許容電流 ${wmin.I0} A 以上）の電線を使ってください。`);
    return s.result();
  },
};
