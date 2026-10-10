import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

export function hv11Doc(v: Values): ToolDoc {
  const ratio = String(v.local) !== 'eq';
  const open = String(v.circuit) === 'open';
  const power = String(v.pw) === 'yes';

  const formulas: ToolDoc['formulas'] = [
    ratio
      ? {
          title: '配管の損失（局部損失を割合で見込む）',
          expr: 'Pp = R × L × (1 + k) ÷ 1000',
          body: '直管の摩擦損失 R × L に、継手・弁類による局部損失を直管損失の k 倍として加えます。1000 で割って Pa を kPa にします。',
        }
      : {
          title: '配管の損失（局部損失を相当長で見込む）',
          expr: 'Pp = R × (L + Le) ÷ 1000',
          body: '継手・弁類を同じ損失になる直管の長さ（相当長 Le）に置き換え、直管の長さに足してから単位摩擦損失を掛けます。',
        },
    {
      title: '圧力から水頭への換算',
      expr: 'hp = Pp × 1000 ÷ (ρ × g)、 he = Pe × 1000 ÷ (ρ × g)',
      body: 'ポンプの揚程は水の柱の高さ（m）で表します。圧力 [Pa] を ρg [N/m³] で割ると高さになります。水では 1 m ≒ 9.8 kPa です。',
    },
    open
      ? {
          title: '全揚程（開放回路）',
          expr: 'H = hp + he + ha',
          body: '配管と機器の損失水頭に、水を持ち上げる高さ（実揚程 ha）を加えます。冷却塔のように水が大気に開放される回路では、この高さ分の仕事が必要です。',
        }
      : {
          title: '全揚程（密閉回路）',
          expr: 'H = hp + he',
          body: '密閉回路では、往き管で水を上げる分と還り管で水が下がる分が打ち消し合うため、実揚程は 0 です。配管と機器の損失水頭の合計が全揚程になります。',
        },
    { title: '余裕を見込んだ全揚程', expr: 'H′ = H × (1 + α ÷ 100)', body: '施工時の配管経路の変更や、長年の使用によるスケール付着などに備えて余裕を見込みます。' },
  ];
  if (power) {
    formulas.push({
      title: '軸動力',
      expr: 'P = ρ × g × (G ÷ 60000) × H′ ÷ (1000 × η)',
      body: '水に与える動力（水動力）は ρgQH [W] です。流量 G [L/min] を 60000 で割って m³/s にし、1000 で割って kW に、ポンプ効率 η で割って軸動力にします。',
    });
  }

  const symbols: SymbolDoc[] = [
    { symbol: 'L', origin: 'Length（長さ）の頭文字', meaning: '直管の長さ（最遠の機器までの往復）', unit: 'm' },
    { symbol: 'R', origin: 'Resistance（抵抗）の頭文字。配管設計で慣用', meaning: '単位摩擦損失（配管 1 m 当たり）', unit: 'Pa/m' },
  ];
  if (ratio) symbols.push({ symbol: 'k', origin: '係数（coefficient）を表す慣用記号', meaning: '局部損失の割合（直管損失に対する比）', unit: '—' });
  else symbols.push({ symbol: 'Le', origin: 'L（長さ）に e（equivalent：相当）を添えたもの', meaning: '継手・弁類の相当長の合計', unit: 'm' });
  symbols.push({ symbol: 'Pe', origin: 'P（Pressure：圧力）に e（equipment：機器）を添えた本サイトの表記', meaning: '機器の抵抗の合計（熱源・コイル・弁類など）', unit: 'kPa' });
  if (open) symbols.push({ symbol: 'ha', origin: 'h（head：水頭・揚程）に a（actual：実）を添えたもの', meaning: '実揚程（吸込水面から吐出し開放端までの高さ）', unit: 'm' });
  symbols.push(
    { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '水の密度', unit: 'kg/m³' },
    { symbol: 'g', origin: 'gravity（重力）の頭文字', meaning: '重力加速度（標準重力 9.80665）', unit: 'm/s²' },
    { symbol: 'α', origin: 'ギリシャ文字アルファ。余裕率を表す記号として本サイトで使用', meaning: '揚程の余裕率', unit: '%' },
    { symbol: 'Pp', origin: 'P に p（pipe：配管）を添えた本サイトの表記', meaning: '配管の損失（直管＋局部）', unit: 'kPa' },
    { symbol: 'hp', origin: 'h（head：水頭）に p（pipe：配管）を添えた本サイトの表記', meaning: '配管の損失水頭', unit: 'm' },
    { symbol: 'he', origin: 'h に e（equipment：機器）を添えた本サイトの表記', meaning: '機器の損失水頭', unit: 'm' },
    { symbol: 'H', origin: 'Head（揚程）の頭文字。JIS のポンプの全揚程の記号', meaning: 'ポンプの全揚程', unit: 'm' },
    { symbol: 'H′', origin: 'H にダッシュ（′）を付けた本サイトの表記', meaning: '余裕を見込んだ全揚程', unit: 'm' },
  );
  if (power) {
    symbols.push(
      { symbol: 'G', origin: '水量を表す慣用記号（空調・衛生分野で流量に用いる）', meaning: 'ポンプの流量', unit: 'L/min' },
      { symbol: 'η', origin: 'ギリシャ文字イータ。効率を表す慣用記号', meaning: 'ポンプ効率', unit: '—' },
      { symbol: 'P', origin: 'Power（動力）の頭文字', meaning: 'ポンプの軸動力', unit: 'kW' },
    );
  }
  return { formulas, symbols };
}

export const hv11Beginner: BeginnerDoc = {
  purpose: [
    '冷温水ポンプは、配管や機器で失われる圧力を補って水を循環させます。ポンプに必要な「押し上げる力」を水の高さで表したものが全揚程で、その値を求める計算です。',
    '配管の管径と経路が決まり、熱源機器・空調機が選ばれた実施設計の段階で使います。流量（HV-10）と全揚程でポンプの機種と電動機を選びます。',
  ],
  terms: [
    { term: '全揚程（m）', desc: 'ポンプが水に与える圧力を水の柱の高さで表したもの。水では 10 m ≒ 98 kPa です。' },
    { term: '単位摩擦損失（Pa/m）', desc: '配管 1 m 当たりに摩擦で失われる圧力。管径と流量で決まります。' },
    { term: '局部損失・相当長', desc: 'エルボ・バルブなどで生じる損失。同じ損失になる直管の長さに置き換えたものを相当長といいます。' },
    { term: '密閉回路・開放回路', desc: '密閉回路は水が大気に触れずに循環する回路（冷温水配管など）。開放回路は冷却塔のように途中で大気に開放される回路です。' },
    { term: '実揚程（m）', desc: '吸い込む水面から吐き出す開放端までの高さの差。開放回路でだけ必要です。' },
  ],
  example: {
    title: '密閉回路、直管 200 m、R = 400 Pa/m、局部損失 0.4、機器抵抗 120 kPa、流量 300 L/min の場合',
    steps: [
      '配管の損失 Pp = 400 × 200 × (1 + 0.4) ÷ 1000 = 112 kPa',
      '配管の損失水頭 hp = 112 × 1000 ÷ (1000 × 9.80665) ≒ 11.42 m、機器の損失水頭 he = 120 × 1000 ÷ 9806.65 ≒ 12.24 m',
      '全揚程 H = 11.42 + 12.24 ≒ 23.66 m（密閉回路のため実揚程は 0）',
      '余裕率 10 % で H′ = 23.66 × 1.1 ≒ 26.0 m',
      '軸動力 P = 1000 × 9.80665 × (300 ÷ 60000) × 26.02 ÷ (1000 × 0.6) ≒ 2.13 kW',
    ],
  },
  pitfalls: [
    '直管の長さに片道だけを入れる。循環する回路では往き管と還り管の合計で計算します。',
    '密閉回路に建物の高さ（実揚程）を足してしまう。密閉回路では高さの差は打ち消し合うので不要です（膨張タンクで静水圧を保ちます）。',
    'kPa と m の換算忘れ。機器抵抗は kPa で表示されることが多く、1 m ≒ 9.8 kPa で換算します。',
    '最も抵抗の大きい経路（最遠の機器、抵抗の大きいコイルなど）ではなく、近い経路で計算してしまう。',
  ],
};
