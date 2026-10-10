import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { cm06Beginner, cm06Doc } from './docs/cm-06';

/** 平成12年建設省告示第1388号 第五第四号の表（質量15kgを超える給湯設備の設計用標準震度） */
const FLOOR_1388: Record<string, { label: string; Ks: number }> = {
  low: { label: '地階・1階', Ks: 0.4 },
  mid: { label: '中間階', Ks: 0.6 },
  top: { label: '上層階・屋上', Ks: 1.0 },
};

const BASIS_LABEL: Record<string, string> = {
  guide: '建築設備耐震設計・施工指針の値を入力',
  k1388: '平成12年建設省告示第1388号 第五第四号（質量15kgを超える給湯設備）',
  k1389: '平成12年建設省告示第1389号（屋上から突出する水槽・冷却塔等）',
};

const isBasis = (...b: string[]) => (v: RawValues) => b.includes(v.basis);

export const seismicAnchor: ToolDef = {
  id: 'CM-06',
  slug: 'seismic-anchor',
  category: 'common',
  title: '設備機器の耐震（アンカーボルト）',
  summary: '設計用地震力から、設備機器のアンカーボルト1本当たりの引抜力とせん断力を求めて判定します。',
  keywords: ['耐震', 'アンカーボルト', '地震力', '設計用水平震度', '鉛直震度', 'KH', 'KV', '引抜力', 'せん断力', '転倒', '告示1388', '告示1389', '建築設備耐震設計・施工指針'],
  references: [
    '平成12年建設省告示第1388号 第五第四号（質量15kgを超える給湯設備：P = k·w、k = Z × 設計用標準震度。標準震度は地階・1階 0.4、中間階 0.6、上層階・屋上 1.0）',
    '平成12年建設省告示第1389号（屋上から突出する水槽・冷却塔等：P = k·w、k = Z × 1.0 以上。転倒・移動を防ぐ措置を講じた場合は1/2まで低減可）',
    '昭和55年建設省告示第1793号 第1（地震地域係数 Z）',
    '建築設備耐震設計・施工指針（日本建築センター）（一般の設備機器の設計用水平震度 KH、鉛直震度 KV = KH/2、アンカーボルトの引抜力・せん断力の式。KH の値は本ツールに内蔵せず利用者が入力）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'basis',
      label: '設計用水平震度の決め方',
      options: [
        { value: 'guide', label: '指針の値を入力（一般の設備機器）' },
        { value: 'k1388', label: '告示第1388号（質量15kgを超える給湯設備）' },
        { value: 'k1389', label: '告示第1389号（屋上の水槽・冷却塔等）' },
      ],
      help: '告示の表（0.4／0.6／1.0）は給湯設備の規定です。一般の設備機器は「建築設備耐震設計・施工指針」で設置場所と耐震クラスから KH を決めて入力してください。',
    },
    {
      type: 'number',
      key: 'KH',
      label: '設計用水平震度 KH',
      min: 0,
      exclusiveMin: true,
      visible: isBasis('guide'),
      help: '設置場所（地階・1階／中間階／上層階・屋上）と耐震クラス（S・A・B）に応じた値を「建築設備耐震設計・施工指針」で確認して入力してください。候補の数値は目安で、指針の表と対応づけていません。',
      suggestions: [
        { label: '0.4（指針の値を確認）', value: 0.4 },
        { label: '0.6（指針の値を確認）', value: 0.6 },
        { label: '1.0（指針の値を確認）', value: 1 },
        { label: '1.5（指針の値を確認）', value: 1.5 },
        { label: '2.0（指針の値を確認）', value: 2 },
      ],
    },
    {
      type: 'select',
      key: 'floor',
      label: '設置階（告示第1388号の区分）',
      visible: isBasis('k1388'),
      options: Object.entries(FLOOR_1388).map(([value, f]) => ({ value, label: `${f.label}（設計用標準震度 ${f.Ks.toFixed(1)}）` })),
      help: '上層階・中間階の範囲は建築物の階数で決まります。告示本文で確認してください。',
    },
    {
      type: 'number',
      key: 'Z',
      label: '地震地域係数 Z',
      min: 0,
      exclusiveMin: true,
      max: 1,
      visible: isBasis('k1388', 'k1389'),
      help: '昭和55年建設省告示第1793号で地域ごとに定められた値（1.0〜0.7）です。',
      suggestions: [
        { label: '1.0', value: 1 },
        { label: '0.9', value: 0.9 },
        { label: '0.8', value: 0.8 },
        { label: '0.7', value: 0.7 },
      ],
    },
    {
      type: 'select',
      key: 'kvmode',
      label: '設計用鉛直震度 KV',
      options: [
        { value: 'half', label: 'KH ÷ 2（建築設備耐震設計・施工指針による）' },
        { value: 'input', label: '直接入力' },
        { value: 'zero', label: '考慮しない（0）' },
      ],
      help: '告示には鉛直震度の規定はありません。KV = KH/2 は指針による扱いです。',
    },
    { type: 'number', key: 'KV', label: '設計用鉛直震度 KV', min: 0, visible: (v) => v.kvmode === 'input' },
    { type: 'number', key: 'W', label: '機器の運転重量', unit: 'kN', min: 0, exclusiveMin: true, help: '水や油などの内容物を含む運転時の重量です（1 kN ≒ 102 kg）。' },
    { type: 'number', key: 'hG', label: '据付面から重心までの高さ', unit: 'mm', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'lG',
      label: '転倒支点側のボルトから重心までの水平距離',
      unit: 'mm',
      min: 0,
      help: '転倒するときに支点になる側（圧縮側）のボルト列から重心までの水平距離です。重心が中央なら l の半分です。',
    },
    { type: 'number', key: 'l', label: 'ボルト間隔（検討する方向）', unit: 'mm', min: 0, exclusiveMin: true },
    { type: 'number', key: 'nt', label: '片側（引張側）のボルト本数', unit: '本', min: 1, step: 1 },
    { type: 'number', key: 'n', label: 'ボルトの総本数', unit: '本', min: 1, step: 1 },
    {
      type: 'select',
      key: 'check',
      label: '許容値との判定',
      display: 'segmented',
      options: [
        { value: 'yes', label: '判定する' },
        { value: 'no', label: '判定しない' },
      ],
    },
    {
      type: 'number',
      key: 'Ta',
      label: 'ボルト1本の許容引抜力',
      unit: 'kN',
      min: 0,
      exclusiveMin: true,
      visible: (v) => v.check === 'yes',
      help: 'アンカーの種類・径・埋込み長さ・コンクリート強度に応じた短期許容値を、指針やメーカー資料で確認して入力してください。',
    },
    {
      type: 'number',
      key: 'Qa',
      label: 'ボルト1本の許容せん断力',
      unit: 'kN',
      min: 0,
      exclusiveMin: true,
      visible: (v) => v.check === 'yes',
      help: 'ボルト径と材質に応じた短期許容値を、指針やメーカー資料で確認して入力してください。',
    },
  ],
  defaults: {
    basis: 'guide',
    KH: '1',
    floor: 'mid',
    Z: '1',
    kvmode: 'half',
    KV: '0.5',
    W: '10',
    hG: '800',
    lG: '400',
    l: '800',
    nt: '2',
    n: '4',
    check: 'yes',
    Ta: '5',
    Qa: '5',
  },
  notes: [
    '平成12年建設省告示第1388号の設計用標準震度の表（地階・1階 0.4、中間階 0.6、上層階・屋上 1.0）は、質量15kgを超える給湯設備の規定（第五第四号）です。式は P = k·w（k = Z × 設計用標準震度、w = 固定荷重＋積載荷重）です。',
    '屋上から突出する水槽・冷却塔などは平成12年建設省告示第1389号により、P = k·w、k = Z × 1.0 以上とします。転倒・移動を防ぐ措置を講じた場合は地震力を1/2まで低減できますが、本ツールでは低減していません。適用条件は告示本文で確認してください。',
    '一般の設備機器に、設置位置と耐震クラスに応じた設計用水平震度 KH を当てはめ、鉛直震度を KV = KH/2 とする扱いは「建築設備耐震設計・施工指針」（日本建築センター）によるものです。告示には鉛直震度の規定はありません。KH の値は本ツールに内蔵していないので、指針の表で確認して入力してください。',
    '引抜力の式は、機器を剛体とみなし、転倒の支点まわりのモーメントの釣り合いから求める指針の考え方によります。防振支持の機器やストッパーの検討は対象外です。',
    '引張とせん断が同時にかかるボルトの組合せの検討、アンカーの埋込み・基礎の検討は、指針やメーカー資料で別に行ってください。',
  ],
  doc: cm06Doc,
  beginner: cm06Beginner,
  build(v) {
    const basis = str(v, 'basis');
    const kvmode = str(v, 'kvmode');
    const check = str(v, 'check') === 'yes';
    const W = num(v, 'W');
    const hG = num(v, 'hG');
    const lG = num(v, 'lG');
    const l = num(v, 'l');
    const nt = num(v, 'nt');
    const n = num(v, 'n');
    if (nt > n) throw new CalcError('片側（引張側）のボルト本数は、ボルトの総本数以下にしてください。');

    const s = new SheetBuilder();
    s.section('設計用震度').input('basis', '水平震度の決め方', BASIS_LABEL[basis]);

    let KH: number;
    if (basis === 'guide') {
      KH = num(v, 'KH');
      s.input('KH', '設計用水平震度', KH, { symbol: 'KH', digits: 2, note: '建築設備耐震設計・施工指針の表で確認した値（利用者入力）' });
    } else {
      const Z = num(v, 'Z');
      const f = basis === 'k1388' ? FLOOR_1388[str(v, 'floor')] : null;
      const Ks = f ? f.Ks : 1.0;
      KH = Z * Ks;
      s.input('Z', '地震地域係数', Z, { symbol: 'Z', digits: 1, note: '昭和55年建設省告示第1793号' })
        .input('Ks', '設計用標準震度', Ks, {
          symbol: 'Ks',
          digits: 1,
          note: f ? `告示第1388号 第五第四号の表（${f.label}）` : '告示第1389号（k = Z × 1.0 以上）',
        })
        .calc('KH', '設計用水平震度', { symbol: 'KH', value: KH, expr: '{Z} × {Ks}', formula: '{Z}*{Ks}', digits: 2, note: '告示の k にあたる値' });
    }

    let KV: number;
    if (kvmode === 'half') {
      KV = KH / 2;
      s.calc('KV', '設計用鉛直震度', { symbol: 'KV', value: KV, expr: '{KH} ÷ 2', formula: '{KH}/2', digits: 2, note: '建築設備耐震設計・施工指針による（告示に鉛直震度の規定はありません）' });
    } else if (kvmode === 'input') {
      KV = num(v, 'KV');
      s.input('KV', '設計用鉛直震度', KV, { symbol: 'KV', digits: 2, note: '利用者入力' });
    } else {
      KV = 0;
      s.input('KV', '設計用鉛直震度', 0, { symbol: 'KV', digits: 2, note: '鉛直震度を考慮しない' });
    }

    const FH = KH * W;
    const FV = KV * W;
    const Rb0 = (FH * hG - (W - FV) * lG) / (l * nt);
    const Rb = Math.max(0, Rb0);
    const Q = FH / n;

    s.section('機器とボルト')
      .input('W', '運転重量', W, { symbol: 'W', unit: 'kN', digits: 2 })
      .input('hG', '重心高さ', hG, { symbol: 'hG', unit: 'mm', digits: 0 })
      .input('lG', '支点側ボルトから重心までの水平距離', lG, { symbol: 'lG', unit: 'mm', digits: 0 })
      .input('l', 'ボルト間隔', l, { symbol: 'l', unit: 'mm', digits: 0 })
      .input('nt', '片側（引張側）のボルト本数', nt, { symbol: 'nt', unit: '本', digits: 0 })
      .input('n', 'ボルトの総本数', n, { symbol: 'n', unit: '本', digits: 0 })
      .section('設計用地震力')
      .calc('FH', '設計用水平地震力', { symbol: 'FH', unit: 'kN', value: FH, expr: '{KH} × {W}', formula: '{KH}*{W}', digits: 2 })
      .calc('FV', '設計用鉛直地震力', { symbol: 'FV', unit: 'kN', value: FV, expr: '{KV} × {W}', formula: '{KV}*{W}', digits: 2 })
      .section('ボルト1本当たりの力')
      .calc('Rb0', '引抜力の計算値', {
        symbol: 'Rb₀',
        unit: 'kN',
        value: Rb0,
        expr: '({FH} × {hG} − ({W} − {FV}) × {lG}) ÷ ({l} × {nt})',
        formula: '({FH}*{hG}-({W}-{FV})*{lG})/({l}*{nt})',
        digits: 2,
      })
      .calc('Rb', '引抜力', {
        symbol: 'Rb',
        unit: 'kN',
        value: Rb,
        expr: 'max(0, {Rb0})',
        formula: 'MAX(0,{Rb0})',
        digits: 2,
        note: Rb0 <= 0 ? '計算値が0以下のため引抜力は生じません' : undefined,
      })
      .calc('Q', 'せん断力', { symbol: 'Q', unit: 'kN', value: Q, expr: '{FH} ÷ {n}', formula: '{FH}/{n}', digits: 2 });

    s.highlight('FH', 'Rb', 'Q');

    if (check) {
      const Ta = num(v, 'Ta');
      const Qa = num(v, 'Qa');
      s.section('判定')
        .input('Ta', '許容引抜力（1本）', Ta, { symbol: 'Ta', unit: 'kN', digits: 2, note: '利用者入力（短期許容値）' })
        .input('Qa', '許容せん断力（1本）', Qa, { symbol: 'Qa', unit: 'kN', digits: 2, note: '利用者入力（短期許容値）' })
        .judge('okT', '引抜の判定', Rb <= Ta, { expr: '{Rb} ≤ {Ta}', formula: 'IF({Rb}<={Ta},"OK","NG")' })
        .judge('okQ', 'せん断の判定', Q <= Qa, { expr: '{Q} ≤ {Qa}', formula: 'IF({Q}<={Qa},"OK","NG")' })
        .highlight('okT', 'okQ');
      if (Rb > Ta) s.warn('引抜力が許容引抜力を超えています。ボルトの径・本数・埋込み長さ、またはボルト間隔を見直してください。');
      if (Q > Qa) s.warn('せん断力が許容せん断力を超えています。ボルトの径・本数を見直すか、ストッパーの併用を検討してください。');
    }

    if (Rb0 <= 0) s.warn('引抜力の計算値が0以下のため、引抜力は生じないものとして Rb = 0 としています。');
    if (!Number.isInteger(nt) || !Number.isInteger(n)) s.warn('ボルト本数が整数ではありません。本数を確認してください。');
    return s.result();
  },
};
