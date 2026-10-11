import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildWorkbook, warekiDate } from '../core/excel';
import { TOOLS } from '../tools/registry';
import { DEFAULT_EXPORT_OPTIONS, EMPTY_PROJECT } from '../core/project';
import { layoutRows, VALUE_COL } from '../core/layout';
import { runWithValues } from './helpers';

const project = { projectName: '○○庁舎改修機械設備工事', buildingName: '○○庁舎', company: '○○設計事務所', author: '設備 太郎', checker: '照査 花子' };

describe('Excel 計算書', () => {
  it('和暦の作成日', () => {
    expect(warekiDate(new Date(2026, 9, 11))).toBe('令和8年10月11日');
  });

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s：すべての構成で作成でき、関数と表題欄が入る', async (_id, tool) => {
    const { result, values } = runWithValues(tool);
    const wb = await buildWorkbook(tool, result, { doc: tool.doc(values), project, options: DEFAULT_EXPORT_OPTIONS, date: new Date(2026, 9, 11) });
    // 書き出して読み直せること（結合セルの重なりなどがあると壊れたファイルになる）
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(await wb.xlsx.writeBuffer());
    expect(back.worksheets.map((w) => w.name)).toEqual(['表紙', '計算書', '解説']);

    const ws = back.getWorksheet('計算書')!;
    expect(ws.getCell('A1').text).toContain(project.projectName);
    expect(ws.getCell('A2').text).toContain(tool.title);
    for (const l of layoutRows(result.rows)) {
      if (l.row.kind !== 'calc') continue;
      const v = ws.getCell(`${VALUE_COL}${l.excelRow}`).value as { formula?: string };
      expect(v.formula, `${tool.id} ${l.row.key}`).toBe(l.formula);
    }
  });

  it('構成を選ばなければ計算書本体だけになり、空欄の案件情報でも作成できる', async () => {
    const tool = TOOLS[0];
    const { result } = runWithValues(tool);
    const wb = await buildWorkbook(tool, result, {
      project: EMPTY_PROJECT,
      options: { cover: false, formulas: false, symbols: false, notes: false },
    });
    expect(wb.worksheets.map((w) => w.name)).toEqual(['計算書']);
    expect(wb.getWorksheet('計算書')!.pageSetup.blackAndWhite).toBe(true);
  });
});
