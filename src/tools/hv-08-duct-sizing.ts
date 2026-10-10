import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv08Beginner, hv08Doc } from './docs/hv-08';

/**
 * 管摩擦係数 λ。スワミー・ジェイン式を初期値とし、コールブルック式を2回反復する。
 * 計算書の Excel 式と同じ手順にして、画面と Excel の値を一致させる。
 * D [mm]、ε [mm]
 */
export function frictionFactor(D: number, Re: number, eps: number) {
  const a = eps / (3.7 * D);
  const lam0 = 0.25 / Math.log10(a + 5.74 / Re ** 0.9) ** 2;
  const lam1 = 1 / (2 * Math.log10(a + 2.51 / (Re * Math.sqrt(lam0)))) ** 2;
  const lam = 1 / (2 * Math.log10(a + 2.51 / (Re * Math.sqrt(lam1)))) ** 2;
  return { lam0, lam1, lam };
}

/** 円形ダクトの風速 [m/s]。Q [m³/h]、D [mm] */
const velocity = (Q: number, D: number) => Q / 3600 / ((Math.PI * (D / 1000) ** 2) / 4);

/** 直径 D [mm] の円形ダクトの単位摩擦損失 [Pa/m] */
export function frictionLoss(Q: number, D: number, rho: number, nu: number, eps: number): number {
  const v = velocity(Q, D);
  const Re = (v * 1000 * D) / nu;
  return (frictionFactor(D, Re, eps).lam / (D / 1000)) * ((rho * v * v) / 2);
}

/** 単位摩擦損失が R になる直径 [mm] を二分法で求める（R は D について単調減少） */
export function requiredDiameter(Q: number, R: number, rho: number, nu: number, eps: number): number {
  let lo = 5;
  let hi = 20000;
  if (frictionLoss(Q, lo, rho, nu, eps) < R || frictionLoss(Q, hi, rho, nu, eps) > R) {
    throw new CalcError('必要直径が 5〜20,000 mm の範囲に収まりません。風量と単位摩擦損失の値を見直してください。');
  }
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    if (frictionLoss(Q, mid, rho, nu, eps) > R) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** 長方形ダクトの円形相当径 [mm] */
export const equivalentDiameter = (a: number, b: number) => (1.3 * (a * b) ** 0.625) / (a + b) ** 0.25;

/** 短辺 b のとき円形相当径が D になる長辺 [mm]（二分法。根以上の値を返す） */
export function requiredLongSide(D: number, b: number): number {
  let lo = 1e-6;
  let hi = 1e7;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (equivalentDiameter(mid, b) < D) lo = mid;
    else hi = mid;
  }
  return hi;
}

const roundUp = (x: number, unit: number) => Math.ceil(x / unit) * unit;

export const ductSizing: ToolDef = {
  id: 'HV-08',
  slug: 'duct-sizing',
  category: 'hvac',
  title: 'ダクトの寸法（等摩擦法）',
  summary: '風量と単位摩擦損失から円形ダクトの必要直径を求め、長方形ダクトの寸法と風速を示します。',
  keywords: ['ダクト', 'ダクトサイズ', '等摩擦法', '摩擦損失', '圧力損失', 'Pa/m', '円形相当径', '長方形ダクト', 'アスペクト比', '風速', 'コールブルック'],
  references: [
    'ダルシー・ワイスバッハの式、コールブルックの式（管摩擦係数）、スワミー・ジェインの式（初期値）',
    '長方形ダクトの円形相当径 De = 1.30 (ab)^0.625 ÷ (a + b)^0.25（Huebscher の式。空気調和・衛生工学便覧、ASHRAE Handbook—Fundamentals）',
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」ダクトの設計（等摩擦法）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'number', key: 'Q', label: '風量', unit: 'm³/h', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'R',
      label: '単位摩擦損失（ダクト 1 m 当たり）',
      unit: 'Pa/m',
      min: 0,
      exclusiveMin: true,
      help: '一般の低速ダクトで 0.8〜1.5 Pa/m 程度が目安です。静かさを優先する系統は小さめにします。',
      suggestions: [
        { label: '0.8', value: 0.8 },
        { label: '1.0', value: 1 },
        { label: '1.5', value: 1.5 },
      ],
    },
    {
      type: 'select',
      key: 'rmode',
      label: '長方形ダクトの決め方',
      display: 'segmented',
      options: [
        { value: 'aspect', label: 'アスペクト比を指定' },
        { value: 'short', label: '短辺を指定' },
      ],
    },
    {
      type: 'number',
      key: 'k',
      label: 'アスペクト比（長辺 ÷ 短辺）',
      min: 1,
      visible: (v) => v.rmode !== 'short',
      help: '4 以下にするのが一般的です（目安）。',
      suggestions: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    {
      type: 'number',
      key: 'b',
      label: '短辺（天井内の高さの制約など）',
      unit: 'mm',
      min: 0,
      exclusiveMin: true,
      visible: (v) => v.rmode === 'short',
      suggestions: [
        { label: '200', value: 200 },
        { label: '250', value: 250 },
        { label: '300', value: 300 },
        { label: '400', value: 400 },
      ],
    },
    {
      type: 'number',
      key: 'u',
      label: '寸法の切り上げ単位',
      unit: 'mm',
      min: 0,
      exclusiveMin: true,
      help: '求めた寸法をこの単位で切り上げます。円形ダクトは製品の規格寸法も確認してください。',
      suggestions: [
        { label: '25mm', value: 25 },
        { label: '50mm', value: 50 },
      ],
    },
    {
      type: 'number',
      key: 'rho',
      label: '空気の密度',
      unit: 'kg/m³',
      min: 0,
      exclusiveMin: true,
      help: '20 ℃ 付近で 1.2 kg/m³ です。',
    },
    {
      type: 'number',
      key: 'nu',
      label: '空気の動粘性係数',
      unit: 'mm²/s',
      min: 0,
      exclusiveMin: true,
      help: '20 ℃ で約 15.1 mm²/s（= 15.1 × 10⁻⁶ m²/s）です。',
    },
    {
      type: 'number',
      key: 'eps',
      label: 'ダクト内面の粗さ',
      unit: 'mm',
      min: 0,
      help: '亜鉛鉄板で 0.15 mm 程度が目安です。',
      suggestions: [
        { label: '亜鉛鉄板 0.15', value: 0.15 },
        { label: '0.09', value: 0.09 },
      ],
    },
  ],
  defaults: { Q: '3000', R: '1', rmode: 'aspect', k: '2', b: '250', u: '50', rho: '1.2', nu: '15.1', eps: '0.15' },
  notes: [
    '必要直径は、ダルシー・ワイスバッハの式とコールブルックの式を同時に満たす直径を本サイトで反復計算した値です。計算書では、その直径から風速・管摩擦係数・単位摩擦損失を計算し直し、入力した単位摩擦損失に戻ることを確認しています。',
    '管摩擦係数は、スワミー・ジェインの式を初期値にコールブルックの式を2回反復しています（Excel でも同じ手順で計算できます）。',
    '長方形ダクトは、円形相当径が必要直径以上になる寸法を選んでいます。風速が大き過ぎると騒音の原因になるため、系統の許容風速も確認してください。',
  ],
  doc: hv08Doc,
  beginner: hv08Beginner,
  build(v) {
    const Q = num(v, 'Q');
    const R = num(v, 'R');
    const rho = num(v, 'rho');
    const nu = num(v, 'nu');
    const eps = num(v, 'eps');
    const u = num(v, 'u');
    const short = str(v, 'rmode') === 'short';

    const D = requiredDiameter(Q, R, rho, nu, eps);
    const vel = velocity(Q, D);
    const Re = (vel * 1000 * D) / nu;
    const { lam0, lam1, lam } = frictionFactor(D, Re, eps);
    const Rc = (lam / (D / 1000)) * ((rho * vel * vel) / 2);
    const Ds = roundUp(D, u);

    const s = new SheetBuilder();
    s.section('入力値')
      .input('Q', '風量', Q, { symbol: 'Q', unit: 'm³/h', digits: 0 })
      .input('R', '単位摩擦損失', R, { symbol: 'R', unit: 'Pa/m', digits: 2 })
      .input('rho', '空気の密度', rho, { symbol: 'ρ', unit: 'kg/m³', digits: 3 })
      .input('nu', '空気の動粘性係数', nu, { symbol: 'ν', unit: 'mm²/s', digits: 2 })
      .input('eps', 'ダクト内面の粗さ', eps, { symbol: 'ε', unit: 'mm', digits: 3 })
      .input('u', '寸法の切り上げ単位', u, { symbol: 'u', unit: 'mm', digits: 0 })
      .section('円形ダクトの必要直径')
      .input('D', '必要直径', D, { symbol: 'D', unit: 'mm', digits: 1, note: '本サイトで反復計算した値（コールブルック式と等摩擦の条件を同時に満たす直径）' })
      .calc('v', '風速', { symbol: 'v', unit: 'm/s', value: vel, expr: '{Q} ÷ 3600 ÷ (π × ({D} ÷ 1000)² ÷ 4)', formula: '{Q}/3600/(PI()*({D}/1000)^2/4)', digits: 2 })
      .calc('Re', 'レイノルズ数', { symbol: 'Re', value: Re, expr: '{v} × 1000 × {D} ÷ {nu}', formula: '{v}*1000*{D}/{nu}', digits: 0 })
      .calc('lam0', '管摩擦係数（初期値）', {
        symbol: 'λ₀',
        value: lam0,
        expr: '0.25 ÷ (log₁₀({eps} ÷ (3.7 × {D}) + 5.74 ÷ {Re}^0.9))²',
        formula: '0.25/(LOG10({eps}/(3.7*{D})+5.74/{Re}^0.9))^2',
        digits: 5,
        note: 'スワミー・ジェインの式',
      })
      .calc('lam1', '管摩擦係数（反復1回目）', {
        symbol: 'λ₁',
        value: lam1,
        expr: '1 ÷ (2 × log₁₀({eps} ÷ (3.7 × {D}) + 2.51 ÷ ({Re} × √{lam0})))²',
        formula: '1/(2*LOG10({eps}/(3.7*{D})+2.51/({Re}*SQRT({lam0}))))^2',
        digits: 5,
        note: 'コールブルックの式',
      })
      .calc('lam', '管摩擦係数', {
        symbol: 'λ',
        value: lam,
        expr: '1 ÷ (2 × log₁₀({eps} ÷ (3.7 × {D}) + 2.51 ÷ ({Re} × √{lam1})))²',
        formula: '1/(2*LOG10({eps}/(3.7*{D})+2.51/({Re}*SQRT({lam1}))))^2',
        digits: 5,
        note: 'コールブルックの式（反復2回目）',
      })
      .calc('Rc', '単位摩擦損失（確認）', {
        symbol: 'Rc',
        unit: 'Pa/m',
        value: Rc,
        expr: '{lam} ÷ ({D} ÷ 1000) × {rho} × {v}² ÷ 2',
        formula: '{lam}/({D}/1000)*{rho}*{v}^2/2',
        digits: 3,
        note: 'ダルシー・ワイスバッハの式。入力した R と一致すれば D は正しい',
      })
      .calc('Ds', '円形ダクトの選定径', { symbol: 'Ds', unit: 'mm', value: Ds, expr: '{D} を {u} 単位で切り上げ', formula: 'ROUNDUP({D}/{u},0)*{u}', digits: 0 })
      .calc('vs', '選定径での風速', { symbol: 'vs', unit: 'm/s', value: velocity(Q, Ds), expr: '{Q} ÷ 3600 ÷ (π × ({Ds} ÷ 1000)² ÷ 4)', formula: '{Q}/3600/(PI()*({Ds}/1000)^2/4)', digits: 2 });

    s.section('長方形ダクト');
    let a: number;
    let b: number;
    if (short) {
      b = num(v, 'b');
      const ar = requiredLongSide(D, b);
      a = roundUp(Math.max(ar, b), u);
      s.input('b', '短辺', b, { symbol: 'b', unit: 'mm', digits: 0 })
        .input('ar', '必要な長辺', ar, { symbol: 'ar', unit: 'mm', digits: 1, note: '本サイトで反復計算した値（円形相当径がちょうど D になる長辺）' })
        .calc('a', '長辺', { symbol: 'a', unit: 'mm', value: a, expr: 'max({ar}, {b}) を {u} 単位で切り上げ', formula: 'ROUNDUP(MAX({ar},{b})/{u},0)*{u}', digits: 0 });
      if (ar < b) s.warn('指定した短辺は、正方形にしても必要な太さを上回っています。短辺を小さくすると天井内の納まりに余裕ができます。');
    } else {
      const k = num(v, 'k');
      const br = (D * (k + 1) ** 0.25) / (1.3 * k ** 0.625);
      b = roundUp(br, u);
      a = roundUp(k * b, u);
      s.input('k', 'アスペクト比', k, { symbol: 'k', digits: 2 })
        .calc('br', '必要な短辺', {
          symbol: 'br',
          unit: 'mm',
          value: br,
          expr: '{D} × ({k} + 1)^0.25 ÷ (1.30 × {k}^0.625)',
          formula: '{D}*({k}+1)^0.25/(1.3*{k}^0.625)',
          digits: 1,
          note: '円形相当径の式に a = k × b を代入して b について解いた式',
        })
        .calc('b', '短辺', { symbol: 'b', unit: 'mm', value: b, expr: '{br} を {u} 単位で切り上げ', formula: 'ROUNDUP({br}/{u},0)*{u}', digits: 0 })
        .calc('a', '長辺', { symbol: 'a', unit: 'mm', value: a, expr: '{k} × {b} を {u} 単位で切り上げ', formula: 'ROUNDUP({k}*{b}/{u},0)*{u}', digits: 0 });
    }
    const De = equivalentDiameter(a, b);
    const vr = Q / 3600 / ((a * b) / 1e6);
    s.calc('De', '円形相当径', { symbol: 'De', unit: 'mm', value: De, expr: '1.30 × ({a} × {b})^0.625 ÷ ({a} + {b})^0.25', formula: '1.3*({a}*{b})^0.625/({a}+{b})^0.25', digits: 1 })
      .judge('ok', '必要直径の確認', De >= D, { expr: '{De} ≥ {D}', formula: 'IF({De}>={D},"OK","NG")' })
      .calc('kr', '実際のアスペクト比', { symbol: 'k′', value: a / b, expr: '{a} ÷ {b}', formula: '{a}/{b}', digits: 2 })
      .calc('vr', '長方形ダクトの風速', { symbol: 'vr', unit: 'm/s', value: vr, expr: '{Q} ÷ 3600 ÷ ({a} × {b} ÷ 1000000)', formula: '{Q}/3600/({a}*{b}/1000000)', digits: 2 })
      .highlight('D', 'Ds', 'a', 'b', 'vr');

    if (Re < 4000) s.warn('レイノルズ数が 4,000 未満で、乱流を前提としたコールブルックの式の適用範囲外です。風量・寸法を確認してください。');
    if (a / b > 4) s.warn('アスペクト比が 4 を超えています。摩擦損失や騒音が増えやすいため、短辺を大きくできないか検討してください。');
    return s.result();
  },
};
