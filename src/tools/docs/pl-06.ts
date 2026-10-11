import type { BeginnerDoc, ToolDoc, Values } from '../../core/types';
import { type FixtureDef, fixtureSymbols } from './pl-02';

/** 器具の行。器具排水負荷単位は SHASE-S 206 の表から利用者が入力する（ここの値は目安の初期値） */
export const PL06_FIXTURES: FixtureDef[] = [
  { key: 'wc', label: '大便器', n: '4', u: '6', hints: [{ label: '私室用 目安 4', value: 4 }, { label: '公衆用 目安 6', value: 6 }, { label: '公衆用 目安 8', value: 8 }] },
  { key: 'ur', label: '小便器', n: '3', u: '4', hints: [{ label: '目安 4', value: 4 }] },
  { key: 'lav', label: '洗面器', n: '4', u: '1', hints: [{ label: '目安 1', value: 1 }, { label: '目安 2', value: 2 }] },
  { key: 'hw', label: '手洗器', n: '0', u: '0.5', hints: [{ label: '目安 0.5', value: 0.5 }] },
  { key: 'osink', label: '事務室用流し', n: '1', u: '3', hints: [{ label: '目安 3', value: 3 }] },
  { key: 'ssink', label: '掃除流し', n: '1', u: '3', hints: [{ label: '目安 3', value: 3 }] },
  { key: 'bath', label: '浴槽', n: '0', u: '2', hints: [{ label: '住宅用 目安 2', value: 2 }, { label: '公衆用 目安 3', value: 3 }] },
  { key: 'shower', label: 'シャワー', n: '0', u: '2', hints: [{ label: '目安 2', value: 2 }] },
];

export const PART_LABEL: Record<string, string> = {
  branch: '排水横枝管',
  stack: '排水立て管',
  main: '排水横主管',
};

export function pl06Doc(v: Values): ToolDoc {
  const part = PART_LABEL[String(v.part)] ?? '排水管';
  return {
    formulas: [
      { title: '排水負荷単位の合計（SHASE-S 206）', expr: 'ΣDFU = n₁ × u₁ + n₂ × u₂ + …', body: '器具ごとに「個数 × 器具排水負荷単位」を求めて合計します。器具排水負荷単位は、洗面器の排水量などを基準にした重みです。値は SHASE-S 206 の表から入力します。' },
      { title: `負荷の判定（${part}）`, expr: 'ΣDFU ≤ DFUa', body: `選んだ管径の${part}に接続できる許容最大排水負荷単位（SHASE-S 206 の表の値）以下なら OK です。横主管は勾配によって、立て管は階数によって許容値が変わります。` },
      { title: '管径の判定', expr: 'D ≥ Do', body: '排水管は、接続する器具の排水口（トラップ）の口径より細くできません。器具の最大の排水口径以上なら OK です。' },
    ],
    symbols: [
      ...fixtureSymbols(PL06_FIXTURES, '器具排水負荷単位', 'ここでは器具排水負荷単位'),
      { symbol: 'ΣDFU', origin: 'Σ（シグマ：合計）と DFU（drainage fixture unit：器具排水単位）。SHASE-S 206 の用語', meaning: '排水負荷単位の合計', unit: '—' },
      { symbol: 'D', origin: 'Diameter（直径）の頭文字', meaning: '選んだ排水管の呼び径', unit: 'mm' },
      { symbol: 'DFUa', origin: 'DFU に a（allowable：許容）を添えた本サイトの表記', meaning: '選んだ管径の許容最大排水負荷単位（SHASE-S 206 の表の値）', unit: '—' },
      { symbol: 'Do', origin: 'D（Diameter：直径）に o（outlet：排水口）を添えた本サイトの表記', meaning: '接続する器具の最大の排水口径（トラップ口径）', unit: 'mm' },
    ],
  };
}

export const pl06Beginner: BeginnerDoc = {
  purpose: [
    '排水管の太さを決める計算です。つながる器具の数と種類から排水の負荷を「排水負荷単位」で合計し、選んだ管径で流せるかを表の許容値と比べます。',
    '実施設計で、器具から立て管までの横枝管、立て管、建物外へ出す横主管の順に管径を決める段階で使います。',
  ],
  terms: [
    { term: '器具排水負荷単位（DFU）', desc: '器具の排水量・使用頻度を考えた重み。洗面器などを基準にしています。' },
    { term: '排水横枝管', desc: '器具からの排水を集めて立て管へ運ぶ、横向きの管。' },
    { term: '排水立て管', desc: '各階の横枝管からの排水を下へ流す縦の管。' },
    { term: '排水横主管', desc: '立て管の下部から建物外の排水ますへつなぐ横向きの管。勾配で流せる量が変わります。' },
    { term: 'トラップ口径', desc: '器具の排水口に付くトラップの口径。排水管はこれより細くできません。' },
  ],
  example: {
    title: '事務所の便所（大便器 4、小便器 3、洗面器 4、事務室用流し 1、掃除流し 1）を横枝管 100 mm で受ける場合',
    steps: [
      'ΣDFU = 4 × 6 + 3 × 4 + 4 × 1 + 1 × 3 + 1 × 3 = 46（負荷単位は目安値）',
      'SHASE-S 206 の表から、横枝管 100 mm の許容最大排水負荷単位を読み取る（例では 160 と入力）',
      '46 ≤ 160 なので負荷は OK',
      '器具の最大の排水口径 75 mm ≤ 管径 100 mm なので管径も OK',
    ],
  },
  pitfalls: [
    '給水の負荷単位（FU）と排水の負荷単位（DFU）を混同する。値も表も別です。',
    '器具の排水口径より細い管をつなぐ。負荷単位が小さくても、トラップ口径以上の管径が必要です。',
    '立て管を上の階で細くしてしまう。立て管は一般に最下部と同じ管径で通します（SHASE-S 206 で確認）。',
    '横主管の許容値を勾配を確かめずに読む。勾配が緩いほど許容値は小さくなります。',
  ],
};
