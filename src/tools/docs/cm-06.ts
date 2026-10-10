import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

export function cm06Doc(v: Values): ToolDoc {
  const basis = String(v.basis);
  const kvmode = String(v.kvmode);
  const check = String(v.check) === 'yes';

  const formulas: ToolDoc['formulas'] = [];
  const symbols: SymbolDoc[] = [];

  if (basis === 'guide') {
    formulas.push({
      title: '設計用水平震度（建築設備耐震設計・施工指針）',
      expr: 'KH = 指針の表の値',
      body: '一般の設備機器は、告示に震度の表がないため、「建築設備耐震設計・施工指針」で設置場所（地階・1階、中間階、上層階・屋上）と耐震クラス（S・A・B）から KH を決めます。本ツールは指針の値を内蔵していないので、指針の表で確認して入力します。',
    });
    symbols.push({ symbol: 'KH', origin: 'K（震度 seismic coefficient を表す慣用記号）に H（Horizontal：水平）を添えた、指針で使われる記号', meaning: '設計用水平震度（指針の表で確認した値）', unit: '—' });
  } else {
    formulas.push(
      basis === 'k1388'
        ? {
            title: '設計用水平震度（平成12年建設省告示第1388号 第五第四号）',
            expr: 'KH = Z × Ks',
            body: '質量15kgを超える給湯設備の規定です。告示の式は P = k·w で、k は地震地域係数 Z に設計用標準震度（地階・1階 0.4、中間階 0.6、上層階・屋上 1.0）を掛けた値です。本ツールでは k を KH として扱います。一般の設備機器にこの表をそのまま当てはめるものではありません。',
          }
        : {
            title: '設計用水平震度（平成12年建設省告示第1389号）',
            expr: 'KH = Z × 1.0',
            body: '屋上から突出する水槽・冷却塔などの規定です。告示の式は P = k·w で、k は Z × 1.0 以上とします。転倒・移動を防ぐ措置を講じた場合は地震力を1/2まで低減できますが、本ツールでは低減していません。',
          },
    );
    symbols.push(
      { symbol: 'Z', origin: '昭和55年建設省告示第1793号の記号（地震地域係数）', meaning: '地域ごとの地震の起こりやすさに応じて地震力を割り引く係数（1.0〜0.7）', unit: '—' },
      { symbol: 'Ks', origin: 'K（震度）に s（standard：標準）を添えた本サイトの表記', meaning: basis === 'k1388' ? '告示第1388号の設計用標準震度（地階・1階 0.4、中間階 0.6、上層階・屋上 1.0）' : '告示第1389号の係数 1.0（k = Z × 1.0 以上）', unit: '—' },
      { symbol: 'KH', origin: 'K（震度）に H（Horizontal：水平）を添えた記号。告示の k にあたる値として本サイトで使用', meaning: '設計用水平震度', unit: '—' },
    );
  }

  formulas.push({
    title: kvmode === 'half' ? '設計用鉛直震度（建築設備耐震設計・施工指針）' : '設計用鉛直震度',
    expr: kvmode === 'half' ? 'KV = KH ÷ 2' : kvmode === 'input' ? 'KV = 入力値' : 'KV = 0',
    body: kvmode === 'half'
      ? '鉛直方向の揺れは水平の半分とする、指針による扱いです。告示には鉛直震度の規定はありません。鉛直地震力は機器を浮き上がらせる向きに働くとして、転倒を抑える自重から差し引きます。'
      : kvmode === 'input'
        ? '鉛直震度を直接入力した値で計算します。告示には鉛直震度の規定はなく、指針では KH/2 とする扱いがあります。'
        : '鉛直地震力を考慮せずに計算します。指針では KV = KH/2 とする扱いがあるので、考慮しない理由を確認してください。',
  });
  symbols.push(
    { symbol: 'KV', origin: 'K（震度）に V（Vertical：鉛直）を添えた、指針で使われる記号', meaning: '設計用鉛直震度', unit: '—' },
    { symbol: 'W', origin: 'Weight（重量）の頭文字', meaning: '機器の運転重量（内容物を含む）。告示の w（固定荷重＋積載荷重）にあたる', unit: 'kN' },
    { symbol: 'hG', origin: 'h（height：高さ）に G（重心 center of Gravity）を添えた記号', meaning: '据付面から機器の重心までの高さ', unit: 'mm' },
    { symbol: 'lG', origin: 'l（length：長さ）に G（重心）を添えた記号', meaning: '転倒の支点側のボルト列から重心までの水平距離', unit: 'mm' },
    { symbol: 'l', origin: 'length（長さ）の頭文字', meaning: '検討する方向のボルト間隔（支点側と引張側のボルト列の距離）', unit: 'mm' },
    { symbol: 'nt', origin: 'n（number：本数）に t（tension：引張）を添えた記号', meaning: '片側（引張側）のボルト本数', unit: '本' },
    { symbol: 'n', origin: 'number（本数）の頭文字', meaning: 'ボルトの総本数', unit: '本' },
    { symbol: 'FH', origin: 'F（Force：力）に H（Horizontal：水平）を添えた記号', meaning: '設計用水平地震力', unit: 'kN' },
    { symbol: 'FV', origin: 'F（Force：力）に V（Vertical：鉛直）を添えた記号', meaning: '設計用鉛直地震力', unit: 'kN' },
    { symbol: 'Rb₀', origin: 'Rb に添字 0 を付けた本サイトの表記（0 未満を 0 に置き換える前の値）', meaning: '引抜力の計算値（負なら引抜は生じない）', unit: 'kN' },
    { symbol: 'Rb', origin: 'R（Reaction：反力）に b（bolt：ボルト）を添えた記号', meaning: 'アンカーボルト1本に生じる引抜力', unit: 'kN' },
    { symbol: 'Q', origin: 'せん断力を表す慣用記号', meaning: 'アンカーボルト1本に生じるせん断力', unit: 'kN' },
  );

  formulas.push(
    { title: '設計用地震力', expr: 'FH = KH × W、 FV = KV × W', body: '機器の重量に震度を掛けて、地震のときに機器に働く水平方向・鉛直方向の力を求めます。' },
    {
      title: '引抜力（建築設備耐震設計・施工指針の考え方）',
      expr: 'Rb = (FH × hG − (W − FV) × lG) ÷ (l × nt)',
      body: '転倒の支点まわりのモーメントの釣り合いです。FH × hG は機器を倒そうとするモーメント、(W − FV) × lG は自重で踏みとどまろうとするモーメントです。その差を、ボルト間隔 l と引張側の本数 nt で割ると1本当たりの引抜力になります。計算値が負なら引抜は生じないので 0 とします。',
    },
    { title: 'せん断力', expr: 'Q = FH ÷ n', body: '水平地震力をすべてのボルトで均等に受けるとして、1本当たりのせん断力を求めます。' },
  );

  if (check) {
    formulas.push({ title: '判定', expr: 'Rb ≤ Ta、 Q ≤ Qa', body: '1本当たりの引抜力・せん断力が、それぞれの許容値（短期）以下なら OK です。許容値はアンカーの種類・径・埋込み長さ・コンクリート強度で変わるので、指針やメーカー資料で確認します。' });
    symbols.push(
      { symbol: 'Ta', origin: 'T（Tension：引張）に a（allowable：許容）を添えた記号', meaning: 'アンカーボルト1本の許容引抜力（短期）', unit: 'kN' },
      { symbol: 'Qa', origin: 'Q（せん断力）に a（allowable：許容）を添えた記号', meaning: 'アンカーボルト1本の許容せん断力（短期）', unit: 'kN' },
    );
  }
  return { formulas, symbols };
}

export const cm06Beginner: BeginnerDoc = {
  purpose: [
    '地震のときに設備機器が倒れたりずれたりしないよう、機器を床に固定するアンカーボルトにかかる力（引抜力とせん断力）を求める計算です。',
    '実施設計や施工図の段階で、機器の重量・重心・ボルト配置が決まったときに使います。求めた力が、選んだアンカーボルトの許容値以下であることを確かめます。',
  ],
  terms: [
    { term: '設計用水平震度 KH', desc: '機器の重量の何倍の力が水平に働くかを表す係数。KH = 1.0 なら重量と同じ大きさの力が横向きに働くとみなします。' },
    { term: '設計用鉛直震度 KV', desc: '上下方向の揺れによる力の係数。指針では KH の半分とします。告示には規定がありません。' },
    { term: '運転重量（kN）', desc: '水や油などの内容物を含めた、運転中の機器の重量。1 kN は約 102 kg の重さです。' },
    { term: '引抜力・せん断力', desc: '引抜力はボルトを床から引き抜こうとする力、せん断力はボルトを横から断ち切ろうとする力です。' },
    { term: '告示と指針', desc: '告示（国の基準）は給湯設備や屋上の水槽などの地震力を定めています。一般の設備機器の震度の決め方や鉛直震度は、日本建築センターの「建築設備耐震設計・施工指針」によります。' },
  ],
  example: {
    title: '運転重量 10 kN、KH = 1.0、重心高さ 800 mm、lG = 400 mm、ボルト間隔 800 mm、片側 2 本・計 4 本の場合',
    steps: [
      '鉛直震度 KV = 1.0 ÷ 2 = 0.5',
      '水平地震力 FH = 1.0 × 10 = 10 kN、鉛直地震力 FV = 0.5 × 10 = 5 kN',
      '引抜力 Rb = (10 × 800 − (10 − 5) × 400) ÷ (800 × 2) = (8000 − 2000) ÷ 1600 = 3.75 kN',
      'せん断力 Q = 10 ÷ 4 = 2.5 kN',
      '許容引抜力 5 kN、許容せん断力 5 kN なら、どちらも OK',
    ],
  },
  pitfalls: [
    '告示第1388号の 0.4／0.6／1.0 を一般の設備機器の震度だと思い込む。この表は質量15kgを超える給湯設備の規定です。',
    '運転重量ではなく乾燥重量（空の重量）で計算してしまう。水槽や冷温水機器では大きく違います。',
    'lG にボルト間隔の全長や、引張側のボルトからの距離を入れてしまう。lG は転倒の支点側（圧縮側）のボルト列から重心までの距離です。',
    'nt にボルトの総本数を入れてしまう。nt は引張を受ける片側の列の本数です。',
    '長辺方向と短辺方向の両方を検討しない。ボルト間隔が短い方向のほうが引抜力は大きくなります。',
  ],
};
