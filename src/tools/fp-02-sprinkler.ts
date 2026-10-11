import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { fp02Beginner, fp02Doc } from './docs/fp-02';

const USE_LABEL: Record<string, string> = {
  general: '一般（地階を除く階数が10以下）',
  high: '一般（地階を除く階数が11以上）',
  dept: '百貨店（別表第一(4)項・(16)項イのうち法第8条第1項の百貨店）',
};

const HEAD_LABEL: Record<string, string> = {
  std: '標準型ヘッド（高感度型以外）',
  hs26: '高感度型ヘッド（有効散水半径 2.6 m）',
  hs28: '高感度型ヘッド（有効散水半径 2.8 m）',
};

/** 施行規則第13条の6第1項第1号の表（標準型ヘッドの同時開放個数） */
export const SPRINKLER_COUNT: Record<string, Record<string, number>> = {
  general: { std: 10, hs26: 8, hs28: 7 },
  high: { std: 15, hs26: 12, hs28: 11 },
  dept: { std: 15, hs26: 12, hs28: 11 },
};

export const sprinkler: ToolDef = {
  id: 'FP-02',
  slug: 'sprinkler',
  category: 'fire',
  title: 'スプリンクラーの水源・ポンプ',
  summary: '閉鎖型スプリンクラー（標準型ヘッド）の同時開放個数から、水源水量とポンプ吐出量を求めます。',
  keywords: ['スプリンクラー', '閉鎖型', '標準型ヘッド', '高感度型', '同時開放個数', '水源水量', 'ポンプ吐出量', '乾式', '予作動式', '湿式'],
  references: [
    '消防法施行令 第12条第2項第4号（スプリンクラー設備の水源）',
    '消防法施行規則 第13条の6第1項第1号（標準型ヘッドの水源水量・個数の表）',
    '消防法施行規則 第14条第1項第11号ハ（ポンプの吐出量）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'use',
      label: '防火対象物の区分',
      options: [
        { value: 'general', label: '一般で地上10階以下（地階を除く階数10以下）' },
        { value: 'high', label: '一般で地上11階以上（地階を除く階数11以上）' },
        { value: 'dept', label: '百貨店（消防法第8条第1項の百貨店）' },
      ],
      help: '百貨店は、令別表第一(4)項と、(16)項イのうち(4)項の用途がある防火対象物で、消防法第8条第1項に規定する百貨店であるものです。ラック式倉庫・指定可燃物の貯蔵所などは対象外です。',
    },
    {
      type: 'select',
      key: 'head',
      label: 'ヘッドの種類',
      display: 'segmented',
      options: [
        { value: 'std', label: '標準型' },
        { value: 'hs26', label: '高感度型 r=2.6' },
        { value: 'hs28', label: '高感度型 r=2.8' },
      ],
      help: '高感度型ヘッドは有効散水半径（2.6 m または 2.8 m）で個数が変わります。',
    },
    {
      type: 'select',
      key: 'valve',
      label: '流水検知装置',
      display: 'segmented',
      options: [
        { value: 'wet', label: '湿式' },
        { value: 'dry', label: '乾式・予作動式' },
      ],
      help: '乾式・予作動式は、表の個数に 1.5 を掛けた個数（端数切り上げ）とします。',
    },
    {
      type: 'number',
      key: 'Ni',
      label: 'ヘッドの設置個数',
      unit: '個',
      min: 1,
      help: '設置個数が表の個数より少ないときは設置個数で計算します。十分に多い場合はそのままで構いません。',
    },
  ],
  defaults: { use: 'general', head: 'std', valve: 'wet', Ni: '50' },
  notes: [
    '水源水量は「個数 × 1.6 m³」、ポンプ吐出量は「個数 × 90 L/min」です（標準型ヘッドの場合）。',
    '乾式・予作動式の流水検知装置を用いる場合は、表の個数に 1.5 を掛けた個数を使い、端数は切り上げて扱っています。',
    'ラック式倉庫、指定可燃物の貯蔵所、小区画型・側壁型・開放型ヘッド、特定施設水道連結型は計算の対象外です。施行規則第13条の6の該当する号を確認してください。',
    'ポンプの全揚程は、配管の摩擦損失・落差・ヘッドの放水圧力（0.1 MPa 以上）から別途求めます。',
    '消防用設備等は、所轄消防署の指導によって取扱いが異なる場合があります。設計の前に所轄消防と協議してください。',
  ],
  doc: fp02Doc,
  beginner: fp02Beginner,
  build(v) {
    const use = str(v, 'use');
    const head = str(v, 'head');
    const dry = str(v, 'valve') === 'dry';
    const Ni = num(v, 'Ni');
    if (!Number.isInteger(Ni)) throw new CalcError('ヘッドの設置個数は整数（1以上）で入力してください。');

    const Nt = SPRINKLER_COUNT[use][head];
    const k = dry ? 1.5 : 1;
    const Nk = Math.ceil(Nt * k);
    const N = Math.min(Nk, Ni);

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('use', '防火対象物の区分', USE_LABEL[use])
      .input('head', 'ヘッドの種類', HEAD_LABEL[head])
      .input('Nt', '表の個数', Nt, { symbol: 'Nt', unit: '個', digits: 0, note: '施行規則第13条の6第1項第1号の表' })
      .input('k', '流水検知装置による倍率', k, { symbol: 'k', digits: 1, note: dry ? '乾式・予作動式' : '湿式' })
      .input('Ni', 'ヘッドの設置個数', Ni, { symbol: 'Ni', unit: '個', digits: 0 })
      .input('w', 'ヘッド1個当たりの水源水量', 1.6, { symbol: 'w', unit: 'm³', digits: 1, note: '施行規則第13条の6第1項第1号' })
      .input('qp', 'ヘッド1個当たりのポンプ吐出量', 90, { symbol: 'qp', unit: 'L/min', note: '施行規則第14条第1項第11号ハ' })
      .section('計算')
      .calc('Nk', '倍率を掛けた個数', { symbol: 'Nk', unit: '個', value: Nk, expr: '{Nt} × {k}（切り上げ）', formula: 'ROUNDUP({Nt}*{k},0)', digits: 0 })
      .calc('N', '計算に用いる個数', { symbol: 'N', unit: '個', value: N, expr: 'min({Nk}, {Ni})', formula: 'MIN({Nk},{Ni})', digits: 0 })
      .calc('Vw', '水源水量', { symbol: 'Vw', unit: 'm³', value: N * 1.6, expr: '{N} × {w}', formula: '{N}*{w}', digits: 1 })
      .calc('Qp', 'ポンプ吐出量', { symbol: 'Qp', unit: 'L/min', value: N * 90, expr: '{N} × {qp}', formula: '{N}*{qp}', digits: 0 })
      .highlight('N', 'Vw', 'Qp');
    if (Ni < Nk) s.warn(`設置個数 ${Ni} 個が表の個数 ${Nk} 個より少ないため、設置個数で計算しています。`);
    return s.result();
  },
};
