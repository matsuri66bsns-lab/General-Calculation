import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { el12Beginner, el12Doc } from './docs/el-12';

/** 電気設備に関する技術基準を定める省令 第58条の表 */
const CLASSES: Record<string, { label: string; Rs: number }> = {
  le150: { label: '300V以下で対地電圧が150V以下', Rs: 0.1 },
  le300: { label: '300V以下でその他の場合（対地電圧150V超）', Rs: 0.2 },
  gt300: { label: '300Vを超えるもの', Rs: 0.4 },
};

export const insulationResistance: ToolDef = {
  id: 'EL-12',
  slug: 'insulation-resistance',
  category: 'electrical',
  title: '低圧電路の絶縁抵抗の判定',
  summary: '使用電圧の区分から低圧電路の絶縁抵抗の基準値を示し、測定値を判定します。',
  keywords: ['絶縁抵抗', 'メガー', '絶縁抵抗計', '0.1MΩ', '0.2MΩ', '0.4MΩ', '対地電圧', '漏えい電流', '電技省令', '58条'],
  references: [
    '電気設備に関する技術基準を定める省令 第58条（低圧の電路の絶縁性能）',
    '電気設備の技術基準の解釈 第14条第1項（低圧電路の絶縁性能。第二号：漏えい電流 1mA 以下）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'cls',
      label: '電路の使用電圧の区分',
      options: [
        { value: 'le150', label: '300V以下・対地電圧150V以下（単相100V、単相3線式100/200V など）' },
        { value: 'le300', label: '300V以下・その他（三相3線式200V など）' },
        { value: 'gt300', label: '300V超（三相4線式400V級 など）' },
      ],
      help: '対地電圧は、接地式電路では電線と大地の間の電圧、非接地式電路では電線間の電圧です。',
    },
    { type: 'number', key: 'Rm', label: '絶縁抵抗の測定値', unit: 'MΩ', min: 0 },
  ],
  defaults: { cls: 'le150', Rm: '5' },
  notes: [
    '絶縁抵抗は、開閉器または過電流遮断器で区切ることのできる電路ごとに、電線相互間と電路と大地との間で測定します（電技省令 第58条）。',
    '電気使用場所の低圧電路で絶縁抵抗の測定が困難な場合は、使用電圧が加わった状態における漏えい電流が 1mA 以下であれば、絶縁性能を満たすものとされています（電技解釈 第14条第1項第二号。令和7年11月20日改正の解釈で確認）。',
    '基準値は法令上の最低値です。保守管理では、前回の測定値からの低下の傾向にも注意してください。',
  ],
  doc: el12Doc,
  beginner: el12Beginner,
  build(v) {
    const c = CLASSES[str(v, 'cls')] ?? CLASSES.le150;
    const Rm = num(v, 'Rm');
    const s = new SheetBuilder();
    s.section('入力値')
      .input('cls', '電路の使用電圧の区分', c.label)
      .input('Rs', '絶縁抵抗の基準値', c.Rs, { symbol: 'Rs', unit: 'MΩ', digits: 1, note: '電技省令 第58条' })
      .input('Rm', '絶縁抵抗の測定値', Rm, { symbol: 'Rm', unit: 'MΩ', digits: 2 })
      .section('判定')
      .judge('ok', '判定', Rm >= c.Rs, { expr: '{Rm} ≥ {Rs}', formula: 'IF({Rm}>={Rs},"OK","NG")' })
      .highlight('Rs', 'ok');
    if (Rm < c.Rs) s.warn('測定値が基準値を下回っています。回路を区切って不良箇所を特定し、補修してください。');
    return s.result();
  },
};
