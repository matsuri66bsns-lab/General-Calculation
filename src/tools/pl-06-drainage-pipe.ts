import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str, tableRows } from '../core/values';
import { PART_LABEL, PL06_FIXTURES, pl06Beginner, pl06Doc } from './docs/pl-06';

/** 排水管の呼び径（mm） */
const DRAIN_SIZES = [30, 40, 50, 65, 75, 100, 125, 150, 200] as const;

/** 器具排水負荷単位・排水口径の目安（入力欄の補足に出す） */
const DFU_HINTS = PL06_FIXTURES.map((f) => `${f.label} ${f.hints}`).join('、');
const D_HINTS = PL06_FIXTURES.map((f) => `${f.label} ${f.d}`).join('、');

/** 既定の明細（個数が 0 の器具は行に入れない） */
const fixtureDefaults = JSON.stringify(PL06_FIXTURES.filter((f) => Number(f.n) > 0).map((f) => ({ name: f.label, n: f.n, u: f.u, d: f.d })));

export const drainagePipe: ToolDef = {
  id: 'PL-06',
  slug: 'drainage-pipe',
  category: 'plumbing',
  title: '排水負荷単位と排水管径',
  summary: '器具排水負荷単位の合計を求め、選んだ排水管径の許容最大負荷単位と比べて判定します。',
  keywords: ['排水負荷単位', '器具排水負荷単位', 'DFU', '排水管径', '排水横枝管', '排水立て管', '排水横主管', 'SHASE-S 206', 'トラップ口径'],
  references: [
    'SHASE-S 206「給排水衛生設備規準・同解説」（器具排水負荷単位、排水管の許容最大排水負荷単位）',
    '建築基準法施行令 第129条の2の4（給水、排水その他の配管設備）',
    '昭和50年建設省告示第1597号（建築物に設ける飲料水の配管設備及び排水のための配管設備の構造方法）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'table',
      key: 'fx',
      label: '器具の明細',
      columns: [
        { key: 'name', label: '器具', type: 'text', width: 'wide' },
        { key: 'n', label: '個数', type: 'number', unit: '個', min: 0, width: 'narrow' },
        { key: 'u', label: '器具排水負荷単位', type: 'number', min: 0, width: 'narrow' },
        { key: 'd', label: '排水口径', type: 'number', unit: 'mm', min: 0, exclusiveMin: true, width: 'narrow' },
      ],
      newRow: { name: '', n: '1', u: '1', d: '40' },
      maxRows: 40,
      help: `器具排水負荷単位は SHASE-S 206 の表から、排水口径（トラップ口径）は SHASE-S 206 の表や器具メーカーの資料から入力します。器具排水負荷単位の目安：${DFU_HINTS}。排水口径の目安（mm）：${D_HINTS}。個数 0 の行も排水口径の最大値に含めるので、つながない器具の行は削除してください。`,
    },
    {
      type: 'select',
      key: 'part',
      label: '管の部位',
      display: 'segmented',
      options: [
        { value: 'branch', label: '排水横枝管' },
        { value: 'stack', label: '排水立て管' },
        { value: 'main', label: '排水横主管' },
      ],
    },
    {
      type: 'select',
      key: 'D',
      label: '選んだ管径（呼び径）',
      options: DRAIN_SIZES.map((d) => ({ value: String(d), label: `${d} mm` })),
    },
    {
      type: 'number',
      key: 'DFUa',
      label: '選んだ管径の許容最大排水負荷単位',
      min: 0,
      exclusiveMin: true,
      help: 'SHASE-S 206 の表から、部位・管径に応じた値を入力します。横主管は勾配、立て管は階数（3階建てを超えるかどうか、1階分の値）でも変わります。',
    },
  ],
  defaults: { fx: fixtureDefaults, part: 'branch', D: '100', DFUa: '160' },
  notes: [
    '器具排水負荷単位と許容最大排水負荷単位は SHASE-S 206 の表から入力します。本ツールは表を内蔵していません。候補の値は目安で、原文で確認してください。',
    '排水管は、接続する器具の排水口径（トラップ口径）より細くできません。明細の排水口径の最大値と管径を比べます。',
    '立て管は、上の階で細くせず最下部と同じ管径で通すのが一般的です。3階建てを超える場合は、立て管全体と1階分（1ブランチ間隔）の負荷の両方を確認してください。',
    '横主管・横枝管は勾配も確認してください。',
  ],
  doc: pl06Doc,
  beginner: pl06Beginner,
  build(v) {
    const part = str(v, 'part');
    const s = new SheetBuilder();
    s.section('器具排水負荷単位');
    const fx = tableRows(v, 'fx');
    const fxRows = fx.map((r) => [String(r.name), Number(r.n), Number(r.u), Number(r.d), Number(r.n) * Number(r.u)]);
    const sum = fxRows.reduce((a, r) => a + (r[4] as number), 0);
    const Do = fxRows.reduce((a, r) => Math.max(a, r[3] as number), 0);
    s.table(
      'fx',
      '器具の明細',
      [
        { key: 'name', label: '器具' },
        { key: 'n', label: '個数', symbol: 'n', unit: '個' },
        { key: 'u', label: '器具排水負荷単位', symbol: 'u' },
        { key: 'd', label: '排水口径', symbol: 'd', unit: 'mm' },
        { key: 'dfu', label: '排水負荷単位', symbol: 'DFU', expr: '{@n} × {@u}', formula: '{@n}*{@u}', digits: 1 },
      ],
      fxRows,
      { note: 'u は SHASE-S 206 の表の値、d は器具のトラップ口径' },
    )
      .calc('DFU', '排水負荷単位の合計', { symbol: 'ΣDFU', value: sum, expr: 'Σ(n × u)', formula: 'SUM({fx:dfu})', digits: 1 })
      .calc('Do', '器具の最大の排水口径', { symbol: 'Do', unit: 'mm', value: Do, expr: 'max(d)', formula: 'MAX({fx:d})', digits: 0 });
    if (fx.every((r) => Number(r.n) <= 0)) s.warn('器具の個数がすべて 0 です。接続する器具の個数を入力してください。');

    const D = Number(str(v, 'D'));
    const DFUa = num(v, 'DFUa');
    const loadOk = sum <= DFUa;
    const sizeOk = D >= Do;
    s.section(`${PART_LABEL[part]}の判定`)
      .input('part', '管の部位', PART_LABEL[part])
      .input('D', '選んだ管径', D, { symbol: 'D', unit: 'mm' })
      .input('DFUa', '許容最大排水負荷単位', DFUa, { symbol: 'DFUa', note: `SHASE-S 206 の表（${PART_LABEL[part]}・${D} mm）の値` })
      .judge('okLoad', '負荷の判定', loadOk, { expr: '{DFU} ≤ {DFUa}', formula: 'IF({DFU}<={DFUa},"OK","NG")' })
      .judge('okSize', '管径の判定（排水口径以上）', sizeOk, { expr: '{D} ≥ {Do}', formula: 'IF({D}>={Do},"OK","NG")' })
      .judge('ok', '総合判定', loadOk && sizeOk, {
        expr: '負荷・管径とも OK',
        formula: 'IF(AND({DFU}<={DFUa},{D}>={Do}),"OK","NG")',
      })
      .highlight('DFU', 'okLoad', 'okSize', 'ok');
    if (!loadOk) s.warn('排水負荷単位の合計が許容値を超えています。管径を上げるか、系統を分けてください。');
    if (!sizeOk) s.warn(`管径 ${D} mm が器具の排水口径 ${Do} mm より細くなっています。排水口径以上の管径にしてください。`);
    if (part === 'stack') s.warn('立て管は上の階で細くせず、最下部と同じ管径で通すのが一般的です。3階建てを超える場合は1階分（1ブランチ間隔）の許容値も確認してください。');
    return s.result();
  },
};
