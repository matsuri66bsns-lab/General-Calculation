import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num } from '../core/values';
import { fp07Beginner, fp07Doc } from './docs/fp-07';

export const naturalSmokeVent: ToolDef = {
  id: 'FP-07',
  slug: 'natural-smoke-vent',
  category: 'fire',
  title: '自然排煙口の必要開口面積',
  summary: '防煙区画の床面積から自然排煙口の必要有効開口面積（床面積の1/50）を求め、設計値を判定します。',
  keywords: ['排煙', '自然排煙', '排煙口', '有効開口面積', '1/50', '防煙区画', '建築基準法', '排煙窓'],
  references: [
    '建築基準法施行令 第126条の3第1項第8号（直接外気に接する排煙口の開口面積 1/50）',
    '建築基準法施行令 第126条の3第1項第1号（防煙区画 500 m² 以内）・第3号（排煙口の位置）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'number', key: 'A', label: '防煙区画の床面積', unit: 'm²', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'Ad',
      label: '設計した排煙口の有効開口面積',
      unit: 'm²',
      min: 0,
      help: '防煙区画内の排煙口（直接外気に接するもの）の有効開口面積の合計です。窓は開き方によって有効な面積が変わるので、開いた部分の面積で入力します。',
    },
  ],
  defaults: { A: '300', Ad: '7' },
  notes: [
    '直接外気に接する排煙口は、防煙区画の床面積の 1/50 以上の開口面積が必要です（建築基準法施行令第126条の3第1項第8号）。満たさない場合は排煙機を設けます。',
    '排煙口は、防煙区画の各部分から水平距離 30 m 以下となるように、天井または国土交通大臣が定める壁の部分に設けます（同項第3号）。壁に設ける場合の有効な高さの範囲は告示で確認してください。',
    '引違い窓・すべり出し窓・内倒し窓などは、開き方によって有効開口面積の算定方法が異なります。特定行政庁や確認検査機関の取扱いを確認してください。',
    '排煙設備は、建築主事・指定確認検査機関や所轄消防の指導によって取扱いが異なる場合があります。設計の前に協議してください。',
  ],
  doc: fp07Doc,
  beginner: fp07Beginner,
  build(v) {
    const A = num(v, 'A');
    const Ad = num(v, 'Ad');
    const Ae = A / 50;
    const s = new SheetBuilder();
    s.section('入力値')
      .input('A', '防煙区画の床面積', A, { symbol: 'A', unit: 'm²', digits: 2 })
      .input('Ad', '設計した有効開口面積', Ad, { symbol: 'Ad', unit: 'm²', digits: 2 })
      .section('計算')
      .calc('Ae', '必要有効開口面積', { symbol: 'Ae', unit: 'm²', value: Ae, expr: '{A} ÷ 50', formula: '{A}/50', digits: 2 })
      .judge('ok', '判定', Ad >= Ae, { expr: '{Ad} ≥ {Ae}', formula: 'IF({Ad}>={Ae},"OK","NG")' })
      .highlight('Ae', 'ok');
    if (Ad < Ae) s.warn(`有効開口面積が ${(Ae - Ad).toFixed(2)} m² 不足しています。排煙口を追加するか、排煙機による機械排煙を検討してください。`);
    if (A > 500) s.warn('防煙区画の床面積が 500 m² を超えています。防煙区画は床面積 500 m² 以内ごとに区画します（建築基準法施行令第126条の3第1項第1号）。');
    return s.result();
  },
};
