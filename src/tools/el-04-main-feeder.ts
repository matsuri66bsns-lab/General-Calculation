import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { el04Beginner, el04Doc } from './docs/el-04';

export const mainFeeder: ToolDef = {
  id: 'EL-04',
  slug: 'main-feeder',
  category: 'electrical',
  title: '低圧幹線の許容電流と過電流遮断器',
  summary: '電動機等とその他の機器の定格電流から幹線の必要許容電流と過電流遮断器の定格の上限を求めます。',
  keywords: ['幹線', '低圧幹線', '許容電流', '過電流遮断器', '配線用遮断器', '電動機', '1.25倍', '1.1倍', '3倍', '2.5倍', '電技解釈', '148条'],
  references: ['電気設備の技術基準の解釈 第148条第1項（低圧幹線の許容電流と、低圧幹線を保護する過電流遮断器の定格電流）'],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'number',
      key: 'IM',
      label: '電動機等の定格電流の合計 ΣIM',
      unit: 'A',
      min: 0,
      help: '始動電流が大きい電動機など（電動機等）の定格電流の合計です。電動機がなければ 0 を入力します。',
    },
    { type: 'number', key: 'IH', label: '他の電気機械器具の定格電流の合計 ΣIH', unit: 'A', min: 0, help: '照明・電熱器など電動機等以外の定格電流の合計です。' },
    {
      type: 'select',
      key: 'iwMode',
      label: '過電流遮断器の計算に使う幹線の許容電流',
      display: 'segmented',
      options: [
        { value: 'input', label: '選んだ電線の値を入力' },
        { value: 'req', label: '必要値で計算' },
      ],
    },
    {
      type: 'number',
      key: 'IW',
      label: '選んだ電線の許容電流 IW',
      unit: 'A',
      min: 0,
      exclusiveMin: true,
      help: '実際に使う電線の許容電流（電流減少係数・補正係数を掛けた後の値）です。EL-03 で求められます。',
      visible: (v: RawValues) => v.iwMode === 'input',
    },
    {
      type: 'number',
      key: 'IB',
      label: '選定する過電流遮断器の定格電流（判定用）',
      unit: 'A',
      min: 0,
      exclusiveMin: true,
      suggestions: [
        { label: '50A', value: 50 },
        { label: '75A', value: 75 },
        { label: '100A', value: 100 },
        { label: '125A', value: 125 },
        { label: '150A', value: 150 },
        { label: '175A', value: 175 },
        { label: '200A', value: 200 },
      ],
    },
  ],
  defaults: { IM: '60', IH: '20', iwMode: 'input', IW: '88', IB: '175' },
  notes: [
    '需要率・力率などが明らかな場合は、これらによって適当に修正した負荷電流値以上の許容電流の電線を使うことができます（第148条の但し書き）。本ツールは修正前の値で計算しています。',
    '幹線の許容電流が 100A を超える場合で、過電流遮断器の定格電流の上限が標準定格に当たらないときは、その直近上位の標準定格とすることができます（第148条の但し書き）。本ツールの判定はこの扱いを含みません。',
    '過電流遮断器の定格の上限は、電動機等がある場合は「幹線の許容電流」と「3ΣIM + ΣIH と 2.5IW の小さい方」の大きい方、電動機等がない場合は幹線の許容電流です。',
    '値は電気設備の技術基準の解釈 第148条によります。設計では電気設備の技術基準の解釈の原文で確認してください。',
    '電動機の始動電流で遮断器が動作しないか、短絡電流を遮断できるか（遮断容量）は、メーカーの資料で別途確認してください。',
  ],
  doc: el04Doc,
  beginner: el04Beginner,
  build(v) {
    const IM = num(v, 'IM');
    const IH = num(v, 'IH');
    const useInput = str(v, 'iwMode') === 'input';
    const IB = num(v, 'IB');
    if (IM + IH <= 0) throw new CalcError('ΣIM と ΣIH の少なくとも一方に 0 より大きい値を入力してください。');

    const kM = IM <= IH ? 1 : IM <= 50 ? 1.25 : 1.1;
    const IWr = kM * IM + IH;
    const IW = useInput ? num(v, 'IW') : IWr;
    const IB1 = 3 * IM + IH;
    const IB2 = 2.5 * IW;
    const IBmax = IM > 0 ? Math.max(IW, Math.min(IB1, IB2)) : IW;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('IM', '電動機等の定格電流の合計', IM, { symbol: 'ΣIM', unit: 'A' })
      .input('IH', '他の電気機械器具の定格電流の合計', IH, { symbol: 'ΣIH', unit: 'A' })
      .section('幹線の許容電流')
      .calc('kM', '電動機等の電流に掛ける係数', {
        symbol: 'kM',
        value: kM,
        expr: '{IM} ≤ {IH} なら 1、{IM} ≤ 50 なら 1.25、それ以外は 1.1',
        formula: 'IF({IM}<={IH},1,IF({IM}<=50,1.25,1.1))',
        digits: 2,
        note: '第148条第1項',
      })
      .calc('IWr', '幹線に必要な許容電流', { symbol: 'IWr', unit: 'A', value: IWr, expr: '{kM} × {IM} + {IH}', formula: '{kM}*{IM}+{IH}', digits: 1 });

    if (useInput) {
      s.input('IW', '選んだ電線の許容電流', IW, { symbol: 'IW', unit: 'A' }).judge('okW', '電線の判定', IW >= IWr, {
        expr: '{IW} ≥ {IWr}',
        formula: 'IF({IW}>={IWr},"OK","NG")',
      });
    } else {
      s.calc('IW', '計算に用いる幹線の許容電流', { symbol: 'IW', unit: 'A', value: IW, expr: '{IWr}', formula: '{IWr}', digits: 1, note: '必要値をそのまま使う' });
    }

    s.section('過電流遮断器')
      .calc('IB1', '電動機等による上限', { symbol: 'IB₁', unit: 'A', value: IB1, expr: '3 × {IM} + {IH}', formula: '3*{IM}+{IH}', digits: 1, note: '電動機等がある場合' })
      .calc('IB2', '許容電流の2.5倍', { symbol: 'IB₂', unit: 'A', value: IB2, expr: '2.5 × {IW}', formula: '2.5*{IW}', digits: 1, note: '電動機等がある場合' })
      .calc('IBmax', '過電流遮断器の定格電流の上限', {
        symbol: 'IBmax',
        unit: 'A',
        value: IBmax,
        expr: '{IM} > 0 なら max({IW}, min({IB1}, {IB2}))、それ以外は {IW}',
        formula: 'IF({IM}>0,MAX({IW},MIN({IB1},{IB2})),{IW})',
        digits: 1,
      })
      .input('IB', '選定する過電流遮断器の定格電流', IB, { symbol: 'IB', unit: 'A' })
      .judge('okB', '遮断器の判定', IB <= IBmax, { expr: '{IB} ≤ {IBmax}', formula: 'IF({IB}<={IBmax},"OK","NG")' });

    s.highlight('IWr', ...(useInput ? ['okW'] : []), 'IBmax', 'okB');

    if (useInput && IW < IWr) s.warn('選んだ電線の許容電流が必要値を下回っています。太い電線を選んでください。');
    if (IB > IBmax) {
      s.warn(
        IW > 100
          ? '遮断器の定格が上限を超えています。許容電流が 100A を超えるので、上限が標準定格に当たらない場合は直近上位の標準定格まで選べます（第148条の但し書き）。原文で確認してください。'
          : '遮断器の定格が上限を超えています。定格の小さい遮断器を選ぶか、幹線を太くしてください。',
      );
    }
    return s.result();
  },
};
