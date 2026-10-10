import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { cm02Beginner, cm02Doc } from './docs/cm-02';

const isMethod = (m: string) => (v: RawValues) => v.method === m;
const isUnit = (u: string) => (v: RawValues) => v.qunit === u;

export const pipeVelocity: ToolDef = {
  id: 'CM-02',
  slug: 'pipe-velocity',
  category: 'common',
  title: '管内流速・必要内径',
  summary: '連続の式 Q = A·v で、流量と管内径から流速を、または目標流速から必要な内径を求めます。',
  keywords: ['流速', '管内流速', '管径', '内径', '連続の式', '流量', 'L/min', 'm3/h', '配管サイズ', '口径'],
  references: [
    '連続の式（流量 = 断面積 × 平均流速）。流体力学の基本式',
    '空気調和・衛生工学便覧（管内流速の目安）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'method',
      label: '計算方式',
      display: 'segmented',
      options: [
        { value: 'v', label: '流速を求める' },
        { value: 'd', label: '必要内径を求める' },
      ],
    },
    {
      type: 'select',
      key: 'qunit',
      label: '流量の単位',
      display: 'segmented',
      options: [
        { value: 'Lmin', label: 'L/min' },
        { value: 'm3h', label: 'm³/h' },
      ],
    },
    { type: 'number', key: 'QL', label: '流量', unit: 'L/min', min: 0, exclusiveMin: true, visible: isUnit('Lmin') },
    { type: 'number', key: 'Qh', label: '流量', unit: 'm³/h', min: 0, exclusiveMin: true, visible: isUnit('m3h') },
    {
      type: 'number',
      key: 'd',
      label: '管内径（実内径）',
      unit: 'mm',
      min: 0,
      exclusiveMin: true,
      visible: isMethod('v'),
      help: '呼び径ではなく、管の規格やメーカー資料に載っている実際の内径を入力してください。',
    },
    {
      type: 'number',
      key: 'vt',
      label: '目標流速',
      unit: 'm/s',
      min: 0,
      exclusiveMin: true,
      visible: isMethod('d'),
      help: '目安として、給水管は 2.0 m/s 以下とすることが多いです（ウォーターハンマーや騒音を抑えるため）。案件の設計基準を確認してください。',
      suggestions: [
        { label: '1.0', value: 1 },
        { label: '1.5', value: 1.5 },
        { label: '2.0', value: 2 },
      ],
    },
  ],
  defaults: { method: 'v', qunit: 'Lmin', QL: '100', Qh: '6', d: '40', vt: '1.5' },
  notes: [
    '流速は管の断面で平均した値です。管内径には呼び径ではなく実内径を使ってください。',
    '流速の目安（給水管 2.0 m/s 以下など）は便覧などに示される一般的な値で、法令の基準ではありません。',
    '必要内径は計算上の最小値です。実際の管は、この値以上の実内径をもつ呼び径を管の規格表から選んでください。',
  ],
  doc: cm02Doc,
  beginner: cm02Beginner,
  build(v) {
    const method = str(v, 'method');
    const lmin = str(v, 'qunit') === 'Lmin';
    const Q = lmin ? num(v, 'QL') : num(v, 'Qh');
    const Qs = lmin ? Q / 60000 : Q / 3600;

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('method', '計算方式', method === 'v' ? '流量と管内径から流速を求める' : '流量と目標流速から必要内径を求める')
      .section('入力値')
      .input('Q', '流量', Q, { symbol: 'Q', unit: lmin ? 'L/min' : 'm³/h' })
      .calc('Qs', '流量（m³/s 換算）', {
        symbol: 'Qs',
        unit: 'm³/s',
        value: Qs,
        expr: lmin ? '{Q} ÷ 60000' : '{Q} ÷ 3600',
        formula: lmin ? '{Q}/60000' : '{Q}/3600',
        digits: 6,
        note: lmin ? '1 m³ = 1000 L、1 min = 60 s' : '1 h = 3600 s',
      });

    if (method === 'v') {
      const d = num(v, 'd');
      const A = (Math.PI * (d / 1000) ** 2) / 4;
      const vel = Qs / A;
      s.input('d', '管内径', d, { symbol: 'd', unit: 'mm' })
        .section('計算')
        .calc('A', '管の断面積', { symbol: 'A', unit: 'm²', value: A, expr: 'π × ({d} ÷ 1000)² ÷ 4', formula: 'PI()*({d}/1000)^2/4', digits: 6 })
        .calc('vel', '管内流速', { symbol: 'v', unit: 'm/s', value: vel, expr: '{Qs} ÷ {A}', formula: '{Qs}/{A}', digits: 2 })
        .highlight('vel');
      return s.result();
    }

    const vt = num(v, 'vt');
    if (vt <= 0) throw new CalcError('目標流速は 0 より大きい値を入力してください。');
    const Ar = Qs / vt;
    const dr = Math.sqrt((4 * Ar) / Math.PI) * 1000;
    s.input('vt', '目標流速', vt, { symbol: 'vt', unit: 'm/s' })
      .section('計算')
      .calc('Ar', '必要断面積', { symbol: 'Ar', unit: 'm²', value: Ar, expr: '{Qs} ÷ {vt}', formula: '{Qs}/{vt}', digits: 6 })
      .calc('dr', '必要内径', {
        symbol: 'dr',
        unit: 'mm',
        value: dr,
        expr: '√(4 × {Ar} ÷ π) × 1000',
        formula: 'SQRT(4*{Ar}/PI())*1000',
        digits: 1,
        note: 'この値以上の実内径をもつ管を選びます',
      })
      .highlight('dr');
    return s.result();
  },
};
