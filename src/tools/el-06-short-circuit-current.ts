import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { el06Beginner, el06Doc } from './docs/el-06';

const rx = (v: RawValues) => v.method === 'rx';
const scalar = (v: RawValues) => v.method !== 'rx';

export const shortCircuitCurrent: ToolDef = {
  id: 'EL-06',
  slug: 'short-circuit-current',
  category: 'electrical',
  title: '三相短絡電流',
  summary: '％インピーダンス法で電源・変圧器・ケーブルを合成し、三相短絡電流と遮断器の遮断容量を判定します。',
  keywords: ['短絡電流', '三相短絡', '％インピーダンス', 'パーセントインピーダンス', '%Z', '短絡容量', '遮断容量', '定格遮断電流', '基準容量', '変圧器', 'ケーブル'],
  references: [
    '高圧受電設備規程 JEAC 8011 資料（短絡電流の計算、％インピーダンス法）',
    '内線規程 JEAC 8001 資料（低圧回路の短絡電流の計算）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'method',
      label: '合成の方式',
      display: 'segmented',
      options: [
        { value: 'z', label: '％Z のスカラー和' },
        { value: 'rx', label: 'R と X を分けて合成' },
      ],
      help: 'スカラー和は簡易法です。ケーブルを含む低圧回路では、R と X を分けて合成する方式のほうが実際に近い値になります。',
    },
    {
      type: 'number',
      key: 'Pb',
      label: '基準容量',
      unit: 'kVA',
      min: 0,
      exclusiveMin: true,
      help: '計算の物差しにする容量です。どの値でも結果は同じですが、電力会社から示される受電点の％Z の基準容量（10,000 kVA が多い）に合わせると換算の手間が減ります。',
      suggestions: [
        { label: '10,000 kVA', value: 10000 },
        { label: '1,000 kVA', value: 1000 },
      ],
    },
    {
      type: 'number',
      key: 'V',
      label: '短絡点の線間電圧（基準電圧）',
      unit: 'V',
      min: 0,
      exclusiveMin: true,
      help: '短絡電流を求めたい点の線間電圧です。変圧器の二次側で求めるときは二次電圧を入れます。',
      suggestions: [
        { label: '6,600V', value: 6600 },
        { label: '420V', value: 420 },
        { label: '210V', value: 210 },
      ],
    },
    {
      type: 'select',
      key: 'src',
      label: '電源側（受電点）の入力方法',
      display: 'segmented',
      options: [
        { value: 'mva', label: '短絡容量 MVA' },
        { value: 'pz', label: '％Z（基準容量換算済み）' },
      ],
      help: '受電点の短絡容量または％インピーダンスは、電力会社に確認した値を入れます。',
    },
    { type: 'number', key: 'Ps', label: '受電点の三相短絡容量', unit: 'MVA', min: 0, exclusiveMin: true, visible: (v) => v.src !== 'pz' },
    {
      type: 'number',
      key: 'Zs',
      label: '電源側の％インピーダンス（基準容量で表した値）',
      unit: '%',
      min: 0,
      exclusiveMin: true,
      visible: (v) => v.src === 'pz',
    },
    {
      type: 'select',
      key: 'tr',
      label: '変圧器',
      display: 'segmented',
      options: [
        { value: 'yes', label: '含める（二次側で計算）' },
        { value: 'no', label: '含めない（受電点で計算）' },
      ],
    },
    {
      type: 'number',
      key: 'Pt',
      label: '変圧器の定格容量',
      unit: 'kVA',
      min: 0,
      exclusiveMin: true,
      visible: (v) => v.tr !== 'no',
      suggestions: [
        { label: '300', value: 300 },
        { label: '500', value: 500 },
        { label: '750', value: 750 },
        { label: '1,000', value: 1000 },
      ],
    },
    {
      type: 'number',
      key: 'Zt',
      label: '変圧器の％インピーダンス（自己容量基準）',
      unit: '%',
      min: 0,
      exclusiveMin: true,
      visible: (v) => v.tr !== 'no',
      help: '銘板または試験成績書の値を入れます。',
    },
    {
      type: 'number',
      key: 'Rt',
      label: '変圧器の％抵抗（自己容量基準）',
      unit: '%',
      min: 0,
      visible: (v) => v.tr !== 'no' && rx(v),
      help: '試験成績書の負荷損から ％R = 負荷損 [kW] ÷ 定格容量 [kVA] × 100 で求められます。％Z より小さい値です。',
    },
    {
      type: 'select',
      key: 'cable',
      label: 'ケーブル（短絡点までの区間）',
      options: [
        { value: 'none', label: '含めない' },
        { value: 'ohm', label: '抵抗・リアクタンス（Ω/km）と長さで入力' },
        { value: 'pz', label: '％インピーダンス（基準容量換算済み）を直接入力' },
      ],
      help: '短絡点と同じ電圧の区間のケーブルを入れます（変圧器の二次側なら二次側のケーブル）。',
    },
    {
      type: 'number',
      key: 'r',
      label: 'ケーブルの抵抗（1 km 当たり）',
      unit: 'Ω/km',
      min: 0,
      visible: (v) => v.cable === 'ohm',
      help: 'メーカー資料の交流導体抵抗（使用温度での値）を入れます。',
    },
    {
      type: 'number',
      key: 'x',
      label: 'ケーブルのリアクタンス（1 km 当たり）',
      unit: 'Ω/km',
      min: 0,
      visible: (v) => v.cable === 'ohm',
      help: 'メーカー資料の値（周波数 50 Hz / 60 Hz に注意）を入れます。',
    },
    { type: 'number', key: 'L', label: 'ケーブルのこう長（片道）', unit: 'm', min: 0, exclusiveMin: true, visible: (v) => v.cable === 'ohm' },
    { type: 'number', key: 'Zc', label: 'ケーブルの％インピーダンス', unit: '%', min: 0, visible: (v) => v.cable === 'pz' && scalar(v) },
    { type: 'number', key: 'Rc', label: 'ケーブルの％抵抗', unit: '%', min: 0, visible: (v) => v.cable === 'pz' && rx(v) },
    { type: 'number', key: 'Xc', label: 'ケーブルの％リアクタンス', unit: '%', min: 0, visible: (v) => v.cable === 'pz' && rx(v) },
    {
      type: 'number',
      key: 'Ib',
      label: '遮断器の定格遮断電流',
      unit: 'kA',
      min: 0,
      exclusiveMin: true,
      help: '短絡点に設ける遮断器（配線用遮断器・高圧遮断器）のカタログ値を入れます。交流の対称値で比べます。',
      suggestions: [
        { label: '12.5 kA', value: 12.5 },
        { label: '25 kA', value: 25 },
        { label: '35 kA', value: 35 },
        { label: '50 kA', value: 50 },
      ],
    },
  ],
  defaults: {
    method: 'z',
    Pb: '10000',
    V: '210',
    src: 'mva',
    Ps: '100',
    Zs: '10',
    tr: 'yes',
    Pt: '500',
    Zt: '5',
    Rt: '1.2',
    cable: 'none',
    r: '0.24',
    x: '0.08',
    L: '30',
    Zc: '10',
    Rc: '10',
    Xc: '3',
    Ib: '35',
  },
  notes: [
    '三相短絡（3線が同時に短絡）の交流対称分の実効値を求めます。電動機からの寄与電流、直流分（非対称分）、アーク抵抗は考慮していません。',
    '％Z のスカラー和は、抵抗分とリアクタンス分の位相の違いを無視して大きさだけを足すため、合成インピーダンスを大きめに、短絡電流を小さめに見積もります。ケーブルの抵抗が効く低圧回路では「R と X を分けて合成」で確認してください。',
    '「R と X を分けて合成」では、電源側（受電点）の％インピーダンスをすべてリアクタンス分として扱います。',
    '受電点の短絡容量・％インピーダンスは、電力会社に確認した値を使ってください。',
  ],
  doc: el06Doc,
  beginner: el06Beginner,
  build(v) {
    const method = str(v, 'method');
    const isRx = method === 'rx';
    const Pb = num(v, 'Pb');
    const V = num(v, 'V');
    const src = str(v, 'src');
    const hasTr = str(v, 'tr') === 'yes';
    const cable = str(v, 'cable');
    const Ib = num(v, 'Ib');

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('method', '合成の方式', isRx ? 'R と X を分けて合成' : '％Z のスカラー和')
      .input('Pb', '基準容量', Pb, { symbol: 'Pb', unit: 'kVA', digits: 0 })
      .input('V', '短絡点の線間電圧', V, { symbol: 'V', unit: 'V', digits: 0 });

    // 電源側
    s.section('電源側（受電点）');
    let Zs: number;
    if (src === 'mva') {
      const Ps = num(v, 'Ps');
      Zs = (Pb / (Ps * 1000)) * 100;
      s.input('Ps', '受電点の三相短絡容量', Ps, { symbol: 'Ps', unit: 'MVA', note: '電力会社に確認した値' })
        .calc('Zs', '電源側の％インピーダンス（基準容量換算）', {
          symbol: '%Zs',
          unit: '%',
          value: Zs,
          expr: '{Pb} ÷ ({Ps} × 1000) × 100',
          formula: '{Pb}/({Ps}*1000)*100',
          digits: 3,
          note: isRx ? 'リアクタンス分として扱う' : undefined,
        });
    } else {
      Zs = num(v, 'Zs');
      s.input('Zs', '電源側の％インピーダンス（基準容量換算）', Zs, {
        symbol: '%Zs',
        unit: '%',
        digits: 3,
        note: isRx ? '電力会社に確認した値。リアクタンス分として扱う' : '電力会社に確認した値',
      });
    }

    // 変圧器
    const zTerms = ['{Zs}'];
    const rTerms: string[] = [];
    const xTerms = ['{Zs}'];
    let Zsum = Zs;
    let Rsum = 0;
    let Xsum = Zs;
    if (hasTr) {
      const Pt = num(v, 'Pt');
      const Zt = num(v, 'Zt');
      s.section('変圧器')
        .input('Pt', '変圧器の定格容量', Pt, { symbol: 'Pt', unit: 'kVA', digits: 0 })
        .input('Zt', '変圧器の％インピーダンス（自己容量基準）', Zt, { symbol: '%Zt', unit: '%', digits: 2, note: '銘板・試験成績書の値' });
      if (!isRx) {
        const Ztb = (Zt * Pb) / Pt;
        s.calc('Ztb', '変圧器の％インピーダンス（基準容量換算）', {
          symbol: '%Zt′',
          unit: '%',
          value: Ztb,
          expr: '{Zt} × {Pb} ÷ {Pt}',
          formula: '{Zt}*{Pb}/{Pt}',
          digits: 3,
        });
        zTerms.push('{Ztb}');
        Zsum += Ztb;
      } else {
        const Rt = num(v, 'Rt');
        if (Rt >= Zt) throw new CalcError('変圧器の％抵抗は％インピーダンスより小さい値にしてください。');
        const Xt = Math.sqrt(Zt * Zt - Rt * Rt);
        const Rtb = (Rt * Pb) / Pt;
        const Xtb = (Xt * Pb) / Pt;
        s.input('Rt', '変圧器の％抵抗（自己容量基準）', Rt, { symbol: '%Rt', unit: '%', digits: 2, note: '負荷損 ÷ 定格容量 × 100' })
          .calc('Xt', '変圧器の％リアクタンス（自己容量基準）', {
            symbol: '%Xt',
            unit: '%',
            value: Xt,
            expr: '√({Zt}² − {Rt}²)',
            formula: 'SQRT({Zt}^2-{Rt}^2)',
            digits: 3,
          })
          .calc('Rtb', '変圧器の％抵抗（基準容量換算）', { symbol: '%Rt′', unit: '%', value: Rtb, expr: '{Rt} × {Pb} ÷ {Pt}', formula: '{Rt}*{Pb}/{Pt}', digits: 3 })
          .calc('Xtb', '変圧器の％リアクタンス（基準容量換算）', { symbol: '%Xt′', unit: '%', value: Xtb, expr: '{Xt} × {Pb} ÷ {Pt}', formula: '{Xt}*{Pb}/{Pt}', digits: 3 });
        rTerms.push('{Rtb}');
        xTerms.push('{Xtb}');
        Rsum += Rtb;
        Xsum += Xtb;
      }
    }

    // ケーブル
    if (cable === 'ohm') {
      const r = num(v, 'r');
      const x = num(v, 'x');
      const L = num(v, 'L');
      const Rm = r * L;
      const Xm = x * L;
      const pR = (100 * Rm * Pb) / (V * V);
      const pX = (100 * Xm * Pb) / (V * V);
      s.section('ケーブル')
        .input('r', 'ケーブルの抵抗（1 km 当たり）', r, { symbol: 'r', unit: 'Ω/km', digits: 3 })
        .input('x', 'ケーブルのリアクタンス（1 km 当たり）', x, { symbol: 'x', unit: 'Ω/km', digits: 3 })
        .input('L', 'ケーブルのこう長', L, { symbol: 'L', unit: 'm' })
        .calc('Rm', 'ケーブルの抵抗', { symbol: 'Rc', unit: 'mΩ', value: Rm, expr: '{r} × {L}', formula: '{r}*{L}', digits: 3, note: 'Ω/km × m = mΩ' })
        .calc('Xm', 'ケーブルのリアクタンス', { symbol: 'Xc', unit: 'mΩ', value: Xm, expr: '{x} × {L}', formula: '{x}*{L}', digits: 3 })
        .calc('pRc', 'ケーブルの％抵抗（基準容量換算）', {
          symbol: '%Rc',
          unit: '%',
          value: pR,
          expr: '100 × {Rm} × {Pb} ÷ {V}²',
          formula: '100*{Rm}*{Pb}/{V}^2',
          digits: 3,
        })
        .calc('pXc', 'ケーブルの％リアクタンス（基準容量換算）', {
          symbol: '%Xc',
          unit: '%',
          value: pX,
          expr: '100 × {Xm} × {Pb} ÷ {V}²',
          formula: '100*{Xm}*{Pb}/{V}^2',
          digits: 3,
        });
      if (!isRx) {
        const pZ = Math.sqrt(pR * pR + pX * pX);
        s.calc('pZc', 'ケーブルの％インピーダンス（基準容量換算）', {
          symbol: '%Zc',
          unit: '%',
          value: pZ,
          expr: '√({pRc}² + {pXc}²)',
          formula: 'SQRT({pRc}^2+{pXc}^2)',
          digits: 3,
        });
        zTerms.push('{pZc}');
        Zsum += pZ;
      } else {
        rTerms.push('{pRc}');
        xTerms.push('{pXc}');
        Rsum += pR;
        Xsum += pX;
      }
    } else if (cable === 'pz') {
      s.section('ケーブル');
      if (!isRx) {
        const Zc = num(v, 'Zc');
        s.input('Zc', 'ケーブルの％インピーダンス（基準容量換算）', Zc, { symbol: '%Zc', unit: '%', digits: 3 });
        zTerms.push('{Zc}');
        Zsum += Zc;
      } else {
        const Rc = num(v, 'Rc');
        const Xc = num(v, 'Xc');
        s.input('Rc', 'ケーブルの％抵抗（基準容量換算）', Rc, { symbol: '%Rc', unit: '%', digits: 3 })
          .input('Xc', 'ケーブルの％リアクタンス（基準容量換算）', Xc, { symbol: '%Xc', unit: '%', digits: 3 });
        rTerms.push('{Rc}');
        xTerms.push('{Xc}');
        Rsum += Rc;
        Xsum += Xc;
      }
    }

    // 合成
    s.section('合成％インピーダンス');
    let Z: number;
    if (!isRx) {
      Z = Zsum;
      s.calc('Z', '合成％インピーダンス', {
        symbol: '%Z',
        unit: '%',
        value: Z,
        expr: zTerms.join(' + '),
        formula: zTerms.join('+'),
        digits: 3,
      });
    } else {
      if (rTerms.length > 0) {
        s.calc('R', '合成％抵抗', { symbol: '%R', unit: '%', value: Rsum, expr: rTerms.join(' + '), formula: rTerms.join('+'), digits: 3 });
      } else {
        s.input('R', '合成％抵抗', 0, { symbol: '%R', unit: '%', digits: 3, note: '抵抗分を持つ要素がない' });
      }
      s.calc('X', '合成％リアクタンス', { symbol: '%X', unit: '%', value: Xsum, expr: xTerms.join(' + '), formula: xTerms.join('+'), digits: 3 });
      Z = Math.sqrt(Rsum * Rsum + Xsum * Xsum);
      s.calc('Z', '合成％インピーダンス', { symbol: '%Z', unit: '%', value: Z, expr: '√({R}² + {X}²)', formula: 'SQRT({R}^2+{X}^2)', digits: 3 });
    }

    // 短絡電流
    const In = (Pb * 1000) / (Math.sqrt(3) * V);
    const Is = (In * 100) / Z / 1000;
    const Psc = (Pb * 100) / Z / 1000;
    s.section('短絡電流')
      .calc('In', '基準電流', { symbol: 'In', unit: 'A', value: In, expr: '{Pb} × 1000 ÷ (√3 × {V})', formula: '{Pb}*1000/(SQRT(3)*{V})', digits: 0 })
      .calc('Is', '三相短絡電流（対称実効値）', { symbol: 'Is', unit: 'kA', value: Is, expr: '{In} × 100 ÷ {Z} ÷ 1000', formula: '{In}*100/{Z}/1000', digits: 2 })
      .calc('Psc', '短絡点の三相短絡容量', { symbol: 'Psc', unit: 'MVA', value: Psc, expr: '{Pb} × 100 ÷ {Z} ÷ 1000', formula: '{Pb}*100/{Z}/1000', digits: 2 })
      .section('遮断器の判定')
      .input('Ib', '遮断器の定格遮断電流', Ib, { symbol: 'Ib', unit: 'kA' })
      .judge('ok', '判定', Is <= Ib, { expr: '{Is} ≤ {Ib}', formula: 'IF({Is}<={Ib},"OK","NG")' })
      .highlight('Z', 'Is', 'ok');

    if (Is > Ib) s.warn(`短絡電流 ${Is.toFixed(2)} kA が遮断器の定格遮断電流 ${Ib} kA を超えています。定格遮断電流の大きい遮断器を選ぶか、カスケード遮断の適用をメーカー資料で確認してください。`);
    if (!isRx && cable !== 'none') s.warn('ケーブルを含む回路で％Z をスカラー和にすると、短絡電流を小さめに見積もります。「R と X を分けて合成」でも確認してください。');
    return s.result();
  },
};
