import type { BeginnerDoc, ToolDoc } from '../../core/types';

export function hv09Doc(): ToolDoc {
  return {
    formulas: [
      { title: '直管の摩擦損失', expr: 'Pf = R × L', body: 'ダクト 1 m 当たりの摩擦損失 R に、最も抵抗の大きい経路の直管の長さ L を掛けます。' },
      {
        title: '局部抵抗',
        expr: 'Pz = Σζ × ρ × v² ÷ 2',
        body: 'エルボ・分岐・ダンパーなどで生じる損失は、その箇所の動圧（ρv²/2）に局部抵抗係数 ζ を掛けて求めます。ここでは係数の合計 Σζ と代表風速 v でまとめて計算します。風速が箇所ごとに大きく違う場合は、箇所ごとに ζ × 動圧 を計算して機器抵抗に加える方法もあります。',
      },
      { title: '送風機全圧', expr: 'Pt = Pf + Pz + Pe', body: '直管の摩擦損失、局部抵抗、機器抵抗（フィルター・コイル・吹出口など）を合計したものが、送風機が空気に与えるべき全圧です。' },
      {
        title: '送風機静圧（JIS B 8330 の定義）',
        expr: 'Ps = Pt − Pvd、 Pvd = ρ × vd² ÷ 2',
        body: '送風機の静圧は、全圧から吐出口の動圧を引いた値です。送風機のカタログは静圧で表示されることが多いため、比べるときはこの値を使います。',
      },
      { title: '余裕を見込んだ値', expr: 'Pt′ = Pt × (1 + αp ÷ 100)、 Ps′ = Ps × (1 + αp ÷ 100)', body: '施工時のダクト経路の変更やフィルターの汚れなどに備えて、計算値に余裕率を掛けます。' },
      {
        title: '軸動力',
        expr: 'P = Q × Pt′ ÷ (60 × 1000 × η)',
        body: '空気に与える動力は風量 [m³/s] × 全圧 [Pa] = [W] です。Q [m³/min] を 60 で割って m³/s に、1000 で割って kW にし、全圧効率 η で割って送風機の軸に必要な動力にします。',
      },
      { title: '電動機出力の目安', expr: 'Pm = P × (1 + αm ÷ 100)', body: '電動機は軸動力に余裕を見込んだ出力のものを選びます。実際には、この値以上の標準出力（例：2.2 kW、3.7 kW など）から選定します。' },
    ],
    symbols: [
      { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '風量', unit: 'm³/min' },
      { symbol: 'L', origin: 'Length（長さ）の頭文字', meaning: '最も抵抗の大きい経路の直管の長さ', unit: 'm' },
      { symbol: 'R', origin: 'Resistance（抵抗）の頭文字。ダクト設計で慣用される記号', meaning: '単位摩擦損失（ダクト 1 m 当たり）', unit: 'Pa/m' },
      { symbol: 'Σζ', origin: 'Σ（シグマ）は合計、ζ（ゼータ）は局部抵抗係数を表す慣用記号', meaning: '局部抵抗係数の合計', unit: '—' },
      { symbol: 'v', origin: 'velocity（速度）の頭文字', meaning: '局部抵抗の代表風速', unit: 'm/s' },
      { symbol: 'Pe', origin: 'P（Pressure：圧力）に e（equipment：機器）を添えた本サイトの表記', meaning: '機器抵抗の合計（フィルター・コイル・吹出口など）', unit: 'Pa' },
      { symbol: 'vd', origin: 'v に d（discharge：吐出し）を添えたもの', meaning: '送風機の吐出口風速', unit: 'm/s' },
      { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '空気の密度', unit: 'kg/m³' },
      { symbol: 'η', origin: 'ギリシャ文字イータ。効率を表す慣用記号', meaning: '送風機の全圧効率', unit: '—' },
      { symbol: 'αp', origin: 'α（アルファ）に p（pressure：圧力）を添えた本サイトの表記', meaning: '静圧（全圧）の余裕率', unit: '%' },
      { symbol: 'αm', origin: 'α に m（motor：電動機）を添えた本サイトの表記', meaning: '電動機出力の余裕率', unit: '%' },
      { symbol: 'Pf', origin: 'P に f（friction：摩擦）を添えたもの', meaning: '直管の摩擦損失', unit: 'Pa' },
      { symbol: 'Pv', origin: 'P に v（velocity：速度）を添えたもの。動圧の慣用記号', meaning: '代表風速の動圧', unit: 'Pa' },
      { symbol: 'Pz', origin: 'P に ζ（ゼータ）の z を添えた本サイトの表記', meaning: '局部抵抗による損失', unit: 'Pa' },
      { symbol: 'Pt', origin: 'P に t（total：全）を添えたもの。JIS の全圧の記号', meaning: '送風機全圧', unit: 'Pa' },
      { symbol: 'Pvd', origin: 'Pv（動圧）に d（discharge：吐出し）を添えたもの', meaning: '送風機吐出口の動圧', unit: 'Pa' },
      { symbol: 'Ps', origin: 'P に s（static：静）を添えたもの。JIS の静圧の記号', meaning: '送風機静圧', unit: 'Pa' },
      { symbol: 'Pt′', origin: 'Pt にダッシュ（′）を付けた本サイトの表記', meaning: '余裕を見込んだ設計全圧', unit: 'Pa' },
      { symbol: 'Ps′', origin: 'Ps にダッシュ（′）を付けた本サイトの表記', meaning: '余裕を見込んだ設計静圧', unit: 'Pa' },
      { symbol: 'P', origin: 'Power（動力）の頭文字', meaning: '送風機の軸動力', unit: 'kW' },
      { symbol: 'Pm', origin: 'P に m（motor：電動機）を添えた本サイトの表記', meaning: '電動機出力の目安', unit: 'kW' },
    ],
  };
}

export const hv09Beginner: BeginnerDoc = {
  purpose: [
    '送風機は、ダクトや機器で失われる圧力に打ち勝って空気を送ります。その圧力（静圧・全圧）と、送風機を回すのに必要な動力（軸動力）を求める計算です。',
    'ダクトの寸法（HV-08）が決まり、最遠の吹出口までの経路が分かった実施設計の段階で使います。結果の風量と静圧で送風機の機種と電動機の出力を選びます。',
  ],
  terms: [
    { term: '静圧（Pa）', desc: 'ダクトの壁を押し広げる向きに働く圧力。送風機のカタログは静圧で表示されることが多いです。' },
    { term: '動圧（Pa）', desc: '空気の流れの勢いを圧力で表したもの。ρ × v² ÷ 2 で、風速 10 m/s なら約 60 Pa です。' },
    { term: '全圧（Pa）', desc: '静圧と動圧の和。送風機が空気に与える圧力の合計です。' },
    { term: '局部抵抗係数 ζ', desc: 'エルボや分岐などで生じる損失が動圧の何倍かを表す係数。形状ごとに便覧やメーカー資料に載っています。' },
    { term: '全圧効率', desc: '空気に与えた動力（風量 × 全圧）を軸動力で割った値。送風機の性能を表します。' },
  ],
  example: {
    title: '風量 100 m³/min、直管 80 m、R = 1.0 Pa/m、Σζ = 6（代表風速 8 m/s）、機器抵抗 250 Pa の場合',
    steps: [
      '直管の摩擦損失 Pf = 1.0 × 80 = 80 Pa',
      '局部抵抗 Pz = 6 × 1.2 × 8² ÷ 2 = 6 × 38.4 = 230.4 Pa',
      '全圧 Pt = 80 + 230.4 + 250 = 560.4 Pa、吐出口風速 10 m/s の動圧 60 Pa を引いて静圧 Ps = 500.4 Pa',
      '余裕率 10 % で設計全圧 616 Pa、設計静圧 550 Pa',
      '軸動力 P = 100 × 616.44 ÷ (60 × 1000 × 0.5) ≒ 2.05 kW、電動機は 15 % 余裕で 2.36 kW 以上（標準出力なら 3.7 kW など）',
    ],
  },
  pitfalls: [
    '静圧と全圧を混同する。カタログが静圧表示なら、全圧から吐出口の動圧を引いた静圧で比べます。',
    '風量を m³/h のまま入れる。この計算は m³/min です（m³/h は 60 で割ります）。',
    '吸込側のダクト・ガラリ・フィルターの抵抗を入れ忘れる。送風機の前後すべての抵抗を合計します。',
    '最遠の経路ではなく平均的な経路で計算する。最も抵抗の大きい経路で静圧を決めないと、遠い吹出口で風量が不足します。',
  ],
};
