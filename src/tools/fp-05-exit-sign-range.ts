import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { fp05Beginner, fp05Doc } from './docs/fp-05';

const KIND_LABEL: Record<string, string> = {
  exit: '避難口誘導灯（避難の方向を示すシンボルなし）',
  exitSym: '避難口誘導灯（避難の方向を示すシンボルあり）',
  aisle: '通路誘導灯',
};

/** 施行規則第28条の3第2項第2号の k の値 */
export const EXIT_K: Record<string, number> = { exit: 150, exitSym: 100, aisle: 50 };

/** 施行規則第28条の3第2項第1号の表（等級別の距離 m） */
export const EXIT_GRADE_D: Record<string, Record<string, number>> = {
  exit: { A: 60, B: 30, C: 15 },
  exitSym: { A: 40, B: 20, C: 15 },
  aisle: { A: 20, B: 15, C: 10 },
};

const isMethod = (m: string) => (v: RawValues) => v.method === m;

export const exitSignRange: ToolDef = {
  id: 'FP-05',
  slug: 'exit-sign-range',
  category: 'fire',
  title: '誘導灯の有効範囲',
  summary: '避難口誘導灯・通路誘導灯の有効範囲（歩行距離）を、式 D = k·h または等級別の距離で求めます。',
  keywords: ['誘導灯', '避難口誘導灯', '通路誘導灯', '有効範囲', '歩行距離', 'A級', 'B級', 'C級', 'シンボル', '表示面'],
  references: [
    '消防法施行令 第26条（誘導灯及び誘導標識に関する基準）',
    '消防法施行規則 第28条の3第1項（区分と表示面の縦寸法）',
    '消防法施行規則 第28条の3第2項第1号（等級別の距離）・第2号（D = kh）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'method',
      label: '求め方',
      display: 'segmented',
      options: [
        { value: 'formula', label: '式 D = k·h' },
        { value: 'grade', label: '等級別の距離' },
      ],
      help: '施行規則第28条の3第2項の第1号（等級別の距離）と第2号（式）のどちらで求めてもよく、いずれかの距離以下の範囲が有効範囲です。',
    },
    {
      type: 'select',
      key: 'kind',
      label: '誘導灯の種類',
      display: 'segmented',
      options: [
        { value: 'exit', label: '避難口（シンボルなし）' },
        { value: 'exitSym', label: '避難口（シンボルあり）' },
        { value: 'aisle', label: '通路' },
      ],
      help: 'シンボルは、避難口誘導灯の表示面にある避難の方向を示す矢印です。',
    },
    {
      type: 'number',
      key: 'h',
      label: '表示面の縦寸法 h',
      unit: 'm',
      min: 0,
      exclusiveMin: true,
      visible: isMethod('formula'),
      help: 'm で入力します（200 mm なら 0.2）。A級 0.4 m 以上、B級 0.2 m 以上 0.4 m 未満、C級 0.1 m 以上 0.2 m 未満です。',
      suggestions: [
        { label: 'C級 0.1', value: 0.1 },
        { label: 'B級 0.2', value: 0.2 },
        { label: 'A級 0.4', value: 0.4 },
      ],
    },
    {
      type: 'select',
      key: 'grade',
      label: '等級',
      display: 'segmented',
      visible: isMethod('grade'),
      options: [
        { value: 'A', label: 'A級' },
        { value: 'B', label: 'B級' },
        { value: 'C', label: 'C級' },
      ],
    },
    {
      type: 'select',
      key: 'judge',
      label: '歩行距離による判定',
      display: 'segmented',
      options: [
        { value: 'on', label: '判定する' },
        { value: 'off', label: '判定しない' },
      ],
    },
    {
      type: 'number',
      key: 'L',
      label: '誘導灯までの歩行距離',
      unit: 'm',
      min: 0,
      visible: (v) => v.judge === 'on',
      help: '有効範囲に含めたい最も遠い位置から、誘導灯までの歩行距離です。',
    },
  ],
  defaults: { method: 'formula', kind: 'exit', h: '0.2', grade: 'B', judge: 'on', L: '25' },
  notes: [
    '有効範囲は、誘導灯までの歩行距離が第1号（等級別の距離）または第2号（D = k·h）のいずれかの距離以下となる範囲です（施行規則第28条の3第2項）。',
    '誘導灯を容易に見通せない場合や識別できない場合は、有効範囲は歩行距離 10 m 以下の範囲になります（同項ただし書）。',
    '階段・傾斜路に設ける通路誘導灯は対象外です。',
    '停車場・地下街・準地下街と、劇場・キャバレー・飲食店・百貨店などで床面積 1,000 m² 以上の階では、A級またはB級（明るさの条件付き）としなければなりません（施行規則第28条の3第4項第3号）。',
    '消防用設備等は、所轄消防署の指導によって取扱いが異なる場合があります。設計の前に所轄消防と協議してください。',
  ],
  doc: fp05Doc,
  beginner: fp05Beginner,
  build(v) {
    const kind = str(v, 'kind');
    const method = str(v, 'method');
    const judge = str(v, 'judge') === 'on';
    const s = new SheetBuilder();
    s.section('計算条件')
      .input('kind', '誘導灯の種類', KIND_LABEL[kind])
      .input('method', '求め方', method === 'formula' ? '式 D = k·h（第2号）' : '等級別の距離（第1号）');

    let D: number;
    if (method === 'formula') {
      const k = EXIT_K[kind];
      const h = num(v, 'h');
      D = Math.round(k * h * 1e6) / 1e6;
      s.input('k', '種類による係数', k, { symbol: 'k', note: '施行規則第28条の3第2項第2号の表' })
        .section('入力値')
        .input('h', '表示面の縦寸法', h, { symbol: 'h', unit: 'm', digits: 2 })
        .section('有効範囲')
        .calc('cls', '縦寸法による区分', {
          value: h >= 0.4 ? 'A級' : h >= 0.2 ? 'B級' : h >= 0.1 ? 'C級' : '区分外',
          format: 'text',
          expr: '{h} から A級（0.4 以上）・B級（0.2 以上）・C級（0.1 以上）を判別',
          formula: 'IF({h}>=0.4,"A級",IF({h}>=0.2,"B級",IF({h}>=0.1,"C級","区分外")))',
          note: '施行規則第28条の3第1項',
        })
        .calc('D', '有効範囲（歩行距離）', { symbol: 'D', unit: 'm', value: D, expr: '{k} × {h}', formula: 'ROUND({k}*{h},6)', digits: 1 });
      if (h < 0.1) s.warn('表示面の縦寸法が 0.1 m 未満です。施行規則第28条の3第1項の区分（A級・B級・C級）に該当しません。');
    } else {
      const grade = str(v, 'grade');
      D = EXIT_GRADE_D[kind][grade];
      s.input('grade', '等級', `${grade}級`)
        .section('有効範囲')
        .input('D', '有効範囲（歩行距離）', D, { symbol: 'D', unit: 'm', note: '施行規則第28条の3第2項第1号の表' });
    }

    if (judge) {
      const L = num(v, 'L');
      s.section('判定')
        .input('L', '誘導灯までの歩行距離', L, { symbol: 'L', unit: 'm', digits: 1 })
        .judge('ok', '有効範囲内か', L <= D, { expr: '{L} ≤ {D}', formula: 'IF({L}<={D},"OK","NG")' })
        .highlight('D', 'ok');
      if (L > D) s.warn(`歩行距離 ${L} m が有効範囲 ${D} m を超えています。誘導灯を追加するか、大きい区分の誘導灯を検討してください。`);
    } else {
      s.highlight('D');
    }
    return s.result();
  },
};
