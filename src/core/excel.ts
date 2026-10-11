import type { Workbook, Worksheet, Cell, Borders, Border } from 'exceljs';
import type { CalcResult, ToolDef, ToolDoc } from './types';
import type { ExportOptions, ProjectInfo } from './project';
import { COLUMNS, EXPR_COL, HEADER_ROW, isWideText, layoutRows, VALUE_COL } from './layout';
import { excelNumFmt } from './format';
import { categoryOf } from '../tools/categories';

/*
 * 計算書の体裁は、公的な計算書・設計図書の共通の書式にならう。
 * - 用紙は A4 縦。左に綴じしろを取り、印刷は白黒
 * - 各頁の上に表題欄（工事名称・作成日・施設名称・作成者・設計者・照査者）を繰り返す
 * - 下端の中央に頁番号
 * - 本文は明朝、見出しはゴシック。罫線は細線、外枠だけ太線
 */

const FONT = { body: 'ＭＳ 明朝', head: 'ＭＳ ゴシック' };
const SIZE = { body: 9, small: 8, head: 10, title: 14 };
const COLOR = {
  text: 'FF000000',
  sub: 'FF404040',
  // 画面で見たときだけの色。印刷は白黒にするので紙には出ない
  inputBg: 'FFFFF2CC',
  inputText: 'FF1F4E9F',
  headBg: 'FFF2F2F2',
  ok: 'FF1E7B34',
  ng: 'FFC00000',
};
const SITE = '設備計算ラボ';

/** 余白（インチ）。左は綴じしろを含めて広めに取る */
const MARGINS = { left: 0.98, right: 0.59, top: 0.71, bottom: 0.71, header: 0.3, footer: 0.35 };

const thin: Border = { style: 'thin', color: { argb: COLOR.text } };
const hair: Border = { style: 'hair', color: { argb: COLOR.text } };
const medium: Border = { style: 'medium', color: { argb: COLOR.text } };

export interface ExportSettings {
  doc?: ToolDoc;
  project: ProjectInfo;
  options: ExportOptions;
  /** 作成日（テスト用に差し替えられるようにする） */
  date?: Date;
}

function fileStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 和暦の日付（例：令和8年10月11日） */
export function warekiDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  } catch {
    return d.toLocaleDateString('ja-JP');
  }
}

/** 列幅の単位で文字列の幅を見積もる（全角は2、半角は1） */
function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) < 0x2000 ? 1 : 2;
  return w;
}

/** 折り返したときの行数を見積もる。結合セルは Excel が高さを自動調整しないため */
function lineCount(s: string, width: number, size = SIZE.body): number {
  // 列幅の単位は 11pt の文字が基準。小さい文字ほど1行に多く入る
  const usable = Math.max(4, (width - 1.2) * (11 / size) * 0.92);
  return s.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(textWidth(line) / usable)), 0);
}

function heightFor(lines: number, size = SIZE.body): number {
  return Math.max(16, Math.ceil(lines * (size + 3.5) + 4));
}

function colLetter(n: number): string {
  return String.fromCharCode(64 + n);
}

function widthOf(ws: Worksheet, from: number, to: number): number {
  let w = 0;
  for (let c = from; c <= to; c++) w += ws.getColumn(c).width ?? 8;
  return w;
}

function setFont(cell: Cell, opts: { head?: boolean; size?: number; bold?: boolean; color?: string } = {}) {
  cell.font = {
    name: opts.head ? FONT.head : FONT.body,
    size: opts.size ?? SIZE.body,
    bold: opts.bold,
    color: { argb: opts.color ?? COLOR.text },
  };
}

/** 範囲を結合して値を入れる */
function put(
  ws: Worksheet,
  row: number,
  from: number,
  to: number,
  value: Cell['value'],
  style: { head?: boolean; size?: number; bold?: boolean; color?: string; align?: 'left' | 'center' | 'right'; wrap?: boolean; valign?: 'top' | 'middle' } = {},
): Cell {
  if (to > from) ws.mergeCells(row, from, row, to);
  const cell = ws.getCell(row, from);
  cell.value = value;
  setFont(cell, style);
  cell.alignment = { horizontal: style.align ?? 'left', vertical: style.valign ?? 'middle', wrapText: style.wrap ?? true };
  return cell;
}

/** 範囲の罫線。外枠と内側の線を分けて指定する */
function box(ws: Worksheet, r1: number, c1: number, r2: number, c2: number, outer: Border, inner?: { h?: Border; v?: Border }) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const b: Partial<Borders> = {};
      b.top = r === r1 ? outer : inner?.h;
      b.bottom = r === r2 ? outer : inner?.h;
      b.left = c === c1 ? outer : inner?.v;
      b.right = c === c2 ? outer : inner?.v;
      ws.getCell(r, c).border = b;
    }
  }
}

function pageSetup(ws: Worksheet, lastCol: number, printTitles?: string) {
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    blackAndWhite: true,
    margins: MARGINS,
    printTitlesRow: printTitles,
  };
  ws.headerFooter = { oddFooter: `&C- &P / &N -&R&"${FONT.body}"&8${SITE}` };
  ws.properties.defaultRowHeight = 16;
  void lastCol;
}

/**
 * 各頁の表題欄（1〜4行目）。左に案件、右に作成日・作成者・照査者を置く。
 * split は左半分の最後の列番号。
 */
function titleBlock(ws: Worksheet, ncols: number, split: number, title: string, project: ProjectInfo, date: string) {
  const left = (r: number, label: string, value: string) =>
    put(ws, r, 1, split, `${label}　${value}`, { size: SIZE.body });
  const right = (r: number, label: string, value: string) =>
    put(ws, r, split + 1, ncols, `${label}　${value}`, { size: SIZE.body });
  left(1, '工事名称', project.projectName);
  right(1, '作成日', date);
  put(ws, 2, 1, ncols, title, { head: true, bold: true, size: SIZE.title, align: 'center' });
  left(3, '施設名称', project.buildingName);
  right(3, '作成者', project.author);
  left(4, '設計者', project.company);
  right(4, '照査者', project.checker);
  ws.getRow(1).height = 18;
  ws.getRow(2).height = 30;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 18;
  box(ws, 1, 1, 4, ncols, medium, { h: thin });
  // 左右の区切り線（2行目の表題は全幅）
  for (const r of [1, 3, 4]) {
    ws.getCell(r, split).border = { ...ws.getCell(r, split).border, right: thin };
    ws.getCell(r, split + 1).border = { ...ws.getCell(r, split + 1).border, left: thin };
  }
}

function headerRow(ws: Worksheet, row: number, cells: { from: number; to: number; text: string }[]) {
  for (const c of cells) {
    const cell = put(ws, row, c.from, c.to, c.text, { head: true, bold: true, align: 'center' });
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headBg } };
  }
  const last = Math.max(...cells.map((c) => c.to));
  box(ws, row, 1, row, last, thin, { v: thin });
  for (let c = 1; c <= last; c++) {
    const cell = ws.getCell(row, c);
    cell.border = { ...cell.border, top: medium, bottom: medium };
  }
  ws.getRow(row).height = 20;
}

/** 箇条書きのまとまり（見出し＋項目）を書き、次の行番号を返す */
function bulletBlock(ws: Worksheet, start: number, ncols: number, heading: string, lines: string[], headSize = SIZE.head): number {
  if (lines.length === 0) return start;
  let r = start;
  put(ws, r, 1, ncols, heading, { head: true, bold: true, size: headSize });
  ws.getCell(r, 1).border = { bottom: thin };
  for (let c = 2; c <= ncols; c++) ws.getCell(r, c).border = { bottom: thin };
  ws.getRow(r).height = 20;
  r++;
  const w = widthOf(ws, 2, ncols);
  for (const line of lines) {
    put(ws, r, 1, 1, '・', { align: 'right', valign: 'top' });
    put(ws, r, 2, ncols, line, { valign: 'top' });
    ws.getRow(r).height = heightFor(lineCount(line, w));
    r++;
  }
  return r + 1;
}

/* ------------------------------------------------------------------ */
/* 表紙                                                               */
/* ------------------------------------------------------------------ */

function coverSheet(wb: Workbook, tool: ToolDef, project: ProjectInfo, date: string) {
  const ws = wb.addWorksheet('表紙');
  const N = 8;
  ws.columns = Array.from({ length: N }, () => ({ width: 11.5 }));
  pageSetup(ws, N);
  ws.pageSetup.fitToHeight = 1;
  ws.headerFooter = {};
  for (let r = 1; r <= 42; r++) ws.getRow(r).height = 18;

  put(ws, 3, 6, 7, `計算書　${tool.id}`, { align: 'right', size: SIZE.body });
  put(ws, 8, 2, 7, '設　備　設　計　計　算　書', { head: true, bold: true, size: 22, align: 'center' });
  ws.getRow(8).height = 40;
  put(ws, 11, 2, 7, `${tool.id}　${tool.title}`, { head: true, bold: true, size: 15, align: 'center' });
  ws.getRow(11).height = 28;
  put(ws, 12, 2, 7, `（${categoryOf(tool.category).name}）`, { size: 11, align: 'center' });

  const lines: [string, string][] = [
    ['工 事 名 称', project.projectName],
    ['施 設 名 称', project.buildingName],
    ['作成年月日', date],
    ['設　計　者', project.company],
  ];
  lines.forEach(([label, value], i) => {
    const r = 17 + i * 2;
    put(ws, r, 2, 3, label, { size: 11, align: 'left' });
    put(ws, r, 4, 7, value, { size: 11 });
    ws.getRow(r).height = 24;
    for (let c = 2; c <= 7; c++) ws.getCell(r, c).border = { bottom: hair };
  });

  // 作成者・照査者の記名・押印欄
  put(ws, 29, 4, 5, '作成者', { head: true, align: 'center' });
  put(ws, 29, 6, 7, '照査者', { head: true, align: 'center' });
  put(ws, 30, 4, 5, project.author, { align: 'center' });
  put(ws, 30, 6, 7, project.checker, { align: 'center' });
  ws.mergeCells(31, 4, 33, 5);
  ws.mergeCells(31, 6, 33, 7);
  box(ws, 29, 4, 33, 7, thin, { h: thin, v: thin });
  for (const r of [29, 30]) ws.getRow(r).height = 20;

  put(ws, 38, 2, 7, `${SITE}で作成`, { size: SIZE.small, align: 'right', color: COLOR.sub });

  // 二重線の外枠
  const dbl: Border = { style: 'double', color: { argb: COLOR.text } };
  for (let r = 2; r <= 40; r++) {
    for (let c = 1; c <= N; c++) {
      if (r !== 2 && r !== 40 && c !== 1 && c !== N) continue;
      const cell = ws.getCell(r, c);
      cell.border = {
        ...cell.border,
        ...(r === 2 ? { top: dbl } : {}),
        ...(r === 40 ? { bottom: dbl } : {}),
        ...(c === 1 ? { left: dbl } : {}),
        ...(c === N ? { right: dbl } : {}),
      };
    }
  }
  put(ws, 41, 6, 8, '表紙共　　　枚', { size: SIZE.body, align: 'right' });
  ws.pageSetup.printArea = `A1:H41`;
}

/* ------------------------------------------------------------------ */
/* 計算書本体                                                         */
/* ------------------------------------------------------------------ */

function mainSheet(wb: Workbook, tool: ToolDef, result: CalcResult, project: ProjectInfo, options: ExportOptions, date: string) {
  const ws = wb.addWorksheet('計算書', { views: [{ state: 'frozen', ySplit: HEADER_ROW }] });
  const N = COLUMNS.length;
  ws.columns = COLUMNS.map((c) => ({ width: c.width }));
  pageSetup(ws, N, `1:${HEADER_ROW}`);
  titleBlock(ws, N, 4, `${tool.id}　${tool.title}　計算書`, project, date);
  headerRow(
    ws,
    HEADER_ROW,
    COLUMNS.map((c, i) => ({ from: i + 1, to: i + 1, text: c.header })),
  );

  const laid = layoutRows(result.rows);
  const exprCol = EXPR_COL.charCodeAt(0) - 64;
  const valueCol = VALUE_COL.charCodeAt(0) - 64;
  let section = 0;
  for (const l of laid) {
    const { row, excelRow } = l;
    const xr = ws.getRow(excelRow);
    if (row.kind === 'section') {
      section++;
      put(ws, excelRow, 1, 1, section, { head: true, bold: true, align: 'center' });
      put(ws, excelRow, 2, N, row.label, { head: true, bold: true });
      for (let c = 1; c <= N; c++) ws.getCell(excelRow, c).border = { top: thin, bottom: hair, left: c === 1 ? medium : undefined, right: c === N ? medium : undefined };
      xr.height = 20;
      continue;
    }
    put(ws, excelRow, 2, 2, row.label, { valign: 'top' });
    put(ws, excelRow, 3, 3, row.symbol ?? '', { align: 'center', valign: 'top' });
    const unit = put(ws, excelRow, 6, 6, row.unit ?? '', { align: 'center', valign: 'top', wrap: false });
    unit.alignment = { ...unit.alignment, shrinkToFit: true };
    put(ws, excelRow, 7, 7, row.note ?? '', { valign: 'top', size: SIZE.small });

    const wide = isWideText(row);
    if (wide) ws.mergeCells(excelRow, exprCol, excelRow, valueCol);
    const v = ws.getCell(excelRow, wide ? exprCol : valueCol);
    const fmt = excelNumFmt(row.digits);
    let exprText = '';
    if (row.kind === 'input') {
      v.value = row.value;
      setFont(v, { color: COLOR.inputText });
      v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.inputBg } };
    } else {
      // result にキャッシュ値を入れておくと、再計算しないビューアでも値が見える
      v.value = { formula: l.formula!, result: l.cellValue };
      setFont(v, { bold: row.format === 'judge' });
      const sub = l.substitution!;
      exprText = sub.text;
      const ec = ws.getCell(excelRow, exprCol);
      ec.value = sub.formula ? { formula: sub.formula, result: sub.text } : sub.text;
      setFont(ec);
      ec.alignment = { wrapText: true, vertical: 'top' };
    }
    if (fmt && typeof row.value === 'number') v.numFmt = fmt;
    v.alignment = {
      horizontal: wide ? 'left' : row.kind === 'calc' && row.format === 'judge' ? 'center' : 'right',
      vertical: 'top',
      wrapText: typeof row.value === 'string',
    };

    const lines = Math.max(
      lineCount(row.label, COLUMNS[1].width),
      lineCount(exprText, COLUMNS[3].width),
      lineCount(row.note ?? '', COLUMNS[6].width, SIZE.small),
      typeof row.value === 'string' ? lineCount(String(l.cellValue), wide ? COLUMNS[3].width + COLUMNS[4].width : COLUMNS[4].width) : 1,
    );
    xr.height = heightFor(lines);
    for (let c = 1; c <= N; c++) {
      ws.getCell(excelRow, c).border = {
        bottom: hair,
        left: c === 1 ? medium : hair,
        right: c === N ? medium : undefined,
      };
    }
  }
  const lastRow = laid.length ? laid[laid.length - 1].excelRow : HEADER_ROW;
  for (let c = 1; c <= N; c++) {
    const cell = ws.getCell(lastRow, c);
    cell.border = { ...cell.border, bottom: medium };
  }

  // 判定セルは Excel 上で再計算したときにも色が変わるよう条件付き書式を付ける（印刷は白黒）
  for (const j of laid.filter((l) => l.row.kind === 'calc' && l.row.format === 'judge')) {
    ws.addConditionalFormatting({
      ref: `${VALUE_COL}${j.excelRow}`,
      rules: [
        { type: 'containsText', operator: 'containsText', text: '不適合', priority: 1, style: { font: { color: { argb: COLOR.ng }, bold: true } } },
        { type: 'containsText', operator: 'containsText', text: '適合', priority: 2, style: { font: { color: { argb: COLOR.ok }, bold: true } } },
      ],
    });
  }

  let r = lastRow + 2;
  put(ws, r, 1, N, '値の列の網掛けは入力値です。Excel 上で入力値を変えると、値と代入式が再計算されます。', { size: SIZE.small, color: COLOR.sub });
  r += 2;
  r = bulletBlock(ws, r, N, '計算上の注意', result.warnings);
  if (options.notes) {
    r = bulletBlock(ws, r, N, '根拠（参考規格・文献）', tool.references);
    r = bulletBlock(ws, r, N, '注意事項', tool.notes ?? []);
  }
  put(ws, r, 1, N, '本計算書は設計検討の目安です。最終的な判断は最新の法令・規格・メーカー資料に基づき、設計者の責任で行ってください。', {
    size: SIZE.small,
    color: COLOR.sub,
  });
  ws.getRow(r).height = heightFor(lineCount(ws.getCell(r, 1).text, widthOf(ws, 1, N), SIZE.small), SIZE.small);
  ws.pageSetup.printArea = `A1:${colLetter(N)}${r}`;
}

/* ------------------------------------------------------------------ */
/* 計算式の解説・記号の説明                                           */
/* ------------------------------------------------------------------ */

function docSheet(wb: Workbook, tool: ToolDef, doc: ToolDoc, project: ProjectInfo, options: ExportOptions, date: string) {
  const name = options.formulas && options.symbols ? '計算式の解説・記号の説明' : options.formulas ? '計算式の解説' : '記号の説明';
  const ws = wb.addWorksheet(options.formulas && options.symbols ? '解説' : name);
  const widths = [4.5, 10, 24, 36, 8, 9.5];
  const N = widths.length;
  ws.columns = widths.map((w) => ({ width: w }));
  pageSetup(ws, N, '1:4');
  titleBlock(ws, N, 3, `${tool.id}　${tool.title}　${name}`, project, date);

  let r = 6;
  if (options.formulas) {
    put(ws, r, 1, N, '計算式の解説', { head: true, bold: true, size: SIZE.head });
    ws.getRow(r).height = 20;
    r++;
    headerRow(ws, r, [
      { from: 1, to: 1, text: 'No.' },
      { from: 2, to: 3, text: '式の名称' },
      { from: 4, to: N, text: '式' },
    ]);
    r++;
    doc.formulas.forEach((f, i) => {
      put(ws, r, 1, 1, i + 1, { align: 'center', valign: 'top' });
      put(ws, r, 2, 3, f.title, { head: true, bold: true, valign: 'top' });
      put(ws, r, 4, N, f.expr, { valign: 'top' });
      ws.getRow(r).height = heightFor(Math.max(lineCount(f.title, widthOf(ws, 2, 3)), lineCount(f.expr, widthOf(ws, 4, N))));
      for (let c = 1; c <= N; c++) ws.getCell(r, c).border = { top: thin, left: c === 1 ? thin : undefined, right: c === N ? thin : undefined };
      r++;
      put(ws, r, 2, N, f.body, { valign: 'top' });
      ws.getRow(r).height = heightFor(lineCount(f.body, widthOf(ws, 2, N)));
      for (let c = 1; c <= N; c++) ws.getCell(r, c).border = { bottom: thin, left: c === 1 ? thin : undefined, right: c === N ? thin : undefined };
      r++;
    });
    r++;
  }
  if (options.symbols) {
    put(ws, r, 1, N, '記号の説明', { head: true, bold: true, size: SIZE.head });
    ws.getRow(r).height = 20;
    r++;
    headerRow(ws, r, [
      { from: 1, to: 2, text: '記号' },
      { from: 3, to: 3, text: '何の略か・由来' },
      { from: 4, to: 4, text: '意味' },
      { from: 5, to: N, text: '単位' },
    ]);
    r++;
    for (const s of doc.symbols) {
      put(ws, r, 1, 2, s.symbol, { bold: true, align: 'center', valign: 'top' });
      put(ws, r, 3, 3, s.origin, { valign: 'top', size: SIZE.small });
      put(ws, r, 4, 4, s.meaning, { valign: 'top' });
      put(ws, r, 5, N, s.unit ?? '—', { align: 'center', valign: 'top' });
      ws.getRow(r).height = heightFor(
        Math.max(lineCount(s.origin, widths[2], SIZE.small), lineCount(s.meaning, widths[3]), lineCount(s.unit ?? '', widthOf(ws, 5, N))),
      );
      box(ws, r, 1, r, N, thin, { v: hair });
      r++;
    }
  }
  ws.pageSetup.printArea = `A1:${colLetter(N)}${r}`;
}

/* ------------------------------------------------------------------ */

/** 計算書のブックを作る（ダウンロードはしない）。テストからも使う */
export async function buildWorkbook(tool: ToolDef, result: CalcResult, settings: ExportSettings): Promise<Workbook> {
  // exceljs は大きいので、出力するときにだけ読み込む
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  const now = settings.date ?? new Date();
  const date = warekiDate(now);
  wb.creator = settings.project.author || SITE;
  wb.title = `${tool.id} ${tool.title} 計算書`;
  wb.subject = settings.project.projectName;
  wb.company = settings.project.company;
  wb.created = now;

  const { project, options, doc } = settings;
  if (options.cover) coverSheet(wb, tool, project, date);
  mainSheet(wb, tool, result, project, options, date);
  if (doc && (options.formulas || options.symbols)) docSheet(wb, tool, doc, project, options, date);
  // 開いたときは計算書本体のシートを表示する
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: options.cover ? 1 : 0, visibility: 'visible' }];
  return wb;
}

/**
 * 計算書を Excel ファイル（.xlsx）として作り、ダウンロードさせる。
 * 入力値は値として、計算結果は Excel の関数として書き込むので、
 * Excel 上で入力値（網掛けのセル）を変えると結果も再計算される。
 */
export async function exportExcel(tool: ToolDef, result: CalcResult, settings: ExportSettings): Promise<void> {
  const wb = await buildWorkbook(tool, result, settings);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // 環境によっては日本語のファイル名が無視されるため、英数字のみにする
  a.download = `${tool.id}_${tool.slug}_${fileStamp(settings.date ?? new Date())}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
