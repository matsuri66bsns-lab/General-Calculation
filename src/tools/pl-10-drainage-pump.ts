import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num } from '../core/values';
import { pl10Beginner, pl10Doc } from './docs/pl-10';

/** 水の密度 × 重力加速度（kPa/m）。水柱 1 m の圧力 */
const RHO_G = 9.80665;

export const drainagePump: ToolDef = {
  id: 'PL-10',
  slug: 'drainage-pump',
  category: 'plumbing',
  title: '排水槽の容量・排水ポンプ',
  summary: '排水槽の有効容量を時間平均流量から求め、排水ポンプの吐出量・全揚程・軸動力を計算します。',
  keywords: ['排水槽', '排水ポンプ', '汚水槽', '雑排水槽', '湧水槽', '有効容量', '水中ポンプ', '全揚程', '吐出量', 'ビルピット', '軸動力'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」令和6年版 第5編 第4章 第2節 排水槽（容量は時間平均流量に基づく）、第3節 排水ポンプ（能力は排水槽の容量と排出時間に基づく）',
    '昭和50年建設省告示第1597号「建築物に設ける飲料水の配管設備及び排水のための配管設備の構造方法を定める件」第2 第二号（排水槽）',
    '建築物における衛生的環境の確保に関する法律施行規則 第4条の3（排水に関する設備の掃除）',
    '建築設備設計計算書作成の手引（公共建築協会）様式 機-121（計算項目の参考）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'number',
      key: 'Qd',
      label: '排水槽に流入する1日の排水量',
      unit: 'm³/日',
      min: 0,
      exclusiveMin: true,
      help: 'この排水槽に流れ込む器具・系統の1日の排水量です。給水量から求める場合は、雑用水・散水など排水にならない分を除きます。湧水槽は湧水量の想定値を入れます。',
    },
    {
      type: 'number',
      key: 'Td',
      label: '1日の排水時間（建物の使用時間）',
      unit: 'h',
      min: 0,
      exclusiveMin: true,
      max: 24,
      help: '1日の排水量が流れ込む時間です。時間平均流量 = 1日の排水量 ÷ この時間 になります。事務所なら執務時間（8〜10 h など）を入れます。',
      suggestions: [
        { label: '8 h', value: 8 },
        { label: '10 h', value: 10 },
        { label: '24 h', value: 24 },
      ],
    },
    {
      type: 'number',
      key: 'ts',
      label: '貯留時間（時間平均流量の何時間分を貯めるか）',
      unit: 'h',
      min: 0,
      exclusiveMin: true,
      help: '設計基準の本文は「時間平均流量に基づき算定する。地方公共団体の指導基準がある場合はその基準による」としています。何時間分とするかは、所轄の自治体（下水道・保健所）の指導基準と設計基準の原文で確認してください。貯め過ぎると排水が腐敗し悪臭の原因になります。',
      suggestions: [
        { label: '0.5 h', value: 0.5 },
        { label: '1 h', value: 1 },
        { label: '2 h', value: 2 },
      ],
    },
    {
      type: 'number',
      key: 'V',
      label: '採用する有効容量',
      unit: 'm³',
      min: 0,
      exclusiveMin: true,
      help: 'ポンプの停止水位から始動水位（満水警報水位より下）までの容量です。槽の寸法から決めた値を入れます。必要有効容量以上か判定します。',
    },
    {
      type: 'number',
      key: 'T',
      label: '排出時間（有効容量をポンプで汲み出す時間）',
      unit: 'min',
      min: 0,
      exclusiveMin: true,
      help: '始動水位から停止水位までを汲み出すのにかける時間です。短くするとポンプが大きく、発停が頻繁になります。採用値は設計基準の原文で確認してください。',
      suggestions: [
        { label: '10 min', value: 10 },
        { label: '15 min', value: 15 },
        { label: '20 min', value: 20 },
      ],
    },
    {
      type: 'number',
      key: 'Qin',
      label: '最大流入量（比べる場合）',
      unit: 'L/min',
      min: 0,
      help: '排水槽へ瞬間的に流れ込む最大の流量です。入れると、排出時間から求めた吐出量と比べて大きい方をポンプの吐出量にします。0 にすると比べません。',
    },
    {
      type: 'number',
      key: 'H1',
      label: '吸上水位差',
      unit: 'm',
      min: 0,
      help: 'ポンプの停止水位（低水位）から、排水槽の上面など押上げの起点までの高さです。',
    },
    {
      type: 'number',
      key: 'H2',
      label: '押上水位差',
      unit: 'm',
      min: 0,
      help: '押上げの起点から、放流先（屋外の桝・排水横主管への接続点など）までの高さです。H1 と H2 の和が実揚程になります。',
    },
    {
      type: 'number',
      key: 'H3',
      label: '出口水頭',
      unit: 'm',
      min: 0,
      help: '吐出口で残す水頭です。大気に開放された桝・排水管へ放流する場合は、速度水頭（v² ÷ 2g、流速 2 m/s で約 0.2 m）程度です。',
    },
    {
      type: 'number',
      key: 'H4',
      label: '配管抵抗（局部損失を含む）',
      unit: 'm',
      min: 0,
      help: '吐出管の直管と継手・弁（逆止弁・仕切弁）の損失の合計を水頭で入れます。直管長 × 単位摩擦損失 ×（1 + 局部損失の割合）÷ 9.80665 などで求めます。',
    },
    {
      type: 'number',
      key: 'K',
      label: '余裕係数',
      min: 1,
      help: '全揚程に掛ける余裕です。採用値は設計基準の原文で確認してください。',
      suggestions: [
        { label: '1.0', value: 1 },
        { label: '1.1', value: 1.1 },
        { label: '1.2', value: 1.2 },
      ],
    },
    {
      type: 'number',
      key: 'etap',
      label: 'ポンプ効率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: 'メーカーの性能曲線の値を入れます。小形の水中ポンプは 0.3〜0.5 程度のことが多いです（目安）。',
    },
    {
      type: 'number',
      key: 'etat',
      label: '伝達効率（電動機との継手）',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '水中モーターポンプのように電動機とポンプが直結のものは 1.0 とします。',
      suggestions: [{ label: '直結 1.0', value: 1 }],
    },
  ],
  defaults: { Qd: '30', Td: '10', ts: '1', V: '3', T: '15', Qin: '150', H1: '3', H2: '4', H3: '0.2', H4: '3', K: '1.1', etap: '0.5', etat: '1' },
  notes: [
    '建築設備設計基準（第5編 第4章）では、排水槽は汚水槽と雑排水槽に分け（衛生上の支障がなければ合流でもよい）、厨房排水槽は専用とします。排水ポンプは原則として水中モーターポンプを2台一組で設け、排水槽の通気管は単独で大気に開放します。排水ポンプは排水槽の水位で自動運転します（第6編 自動制御設備）。',
    '本ツールの吐出量はポンプ1台当たりの値です。2台一組は、1台が故障・点検中でも残りの1台で排水できるようにするためです。',
    '排水槽の構造は告示（昭和50年建設省告示第1597号 第2 第二号）で決められています。通気の装置以外から臭気が漏れない構造とする、直径 60 cm 以上の円が内接するマンホールを設ける（外部から保守点検が容易な小規模な槽を除く）、底に吸い込みピットを設ける、底の勾配は吸い込みピットに向かって 1/15 以上 1/10 以下とする、通気の装置を設けて直接外気に衛生上有効に開放する、などです。',
    '特定建築物では、建築物衛生法施行規則 第4条の3 により、排水槽を含む排水に関する設備の掃除を6か月以内ごとに1回、定期に行います。',
    '排水槽の容量は、地方公共団体の指導基準（ビルピットの悪臭防止など）がある場合はそちらに従います。貯留時間・排出時間・余裕係数は本ツールに内蔵していないので、設計基準の原文と所轄の指導基準で確認してください。',
    '軸動力は ρg = 9.80665 kPa/m（水の密度 1000 kg/m³）で計算しています。手引の様式の式 Q × H ÷ (6,120 × ηp) と同じ内容を SI 単位で書いたものです。',
  ],
  doc: pl10Doc,
  beginner: pl10Beginner,
  build(v) {
    const Qd = num(v, 'Qd');
    const Td = num(v, 'Td');
    const ts = num(v, 'ts');
    const V = num(v, 'V');
    const T = num(v, 'T');
    const Qin = num(v, 'Qin');
    const H1 = num(v, 'H1');
    const H2 = num(v, 'H2');
    const H3 = num(v, 'H3');
    const H4 = num(v, 'H4');
    const K = num(v, 'K');
    const etap = num(v, 'etap');
    const etat = num(v, 'etat');

    const Qa = Qd / Td;
    const Vr = Qa * ts;
    const s = new SheetBuilder();
    s.section('排水槽の有効容量')
      .input('Qd', '1日の排水量', Qd, { symbol: 'Qd', unit: 'm³/日' })
      .input('Td', '1日の排水時間', Td, { symbol: 'Td', unit: 'h' })
      .calc('Qa', '時間平均流量', { symbol: 'Qa', unit: 'm³/h', value: Qa, expr: '{Qd} ÷ {Td}', formula: '{Qd}/{Td}', digits: 2 })
      .input('ts', '貯留時間', ts, { symbol: 'ts', unit: 'h', note: '所轄の指導基準・設計基準の原文で確認した値' })
      .calc('Vr', '必要有効容量', { symbol: 'Vr', unit: 'm³', value: Vr, expr: '{Qa} × {ts}', formula: '{Qa}*{ts}', digits: 2 })
      .input('V', '採用する有効容量', V, { symbol: 'V', unit: 'm³', digits: 2 })
      .judge('okV', '有効容量の判定', V >= Vr, { expr: '{V} ≥ {Vr}', formula: 'IF({V}>={Vr},"OK","NG")' });
    if (V < Vr) s.warn(`採用する有効容量 ${V} m³ が必要有効容量 ${Vr.toFixed(2)} m³ より小さくなっています。槽の寸法を見直すか、貯留時間の条件を確認してください。`);

    const Qv = (1000 * V) / T;
    let Q = Qv;
    s.section('排水ポンプの吐出量（1台当たり）').input('T', '排出時間', T, { symbol: 'T', unit: 'min' });
    if (Qin > 0) {
      Q = Math.max(Qv, Qin);
      s.calc('Qv', '排出時間から求めた吐出量', { symbol: 'Qv', unit: 'L/min', value: Qv, expr: '1000 × {V} ÷ {T}', formula: '1000*{V}/{T}', digits: 1 })
        .input('Qin', '最大流入量', Qin, { symbol: 'Qi', unit: 'L/min' })
        .calc('Q', 'ポンプの吐出量', { symbol: 'Q', unit: 'L/min', value: Q, expr: 'max({Qv}, {Qin})', formula: 'MAX({Qv},{Qin})', digits: 1, note: '大きい方を採用' });
    } else {
      s.calc('Q', 'ポンプの吐出量', { symbol: 'Q', unit: 'L/min', value: Q, expr: '1000 × {V} ÷ {T}', formula: '1000*{V}/{T}', digits: 1 });
    }

    const SH = H1 + H2 + H3 + H4;
    const H = K * SH;
    s.section('全揚程')
      .input('H1', '吸上水位差', H1, { symbol: 'H₁', unit: 'm' })
      .input('H2', '押上水位差', H2, { symbol: 'H₂', unit: 'm' })
      .input('H3', '出口水頭', H3, { symbol: 'H₃', unit: 'm' })
      .input('H4', '配管抵抗', H4, { symbol: 'H₄', unit: 'm', note: '局部損失を含む' })
      .calc('SH', '揚程の合計', { symbol: 'ΣHi', unit: 'm', value: SH, expr: '{H1} + {H2} + {H3} + {H4}', formula: '{H1}+{H2}+{H3}+{H4}', digits: 2 })
      .input('K', '余裕係数', K, { symbol: 'K', digits: 2 })
      .calc('H', '全揚程', { symbol: 'H', unit: 'm', value: H, expr: '{K} × {SH}', formula: '{K}*{SH}', digits: 1 });

    const Ps = (RHO_G * (Q / 60000) * H) / etap;
    const Pm = Ps / etat;
    s.section('軸動力・電動機出力')
      .input('etap', 'ポンプ効率', etap, { symbol: 'ηp', digits: 2 })
      .input('etat', '伝達効率', etat, { symbol: 'ηt', digits: 2 })
      .calc('Ps', '軸動力', {
        symbol: 'Ps',
        unit: 'kW',
        value: Ps,
        expr: '9.80665 × {Q} ÷ 60000 × {H} ÷ {etap}',
        formula: '9.80665*{Q}/60000*{H}/{etap}',
        digits: 2,
      })
      .calc('Pm', '電動機の所要出力', { symbol: 'Pm', unit: 'kW', value: Pm, expr: '{Ps} ÷ {etat}', formula: '{Ps}/{etat}', digits: 2, note: 'これ以上の定格出力の電動機を選ぶ' })
      .highlight('Vr', 'okV', 'Q', 'H', 'Pm');
    return s.result();
  },
};
