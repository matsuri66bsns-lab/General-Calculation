import type { NumberField, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv02Beginner, hv02Doc } from './docs/hv-02';

const cool = (v: RawValues) => v.mode !== 'heat';

function n(key: string, label: string, unit: string, extra: Partial<NumberField> = {}): NumberField {
  return { type: 'number', key, label, ...(unit ? { unit } : {}), min: 0, ...extra };
}

export const coolingHeatingLoad: ToolDef = {
  id: 'HV-02',
  slug: 'cooling-heating-load',
  category: 'hvac',
  title: '室の冷暖房負荷',
  summary: '外壁・ガラス・人体・照明・すきま風などの部位ごとの負荷を積み上げ、室の冷房・暖房負荷を求めます。',
  keywords: ['冷房負荷', '暖房負荷', '熱負荷計算', '相当温度差', 'ETD', '日射', '遮蔽係数', '人体発熱', '照明', 'すきま風', 'SHF', '顕熱', '潜熱'],
  references: [
    '国土交通省「建築設備設計基準」（空気調和設備：熱負荷計算 冷房負荷・暖房負荷）',
    '空気調和・衛生工学便覧（相当温度差、標準日射熱取得、遮蔽係数、在室者の発熱量）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'mode',
      label: '計算する負荷',
      display: 'segmented',
      options: [
        { value: 'cool', label: '冷房', apply: { to: '34', ti: '26', xo: '0.0190', xi: '0.0105', dti: '3' } },
        { value: 'heat', label: '暖房', apply: { to: '0', ti: '22', xo: '0.0020', xi: '0.0065', dti: '5' } },
      ],
      help: '切り替えると、温湿度の欄に例の値が入ります。実際の設計条件に直してください。暖房では日射・人体・照明・機器を見込みません。',
    },
    n('Af', '床面積', 'm²', { exclusiveMin: true, help: '床面積当たりの負荷（W/m²）を出すために使います。' }),
    n('to', '外気 乾球温度', '°C', { min: -30, max: 50 }),
    n('ti', '室内 乾球温度', '°C', { min: -30, max: 50 }),
    n('xo', '外気 絶対湿度', 'kg/kg(DA)', { max: 0.05, help: 'g/kg の値は 1000 で割って入れます。' }),
    n('xi', '室内 絶対湿度', 'kg/kg(DA)', { max: 0.05 }),
    // 外壁
    n('Kw', '外壁 熱貫流率 K', 'W/(m²·K)', { help: 'HV-05（熱貫流率と表面結露の判定）で求めた値などを入れます。' }),
    n('Aw', '外壁 面積', 'm²', { help: '外壁がなければ 0 にします。窓の面積は除きます。' }),
    n('ETDw', '外壁 相当温度差 ETD', 'K', { min: -20, visible: cool, help: '壁体の種類・方位・時刻ごとの値を、便覧・設計基準の表から引いて入れます。' }),
    // 屋根
    n('Kr', '屋根 熱貫流率 K', 'W/(m²·K)'),
    n('Ar', '屋根 面積', 'm²', { help: '最上階でなければ 0 にします。' }),
    n('ETDr', '屋根 相当温度差 ETD', 'K', { min: -20, visible: cool, help: '便覧・設計基準の表から引いて入れます。' }),
    // ガラス
    n('Kg', 'ガラス 熱貫流率 K', 'W/(m²·K)', { help: '窓（サッシとガラスを合わせた）の熱貫流率を入れます。' }),
    n('Ag', 'ガラス 面積', 'm²'),
    n('Ig', 'ガラス 標準日射熱取得 I', 'W/m²', { visible: cool, help: '方位・時刻ごとの値を、便覧・設計基準の表から引いて入れます。' }),
    n('SC', 'ガラス 遮蔽係数 SC', '', {
      max: 1.5,
      visible: cool,
      help: '透明単板ガラス（3 mm）を 1.0 とした比です。ガラスの種類とブラインドの有無で、便覧・メーカー資料の値を入れます。',
      suggestions: [{ label: '基準 1.0', value: 1 }],
    }),
    // 内壁
    n('Ki', '内壁・間仕切り 熱貫流率 K', 'W/(m²·K)'),
    n('Ai', '内壁・間仕切り 面積', 'm²', { help: '隣室も同じ温度で空調するなら 0 にします。' }),
    n('dti', '隣室との温度差', 'K', { min: -30, help: '冷房は「隣室 − 室内」、暖房は「室内 − 隣室」。非空調室との温度差を入れます。' }),
    // 人体
    n('Np', '在室人数', '人', { visible: cool }),
    n('SH', '人体 顕熱 1人当たり', 'W/人', { visible: cool, help: '室温と作業の種類で変わります。便覧の在室者の発熱量の表で確認してください。' }),
    n('LH', '人体 潜熱 1人当たり', 'W/人', { visible: cool, help: '便覧の在室者の発熱量の表で確認してください。' }),
    // 照明・機器
    n('Wl', '照明 消費電力の合計', 'W', { visible: cool }),
    n('rl', '照明 使用率', '', { max: 1, visible: cool, help: '同時に点灯している割合（0〜1）。' }),
    n('We', '機器 消費電力の合計', 'W', { visible: cool, help: 'OA 機器などの発熱。すべて顕熱として扱います。' }),
    n('re', '機器 使用率', '', { max: 1, visible: cool, help: '同時に使用している割合（0〜1）。' }),
    // すきま風
    n('Qinf', 'すきま風量', 'm³/h', { help: '換気回数 × 室容積などで見積もります。外気負荷（空調機で処理する外気）は HV-03 で別に求めます。' }),
    n('sf', '安全率', '', {
      min: 1,
      max: 2,
      help: '合計の負荷に掛ける割増しです。案件の基準に合わせてください。',
      suggestions: [
        { label: '1.0', value: 1 },
        { label: '1.1', value: 1.1 },
      ],
    }),
  ],
  defaults: {
    mode: 'cool',
    Af: '50',
    to: '34',
    ti: '26',
    xo: '0.0190',
    xi: '0.0105',
    Kw: '1.0',
    Aw: '30',
    ETDw: '8',
    Kr: '0.5',
    Ar: '50',
    ETDr: '20',
    Kg: '3.0',
    Ag: '10',
    Ig: '400',
    SC: '0.5',
    Ki: '2.0',
    Ai: '20',
    dti: '3',
    Np: '10',
    SH: '60',
    LH: '60',
    Wl: '750',
    rl: '1',
    We: '1000',
    re: '0.6',
    Qinf: '30',
    sf: '1.1',
  },
  notes: [
    '相当温度差 ETD、標準日射熱取得 I、遮蔽係数 SC、在室者の発熱量は内蔵していません。便覧・建築設備設計基準の表から、方位・時刻・壁体の種類に合う値を引いて入れてください。',
    '冷房負荷は時刻によって変わります。方位の違う窓や外壁がある室は、時刻ごと（例：9時・12時・14時・16時）に計算して最大値を採ります。',
    '暖房負荷は、方位係数や間欠運転の割増しを含みません。必要なら熱貫流率・面積に含めるか、安全率で見込んでください。',
    '換気のために空調機で取り入れる外気の負荷は、この計算に含めていません。HV-03（外気負荷・すきま風負荷）で求めて、空調機の容量に加えてください。',
    '人体・照明・機器の目安値は案件の基準や実情で大きく変わります。例の値はそのまま使わないでください。',
  ],
  doc: hv02Doc,
  beginner: hv02Beginner,
  build(v) {
    const heat = str(v, 'mode') === 'heat';
    const Af = num(v, 'Af');
    const to = num(v, 'to');
    const ti = num(v, 'ti');
    const xo = num(v, 'xo');
    const xi = num(v, 'xi');
    const sf = num(v, 'sf');
    const Kw = num(v, 'Kw');
    const Aw = num(v, 'Aw');
    const Kr = num(v, 'Kr');
    const Ar = num(v, 'Ar');
    const Kg = num(v, 'Kg');
    const Ag = num(v, 'Ag');
    const Ki = num(v, 'Ki');
    const Ai = num(v, 'Ai');
    const dti = num(v, 'dti');
    const Qinf = num(v, 'Qinf');

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('mode', '計算する負荷', heat ? '暖房負荷' : '冷房負荷')
      .input('Af', '床面積', Af, { symbol: 'Af', unit: 'm²', digits: 1 })
      .input('to', '外気 乾球温度', to, { symbol: 'to', unit: '°C', digits: 1 })
      .input('ti', '室内 乾球温度', ti, { symbol: 'ti', unit: '°C', digits: 1 })
      .input('xo', '外気 絶対湿度', xo, { symbol: 'xo', unit: 'kg/kg(DA)', digits: 4 })
      .input('xi', '室内 絶対湿度', xi, { symbol: 'xi', unit: 'kg/kg(DA)', digits: 4 });

    const dt = heat ? ti - to : to - ti;
    const dx = heat ? xi - xo : xo - xi;
    s.calc('dt', heat ? '室内外温度差（室内 − 外気）' : '室内外温度差（外気 − 室内）', {
      symbol: 'Δt',
      unit: 'K',
      value: dt,
      expr: heat ? '{ti} − {to}' : '{to} − {ti}',
      formula: heat ? '{ti}-{to}' : '{to}-{ti}',
      digits: 1,
    }).calc('dx', heat ? '絶対湿度差（室内 − 外気）' : '絶対湿度差（外気 − 室内）', {
      symbol: 'Δx',
      unit: 'kg/kg(DA)',
      value: dx,
      expr: heat ? '{xi} − {xo}' : '{xo} − {xi}',
      formula: heat ? '{xi}-{xo}' : '{xo}-{xi}',
      digits: 4,
    });

    const sensible: string[] = [];
    const latent: string[] = [];
    let qS = 0;
    let qL = 0;

    // 外壁・屋根
    s.section('外壁・屋根')
      .input('Kw', '外壁 熱貫流率', Kw, { symbol: 'Kw', unit: 'W/(m²·K)', digits: 2 })
      .input('Aw', '外壁 面積', Aw, { symbol: 'Aw', unit: 'm²', digits: 1 });
    if (heat) {
      s.calc('qw', '外壁', { symbol: 'qw', unit: 'W', value: Kw * Aw * dt, expr: '{Kw} × {Aw} × {dt}', formula: '{Kw}*{Aw}*{dt}', digits: 0 });
      qS += Kw * Aw * dt;
    } else {
      const ETDw = num(v, 'ETDw');
      s.input('ETDw', '外壁 相当温度差', ETDw, { symbol: 'ETDw', unit: 'K', digits: 1, note: '便覧・設計基準の表の値' })
        .calc('qw', '外壁', { symbol: 'qw', unit: 'W', value: Kw * Aw * ETDw, expr: '{Kw} × {Aw} × {ETDw}', formula: '{Kw}*{Aw}*{ETDw}', digits: 0 });
      qS += Kw * Aw * ETDw;
    }
    sensible.push('qw');
    s.input('Kr', '屋根 熱貫流率', Kr, { symbol: 'Kr', unit: 'W/(m²·K)', digits: 2 }).input('Ar', '屋根 面積', Ar, { symbol: 'Ar', unit: 'm²', digits: 1 });
    if (heat) {
      s.calc('qr', '屋根', { symbol: 'qr', unit: 'W', value: Kr * Ar * dt, expr: '{Kr} × {Ar} × {dt}', formula: '{Kr}*{Ar}*{dt}', digits: 0 });
      qS += Kr * Ar * dt;
    } else {
      const ETDr = num(v, 'ETDr');
      s.input('ETDr', '屋根 相当温度差', ETDr, { symbol: 'ETDr', unit: 'K', digits: 1, note: '便覧・設計基準の表の値' })
        .calc('qr', '屋根', { symbol: 'qr', unit: 'W', value: Kr * Ar * ETDr, expr: '{Kr} × {Ar} × {ETDr}', formula: '{Kr}*{Ar}*{ETDr}', digits: 0 });
      qS += Kr * Ar * ETDr;
    }
    sensible.push('qr');

    // ガラス
    s.section('ガラス')
      .input('Kg', 'ガラス 熱貫流率', Kg, { symbol: 'Kg', unit: 'W/(m²·K)', digits: 2 })
      .input('Ag', 'ガラス 面積', Ag, { symbol: 'Ag', unit: 'm²', digits: 1 })
      .calc('qgc', 'ガラス 貫流', { symbol: 'qgc', unit: 'W', value: Kg * Ag * dt, expr: '{Kg} × {Ag} × {dt}', formula: '{Kg}*{Ag}*{dt}', digits: 0 });
    qS += Kg * Ag * dt;
    sensible.push('qgc');
    if (!heat) {
      const Ig = num(v, 'Ig');
      const SC = num(v, 'SC');
      s.input('Ig', '標準日射熱取得', Ig, { symbol: 'I', unit: 'W/m²', digits: 0, note: '便覧・設計基準の表の値' })
        .input('SC', '遮蔽係数', SC, { symbol: 'SC', digits: 2 })
        .calc('qgs', 'ガラス 日射', { symbol: 'qgs', unit: 'W', value: Ag * Ig * SC, expr: '{Ag} × {Ig} × {SC}', formula: '{Ag}*{Ig}*{SC}', digits: 0 });
      qS += Ag * Ig * SC;
      sensible.push('qgs');
    }

    // 内壁
    s.section('内壁・間仕切り')
      .input('Ki', '内壁 熱貫流率', Ki, { symbol: 'Ki', unit: 'W/(m²·K)', digits: 2 })
      .input('Ai', '内壁 面積', Ai, { symbol: 'Ai', unit: 'm²', digits: 1 })
      .input('dti', '隣室との温度差', dti, { symbol: 'Δti', unit: 'K', digits: 1 })
      .calc('qi', '内壁・間仕切り', { symbol: 'qi', unit: 'W', value: Ki * Ai * dti, expr: '{Ki} × {Ai} × {dti}', formula: '{Ki}*{Ai}*{dti}', digits: 0 });
    qS += Ki * Ai * dti;
    sensible.push('qi');

    // 室内発熱（冷房のみ）
    if (!heat) {
      const Np = num(v, 'Np');
      const SH = num(v, 'SH');
      const LH = num(v, 'LH');
      const Wl = num(v, 'Wl');
      const rl = num(v, 'rl');
      const We = num(v, 'We');
      const re = num(v, 're');
      s.section('室内発熱')
        .input('Np', '在室人数', Np, { symbol: 'N', unit: '人', digits: 0 })
        .input('SH', '人体 顕熱 1人当たり', SH, { symbol: 'SH', unit: 'W/人', digits: 0, note: '便覧の在室者の発熱量の値' })
        .input('LH', '人体 潜熱 1人当たり', LH, { symbol: 'LH', unit: 'W/人', digits: 0, note: '便覧の在室者の発熱量の値' })
        .calc('qhs', '人体 顕熱', { symbol: 'qhs', unit: 'W', value: Np * SH, expr: '{Np} × {SH}', formula: '{Np}*{SH}', digits: 0 })
        .calc('qhl', '人体 潜熱', { symbol: 'qhl', unit: 'W', value: Np * LH, expr: '{Np} × {LH}', formula: '{Np}*{LH}', digits: 0 })
        .input('Wl', '照明 消費電力', Wl, { symbol: 'Wl', unit: 'W', digits: 0 })
        .input('rl', '照明 使用率', rl, { symbol: 'rl', digits: 2 })
        .calc('ql', '照明', { symbol: 'ql', unit: 'W', value: Wl * rl, expr: '{Wl} × {rl}', formula: '{Wl}*{rl}', digits: 0 })
        .input('We', '機器 消費電力', We, { symbol: 'We', unit: 'W', digits: 0 })
        .input('re', '機器 使用率', re, { symbol: 're', digits: 2 })
        .calc('qe', '機器', { symbol: 'qe', unit: 'W', value: We * re, expr: '{We} × {re}', formula: '{We}*{re}', digits: 0 });
      qS += Np * SH + Wl * rl + We * re;
      qL += Np * LH;
      sensible.push('qhs', 'ql', 'qe');
      latent.push('qhl');
    }

    // すきま風
    s.section('すきま風')
      .input('Qinf', 'すきま風量', Qinf, { symbol: 'Q', unit: 'm³/h', digits: 0 })
      .calc('qis', 'すきま風 顕熱', { symbol: 'qis', unit: 'W', value: 0.33 * Qinf * dt, expr: '0.33 × {Qinf} × {dt}', formula: '0.33*{Qinf}*{dt}', digits: 0 })
      .calc('qil', 'すきま風 潜熱', { symbol: 'qil', unit: 'W', value: 834 * Qinf * dx, expr: '834 × {Qinf} × {dx}', formula: '834*{Qinf}*{dx}', digits: 0 });
    qS += 0.33 * Qinf * dt;
    qL += 834 * Qinf * dx;
    sensible.push('qis');
    latent.push('qil');

    const qT = qS + qL;
    if (qT === 0) throw new CalcError('負荷の合計が 0 です。面積や温度差などを入力してください。');
    const sum = (keys: string[]) => ({ expr: keys.map((k) => `{${k}}`).join(' + '), formula: keys.map((k) => `{${k}}`).join('+') });
    const word = heat ? '暖房' : '冷房';
    s.section('合計')
      .calc('qS', '顕熱負荷の合計', { symbol: 'qS', unit: 'W', value: qS, ...sum(sensible), digits: 0 })
      .calc('qL', '潜熱負荷の合計', { symbol: 'qL', unit: 'W', value: qL, ...sum(latent), digits: 0 })
      .calc('qT', '全熱負荷の合計', { symbol: 'qT', unit: 'W', value: qT, expr: '{qS} + {qL}', formula: '{qS}+{qL}', digits: 0 })
      .calc('SHF', '顕熱比', { symbol: 'SHF', value: qS / qT, expr: '{qS} ÷ {qT}', formula: '{qS}/{qT}', digits: 3 })
      .input('sf', '安全率', sf, { symbol: 'f', digits: 2 })
      .calc('qD', `${word}負荷（安全率込み）`, { symbol: 'qD', unit: 'W', value: qT * sf, expr: '{qT} × {sf}', formula: '{qT}*{sf}', digits: 0 })
      .calc('qDk', `${word}負荷（kW）`, { symbol: 'qD′', unit: 'kW', value: (qT * sf) / 1000, expr: '{qD} ÷ 1000', formula: '{qD}/1000', digits: 2 })
      .calc('qA', '床面積当たりの負荷', { symbol: 'qa', unit: 'W/m²', value: (qT * sf) / Af, expr: '{qD} ÷ {Af}', formula: '{qD}/{Af}', digits: 1 })
      .highlight('qD', 'qDk', 'qA', 'SHF');

    if (dt < 0) s.warn(heat ? '室温より外気温が高く、温度差が負になっています。暖房の設計条件を見直してください。' : '外気温より室温が高く、温度差が負になっています。冷房の設計条件を見直してください。');
    if (qL < 0) s.warn('潜熱負荷の合計が負です。絶対湿度の入力（外気と室内の入れ違い）を確認してください。');
    return s.result();
  },
};
