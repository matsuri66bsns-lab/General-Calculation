import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { fp01Beginner, fp01Doc } from './docs/fp-01';

/** 屋内消火栓の種類ごとの規定値（消防法施行令第11条第3項、施行規則第12条） */
export const HYDRANT_TYPES: Record<
  string,
  { label: string; P: number; q: number; w: number; qp: number; h4: number }
> = {
  no1: { label: '1号消火栓（易操作性1号消火栓を含む）', P: 0.17, q: 130, w: 2.6, qp: 150, h4: 17 },
  no2: { label: '2号消火栓', P: 0.25, q: 60, w: 1.2, qp: 70, h4: 25 },
  wide2: { label: '広範囲型2号消火栓', P: 0.17, q: 80, w: 1.6, qp: 90, h4: 17 },
};

export const indoorHydrant: ToolDef = {
  id: 'FP-01',
  slug: 'indoor-hydrant',
  category: 'fire',
  title: '屋内消火栓の水源・ポンプ',
  summary: '屋内消火栓の種類と設置個数から、水源水量・ポンプ吐出量・全揚程を求めます。',
  keywords: ['屋内消火栓', '1号消火栓', '2号消火栓', '易操作性1号', '広範囲型2号', '水源水量', '消火ポンプ', '全揚程', '加圧送水装置'],
  references: [
    '消防法施行令 第11条第3項（屋内消火栓設備の水源・放水圧力・放水量）',
    '消防法施行規則 第12条第1項第7号ハ（1号消火栓のポンプ吐出量・全揚程）',
    '消防法施行規則 第12条第2項（2号消火栓のポンプ吐出量・全揚程）、第3項（広範囲型2号消火栓のポンプ吐出量。全揚程は第1項第7号ハの例による）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'type',
      label: '消火栓の種類',
      display: 'segmented',
      options: [
        { value: 'no1', label: '1号（易操作性含む）' },
        { value: 'no2', label: '2号' },
        { value: 'wide2', label: '広範囲型2号' },
      ],
    },
    {
      type: 'number',
      key: 'N',
      label: '設置個数（最も多い階）',
      unit: '個',
      min: 1,
      help: '消火栓の設置個数が最も多い階の個数を入力します。計算では2個を上限とします。',
    },
    {
      type: 'number',
      key: 'h1',
      label: 'ホースの摩擦損失水頭 h1',
      unit: 'm',
      min: 0,
      help: 'ホースの種類・長さに応じた摩擦損失です。告示の摩擦損失表やメーカー資料から求めて入力します。',
    },
    {
      type: 'number',
      key: 'h2',
      label: '配管の摩擦損失水頭 h2',
      unit: 'm',
      min: 0,
      help: '最遠の消火栓までの配管・継手・弁類の摩擦損失の合計です。',
    },
    {
      type: 'number',
      key: 'h3',
      label: '落差 h3',
      unit: 'm',
      min: 0,
      help: 'ポンプの吸込み水面から最高位の消火栓（ノズル）までの高さです。',
    },
  ],
  defaults: { type: 'no1', N: '3', h1: '4', h2: '10', h3: '20' },
  notes: [
    '水源水量・吐出量は、設置個数が最も多い階の個数（2個を超えるときは2個）で計算します（施行令第11条第3項、施行規則第12条）。',
    '全揚程は H = h1 + h2 + h3 + ノズル先端の放水圧力換算水頭（1号・広範囲型2号は17m、2号は25m）です。',
    'ポンプを他の消防用設備等と兼用する場合は、それぞれの吐出量を加算して選定します。',
    '水源には有効水量（フート弁・吸水口より上の部分）だけを数えます。水槽の実容量は有効水量より大きくなります。',
    '消防用設備等は、所轄消防署の指導によって取扱いが異なる場合があります。設計の前に所轄消防と協議してください。',
  ],
  doc: fp01Doc,
  beginner: fp01Beginner,
  build(v) {
    const t = HYDRANT_TYPES[str(v, 'type')];
    const N = num(v, 'N');
    const h1 = num(v, 'h1');
    const h2 = num(v, 'h2');
    const h3 = num(v, 'h3');
    if (!Number.isInteger(N)) throw new CalcError('設置個数は整数（1以上）で入力してください。');

    const Nc = Math.min(N, 2);
    const s = new SheetBuilder();
    s.section('計算条件')
      .input('type', '消火栓の種類', t.label)
      .input('P', 'ノズル先端の放水圧力（規定値）', t.P, { symbol: 'p', unit: 'MPa', digits: 2, note: '施行令第11条第3項（以上であること）' })
      .input('q', '1個当たりの放水量（規定値）', t.q, { symbol: 'q', unit: 'L/min', note: '施行令第11条第3項（以上であること）' })
      .input('w', '1個当たりの水源水量', t.w, { symbol: 'w', unit: 'm³', digits: 1, note: '施行令第11条第3項' })
      .input('qp', '1個当たりのポンプ吐出量', t.qp, { symbol: 'qp', unit: 'L/min', note: '施行規則第12条第1項第7号ハ・第2項・第3項' })
      .input('h4', '放水圧力の換算水頭', t.h4, { symbol: 'h4', unit: 'm', note: '施行規則第12条の全揚程の式の定数' })
      .section('入力値')
      .input('N', '設置個数（最も多い階）', N, { symbol: 'N', unit: '個', digits: 0 })
      .input('h1', 'ホースの摩擦損失水頭', h1, { symbol: 'h1', unit: 'm', digits: 1 })
      .input('h2', '配管の摩擦損失水頭', h2, { symbol: 'h2', unit: 'm', digits: 1 })
      .input('h3', '落差', h3, { symbol: 'h3', unit: 'm', digits: 1 })
      .section('計算')
      .calc('Nc', '計算に用いる個数', { symbol: 'Nc', unit: '個', value: Nc, expr: 'min({N}, 2)', formula: 'MIN({N},2)', digits: 0, note: '2個を超えるときは2個' })
      .calc('Vw', '水源水量', { symbol: 'Vw', unit: 'm³', value: Nc * t.w, expr: '{Nc} × {w}', formula: '{Nc}*{w}', digits: 1 })
      .calc('Qp', 'ポンプ吐出量', { symbol: 'Qp', unit: 'L/min', value: Nc * t.qp, expr: '{Nc} × {qp}', formula: '{Nc}*{qp}', digits: 0 })
      .calc('H', 'ポンプ全揚程', {
        symbol: 'H',
        unit: 'm',
        value: h1 + h2 + h3 + t.h4,
        expr: '{h1} + {h2} + {h3} + {h4}',
        formula: '{h1}+{h2}+{h3}+{h4}',
        digits: 1,
      })
      .highlight('Vw', 'Qp', 'H');
    return s.result();
  },
};
