import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const K = (sym: string, part: string): SymbolDoc => ({
  symbol: sym,
  origin: `熱貫流率の記号 K（建築設備設計基準などで使う慣用。国際的には U）に、部位を表す添字 ${sym.slice(1)} を付けた本サイトの表記`,
  meaning: `${part}の熱貫流率`,
  unit: 'W/(m²·K)',
});
const A = (sym: string, part: string): SymbolDoc => ({
  symbol: sym,
  origin: `A（Area：面積）に部位を表す添字 ${sym.slice(1)} を付けた本サイトの表記`,
  meaning: `${part}の面積`,
  unit: 'm²',
});
const q = (sym: string, meaning: string): SymbolDoc => ({
  symbol: sym,
  origin: `q（熱量・熱流の慣用記号）に部位・種類を表す添字 ${sym.slice(1)} を付けた本サイトの表記`,
  meaning,
  unit: 'W',
});

export function hv02Doc(v: Values): ToolDoc {
  const heat = String(v.mode) === 'heat';
  const formulas: ToolDoc['formulas'] = heat
    ? [
        { title: '室内外温度差・絶対湿度差', expr: 'Δt = ti − to、 Δx = xi − xo', body: '暖房では室内から外へ逃げる熱を負荷とするので、室内 − 外気 で差をとります。' },
        { title: '外壁・屋根・ガラスの貫流熱（建築設備設計基準 暖房負荷）', expr: 'q = K × A × Δt', body: '熱貫流率 K の部位を面積 A、温度差 Δt で通り抜けて逃げる熱です。暖房では日射の効果を見込まず、室内外の温度差だけで計算します。' },
        { title: '内壁・間仕切り', expr: 'qi = Ki × Ai × Δti', body: '非暖房の隣室へ逃げる熱です。Δti は室内と隣室の温度差です。' },
        { title: 'すきま風（顕熱・潜熱）', expr: 'qis = 0.33 × Q × Δt、 qil = 834 × Q × Δx', body: 'すき間から入る冷たく乾いた外気を、室内の温湿度まで暖め・加湿する熱です。0.33 ≒ 1.2 × 1.006 ÷ 3.6、834 ≒ 1.2 × 2501 ÷ 3.6 です（HV-03 参照）。' },
        { title: '合計と顕熱比', expr: 'qS = Σ顕熱、 qL = Σ潜熱、 qT = qS + qL、 SHF = qS ÷ qT', body: '暖房では人体・照明・機器の発熱を見込みません。これらは暖房を助ける側に働くため、見込まない方が安全側になります。' },
        { title: '安全率と床面積当たりの負荷', expr: 'qD = f × qT、 qa = qD ÷ Af', body: '合計に安全率を掛けたものを設計用の負荷とします。床面積当たりの値は、他の室や目安値と比べる確認用です。' },
      ]
    : [
        { title: '室内外温度差・絶対湿度差', expr: 'Δt = to − ti、 Δx = xo − xi', body: '冷房では外から入る熱を負荷とするので、外気 − 室内 で差をとります。' },
        { title: '外壁・屋根（相当温度差による方法、建築設備設計基準 冷房負荷）', expr: 'q = K × A × ETD', body: '外壁・屋根は日射で外表面が熱せられ、壁体の熱容量で熱の伝わりが遅れます。相当温度差 ETD はその影響を含めた温度差で、壁体の種類・方位・時刻ごとに表から引きます。' },
        { title: 'ガラスの貫流熱', expr: 'qgc = Kg × Ag × Δt', body: 'ガラスは熱容量が小さいので、室内外の温度差 Δt をそのまま使います。' },
        { title: 'ガラスの日射熱', expr: 'qgs = Ag × I × SC', body: '窓から入る日射の熱です。I は透明単板ガラスを通して入る標準日射熱取得（方位・時刻ごとの表の値）、SC は遮蔽係数で、ガラスの種類やブラインドで日射がどれだけ減るかを表します。' },
        { title: '内壁・間仕切り', expr: 'qi = Ki × Ai × Δti', body: '非空調の隣室から入る熱です。Δti は隣室と室内の温度差です。' },
        { title: '人体', expr: 'qhs = N × SH、 qhl = N × LH', body: '在室者の体から出る熱です。体温による顕熱と、呼吸・汗の水分による潜熱に分けます。1人当たりの値は室温と作業の強さで変わります。' },
        { title: '照明・機器', expr: 'ql = Wl × rl、 qe = We × re', body: '消費電力はほぼすべて最後は熱になるので、消費電力に使用率（同時に使っている割合）を掛けて発熱量とします。機器は顕熱のみとしています。' },
        { title: 'すきま風（顕熱・潜熱）', expr: 'qis = 0.33 × Q × Δt、 qil = 834 × Q × Δx', body: 'すき間から入る外気を室内の温湿度まで冷やし・除湿する熱です。0.33 ≒ 1.2 × 1.006 ÷ 3.6、834 ≒ 1.2 × 2501 ÷ 3.6 です（HV-03 参照）。' },
        { title: '合計と顕熱比', expr: 'qS = Σ顕熱、 qL = Σ潜熱、 qT = qS + qL、 SHF = qS ÷ qT', body: '顕熱比 SHF は全熱のうち顕熱の割合です。吹出し温度や必要な除湿量の検討、空調機のコイル選定に使います。' },
        { title: '安全率と床面積当たりの負荷', expr: 'qD = f × qT、 qa = qD ÷ Af', body: '合計に安全率を掛けたものを設計用の負荷とします。床面積当たりの値は、他の室や目安値と比べる確認用です。' },
      ];

  const symbols: SymbolDoc[] = [
    { symbol: 'Af', origin: 'A（Area：面積）に f（floor：床）を添えたもの', meaning: '床面積', unit: 'm²' },
    { symbol: 'to', origin: 't（temperature：温度）に o（outdoor：外気）を添えたもの', meaning: '外気の乾球温度', unit: '°C' },
    { symbol: 'ti', origin: 't に i（indoor：室内）を添えたもの', meaning: '室内の乾球温度', unit: '°C' },
    { symbol: 'xo', origin: '絶対湿度の慣用記号 x に o（outdoor）を添えたもの', meaning: '外気の絶対湿度', unit: 'kg/kg(DA)' },
    { symbol: 'xi', origin: 'x に i（indoor）を添えたもの', meaning: '室内の絶対湿度', unit: 'kg/kg(DA)' },
    { symbol: 'Δt', origin: 'Δ（デルタ）は差を表す記号。t は temperature（温度）', meaning: heat ? '室内外温度差（室内 − 外気）' : '室内外温度差（外気 − 室内）', unit: 'K' },
    { symbol: 'Δx', origin: 'Δ は差を表す記号。x は絶対湿度', meaning: heat ? '絶対湿度差（室内 − 外気）' : '絶対湿度差（外気 − 室内）', unit: 'kg/kg(DA)' },
    K('Kw', '外壁（w：wall）'),
    A('Aw', '外壁（w：wall）'),
    K('Kr', '屋根（r：roof）'),
    A('Ar', '屋根（r：roof）'),
    q('qw', '外壁の負荷'),
    q('qr', '屋根の負荷'),
    K('Kg', 'ガラス（g：glass）'),
    A('Ag', 'ガラス（g：glass）'),
    q('qgc', 'ガラスの貫流熱（c：conduction 伝導）'),
    K('Ki', '内壁・間仕切り（i：interior）'),
    A('Ai', '内壁・間仕切り（i：interior）'),
    { symbol: 'Δti', origin: 'Δt に i（interior：内部）を添えた本サイトの表記', meaning: heat ? '室内と隣室の温度差（室内 − 隣室）' : '隣室と室内の温度差（隣室 − 室内）', unit: 'K' },
    q('qi', '内壁・間仕切りの負荷'),
    { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: 'すきま風量', unit: 'm³/h' },
    q('qis', 'すきま風の顕熱負荷（s：sensible 顕熱）'),
    q('qil', 'すきま風の潜熱負荷（l：latent 潜熱）'),
    { symbol: 'qS', origin: 'q に S（sensible：顕熱）を添えたもの', meaning: '顕熱負荷の合計', unit: 'W' },
    { symbol: 'qL', origin: 'q に L（latent：潜熱）を添えたもの', meaning: '潜熱負荷の合計', unit: 'W' },
    { symbol: 'qT', origin: 'q に T（total：合計）を添えたもの', meaning: '全熱負荷の合計（安全率を掛ける前）', unit: 'W' },
    { symbol: 'SHF', origin: 'Sensible Heat Factor（顕熱比）の略。空調分野の慣用記号', meaning: '全熱負荷に対する顕熱負荷の割合', unit: '—' },
    { symbol: 'f', origin: 'factor（係数）の頭文字。本サイトの表記', meaning: '安全率（合計の負荷に掛ける割増し）', unit: '—' },
    { symbol: 'qD', origin: 'q に D（design：設計）を添えた本サイトの表記', meaning: heat ? '設計用の暖房負荷（安全率込み）' : '設計用の冷房負荷（安全率込み）', unit: 'W' },
    { symbol: 'qD′', origin: 'qD にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '設計用の負荷（kW 表示）', unit: 'kW' },
    { symbol: 'qa', origin: 'q に a（area：面積）を添えた本サイトの表記', meaning: '床面積当たりの負荷', unit: 'W/m²' },
  ];
  if (!heat) {
    symbols.push(
      { symbol: 'ETDw', origin: 'Equivalent Temperature Difference（相当温度差）の略に w（wall：外壁）を添えたもの', meaning: '外壁の相当温度差。日射と壁体の熱容量の影響を含めた温度差', unit: 'K' },
      { symbol: 'ETDr', origin: 'ETD（相当温度差）に r（roof：屋根）を添えたもの', meaning: '屋根の相当温度差', unit: 'K' },
      { symbol: 'I', origin: '日射の強さ（Intensity：強さ）を表す慣用記号', meaning: '標準日射熱取得。透明単板ガラスを通して入る日射熱（方位・時刻ごと）', unit: 'W/m²' },
      { symbol: 'SC', origin: 'Shading Coefficient（遮蔽係数）の略', meaning: '透明単板ガラスを 1 としたときの、ガラス・ブラインドなどを通る日射熱の比', unit: '—' },
      q('qgs', 'ガラスの日射熱（s：solar 日射）'),
      { symbol: 'N', origin: 'Number（数）の頭文字', meaning: '在室人数', unit: '人' },
      { symbol: 'SH', origin: 'Sensible Heat（顕熱）の略', meaning: '在室者 1人当たりの顕熱発熱量', unit: 'W/人' },
      { symbol: 'LH', origin: 'Latent Heat（潜熱）の略', meaning: '在室者 1人当たりの潜熱発熱量', unit: 'W/人' },
      q('qhs', '人体の顕熱（h：human 人体、s：sensible）'),
      q('qhl', '人体の潜熱（h：human、l：latent）'),
      { symbol: 'Wl', origin: 'W（Watt：電力）に l（lighting：照明）を添えた本サイトの表記', meaning: '照明の消費電力の合計', unit: 'W' },
      { symbol: 'rl', origin: 'r（rate：割合）に l（lighting）を添えた本サイトの表記', meaning: '照明の使用率（0〜1）', unit: '—' },
      q('ql', '照明の発熱（l：lighting）'),
      { symbol: 'We', origin: 'W（Watt）に e（equipment：機器）を添えた本サイトの表記', meaning: '機器の消費電力の合計', unit: 'W' },
      { symbol: 're', origin: 'r（rate）に e（equipment）を添えた本サイトの表記', meaning: '機器の使用率（0〜1）', unit: '—' },
      q('qe', '機器の発熱（e：equipment）'),
    );
  }
  return { formulas, symbols };
}

export const hv02Beginner: BeginnerDoc = {
  purpose: [
    '室を設定した温度・湿度に保つために、冷房なら取り除く熱、暖房なら補う熱がどれだけ必要かを、熱の出入りの経路（部位）ごとに積み上げて求める計算です。',
    '基本設計では空調方式や機械室の大きさを決める根拠に、実施設計では空調機・室内機の能力を選ぶ根拠になります。外気を取り入れる負荷（HV-03）は別に求めて、空調機の容量に加えます。',
  ],
  terms: [
    { term: '顕熱・潜熱（W）', desc: '顕熱は温度の変化に使われる熱、潜熱は水分の蒸発・凝縮に使われる熱。冷房では潜熱が除湿の負荷になります。' },
    { term: '熱貫流率 K（W/(m²·K)）', desc: '温度差 1 K のとき、壁や窓 1 m² を通る熱量。HV-05 で層構成から求められます。' },
    { term: '相当温度差 ETD（K）', desc: '外壁・屋根に日射が当たる影響と、熱が壁を伝わる時間の遅れを含めた温度差。表から引きます。' },
    { term: '遮蔽係数 SC', desc: '透明単板ガラスを 1 としたとき、ガラスやブラインドを通る日射熱の割合。小さいほど日射を遮ります。' },
    { term: 'SHF（顕熱比）', desc: '全熱のうち顕熱の割合。人の多い室や外気の多い室は潜熱が増えて SHF が小さくなります。' },
  ],
  example: {
    title: '床面積 50 m² の事務室（冷房、外気 34 °C・0.0190、室内 26 °C・0.0105、安全率 1.1）',
    steps: [
      '外壁 1.0 × 30 × 8 = 240 W、屋根 0.5 × 50 × 20 = 500 W',
      'ガラス 貫流 3.0 × 10 × 8 = 240 W、日射 10 × 400 × 0.5 = 2,000 W、内壁 2.0 × 20 × 3 = 120 W',
      '人体 顕熱 10 × 60 = 600 W・潜熱 10 × 60 = 600 W、照明 750 × 1.0 = 750 W、機器 1,000 × 0.6 = 600 W',
      'すきま風 顕熱 0.33 × 30 × 8 ≒ 79 W、潜熱 834 × 30 × 0.0085 ≒ 213 W',
      '顕熱合計 ≒ 5,129 W、潜熱合計 ≒ 813 W、全熱 ≒ 5,942 W、SHF ≒ 0.863',
      '安全率 1.1 を掛けて 冷房負荷 ≒ 6,536 W（6.54 kW）、床面積当たり ≒ 130.7 W/m²',
    ],
  },
  pitfalls: [
    '外壁・屋根に室内外の温度差をそのまま使ってしまう。冷房では日射の影響を含む相当温度差 ETD を使います。',
    '冷房負荷を 1 つの時刻だけで計算する。方位によって負荷が最大になる時刻が違うので、複数の時刻で計算して最大を採ります。',
    '暖房で人体・照明の発熱を差し引いてしまう。夜間や休日明けの立ち上がりにはこれらがないので、暖房では見込みません。',
    '絶対湿度を g/kg のまま入れる。0.0085 kg/kg を 8.5 と入れると潜熱が 1000 倍になります。',
    '換気用の外気負荷を入れ忘れる。この計算は室の負荷で、空調機の容量には外気負荷（HV-03）を加えます。',
  ],
};
