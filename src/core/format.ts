/** 桁数を指定しないときの自動の小数桁数 */
function autoDigits(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return 0;
  if (a >= 1000) return 0;
  if (a >= 100) return 1;
  if (a >= 1) return 2;
  if (a >= 0.01) return 3;
  return 4;
}

export function formatNumber(x: number, digits?: number): string {
  if (!Number.isFinite(x)) return '—';
  if (digits === undefined) {
    if (Math.abs(x) > 0 && Math.abs(x) < 0.0001) return x.toExponential(3);
    // 桁数の指定がなければ末尾の 0 は付けない（14.00 → 14）
    return x.toLocaleString('ja-JP', { maximumFractionDigits: autoDigits(x) });
  }
  return x.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatValue(v: number | string, digits?: number): string {
  return typeof v === 'number' ? formatNumber(v, digits) : v;
}

/** Excel の表示形式。digits 未指定なら汎用 */
export function excelNumFmt(digits?: number): string | undefined {
  if (digits === undefined) return undefined;
  return digits === 0 ? '#,##0' : `#,##0.${'0'.repeat(digits)}`;
}
