import type { CalcResult, ToolDef, ToolDoc } from './types';
import { COLUMNS, HEADER_ROW, layoutRows, VALUE_COL } from './layout';
import { excelNumFmt } from './format';
import { exprSymbolic } from './formula';

const COLOR = {
  title: 'FF1D1D1F',
  sub: 'FF6E6E73',
  headerBg: 'FFF5F5F7',
  sectionBg: 'FFE8F0FE',
  inputBg: 'FFFFF8DC',
  border: 'FFD2D2D7',
  ok: 'FF1E8E3E',
  ng: 'FFD93025',
};

function fileStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * 計算書を Excel ファイル（.xlsx）として作り、ダウンロードさせる。
 * 入力値は値として、計算結果は Excel の関数として書き込むので、
 * Excel 上で入力値（黄色のセル）を変えると結果も再計算される。
 */
export async function exportExcel(tool: ToolDef, result: CalcResult, doc?: ToolDoc): Promise<void> {
  // exceljs は大きいので、出力するときにだけ読み込む
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = '設備計算ラボ';
  wb.created = new Date();

  const ws = wb.addWorksheet(tool.id, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
  });
  ws.columns = COLUMNS.map((c) => ({ width: c.width }));

  ws.getCell('A1').value = `${tool.id}　${tool.title}　計算書`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: COLOR.title } };
  ws.getCell('A2').value = `作成日時：${new Date().toLocaleString('ja-JP')}`;
  ws.getCell('A2').font = { size: 9, color: { argb: COLOR.sub } };
  ws.getCell('A3').value = '黄色のセルは入力値です。値を変えると再計算されます。';
  ws.getCell('A3').font = { size: 9, color: { argb: COLOR.sub } };

  const header = ws.getRow(HEADER_ROW);
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } };
    cell.border = { bottom: { style: 'thin', color: { argb: COLOR.border } } };
  });

  for (const { row, excelRow, formula } of layoutRows(result.rows)) {
    const xr = ws.getRow(excelRow);
    if (row.kind === 'section') {
      xr.getCell(1).value = row.label;
      xr.getCell(1).font = { bold: true };
      for (let c = 1; c <= COLUMNS.length; c++) {
        xr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.sectionBg } };
      }
      continue;
    }
    xr.getCell(1).value = row.label;
    xr.getCell(2).value = row.symbol ?? '';
    xr.getCell(4).value = row.unit ?? '';
    xr.getCell(6).value = row.note ?? '';
    xr.getCell(6).alignment = { wrapText: true, vertical: 'top' };

    const v = xr.getCell(3);
    const fmt = excelNumFmt(row.digits);
    if (row.kind === 'input') {
      v.value = row.value;
      v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.inputBg } };
    } else {
      // result にキャッシュ値を入れておくと、再計算しないビューアでも値が見える
      v.value = { formula: formula!, result: row.value };
      xr.getCell(5).value = exprSymbolic(row.expr, result.rows);
      if (row.format === 'judge') {
        v.font = { bold: true, color: { argb: row.value === 'OK' ? COLOR.ok : COLOR.ng } };
      }
    }
    if (fmt && typeof row.value === 'number') v.numFmt = fmt;
    v.alignment = { horizontal: 'right' };
    for (let c = 1; c <= COLUMNS.length; c++) {
      xr.getCell(c).border = { bottom: { style: 'hair', color: { argb: COLOR.border } } };
    }
  }

  // 判定セルは Excel 上で再計算したときにも色が変わるよう条件付き書式を付ける
  const judgeRows = layoutRows(result.rows).filter((l) => l.row.kind === 'calc' && l.row.format === 'judge');
  for (const j of judgeRows) {
    const ref = `${VALUE_COL}${j.excelRow}`;
    ws.addConditionalFormatting({
      ref,
      rules: [
        { type: 'containsText', operator: 'containsText', text: 'NG', priority: 1, style: { font: { color: { argb: COLOR.ng }, bold: true } } },
        { type: 'containsText', operator: 'containsText', text: 'OK', priority: 2, style: { font: { color: { argb: COLOR.ok }, bold: true } } },
      ],
    });
  }

  let r = HEADER_ROW + result.rows.length + 2;
  const addBlock = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    ws.getCell(`A${r}`).value = title;
    ws.getCell(`A${r}`).font = { bold: true };
    r++;
    for (const line of lines) {
      ws.getCell(`A${r}`).value = `・${line}`;
      ws.getCell(`A${r}`).font = { size: 9, color: { argb: COLOR.sub } };
      r++;
    }
    r++;
  };
  addBlock('注意', result.warnings);
  if (doc) {
    addBlock(
      '記号の説明',
      doc.symbols.map((d) => `${d.symbol}：${d.meaning}${d.unit && d.unit !== '—' ? `［${d.unit}］` : ''}（${d.origin}）`),
    );
  }
  addBlock('参考規格・文献', tool.references);
  addBlock('免責', ['本計算書は設計検討の目安です。最終的な判断は最新の法令・規格・メーカー資料に基づき、設計者の責任で行ってください。']);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // 環境によっては日本語のファイル名が無視されるため、英数字のみにする
  a.download = `${tool.id}_${tool.slug}_${fileStamp(new Date())}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
