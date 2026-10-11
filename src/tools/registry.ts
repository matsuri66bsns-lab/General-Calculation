import type { CategoryId, ToolDef } from '../core/types';
import { ventilation } from './hv-01-ventilation';
import { coolingHeatingLoad } from './hv-02-cooling-heating-load';
import { outdoorAirLoad } from './hv-03-outdoor-air-load';
import { psychrometrics } from './hv-04-psychrometrics';
import { uValueCondensation } from './hv-05-u-value-condensation';
import { heatRemovalVentilation } from './hv-06-heat-removal-ventilation';
import { sickHouseVentilation } from './hv-07-sick-house-ventilation';
import { ductSizing } from './hv-08-duct-sizing';
import { fanStaticPressure } from './hv-09-fan-static-pressure';
import { chilledWaterFlow } from './hv-10-chilled-water-flow';
import { circulationPumpHead } from './hv-11-circulation-pump-head';
import { supplyAirVolume } from './hv-13-supply-air-volume';
import { waterTank } from './pl-01-water-tank';
import { waterSupplyPipe } from './pl-02-water-supply-pipe';
import { hazenWilliams } from './pl-03-hazen-williams';
import { boosterPumpHead } from './pl-04-booster-pump-head';
import { hotWaterSupply } from './pl-05-hot-water-supply';
import { drainagePipe } from './pl-06-drainage-pipe';
import { roofRainwater } from './pl-09-roof-rainwater';
import { septicTankPopulation } from './pl-11-septic-tank-population';
import { toiletFixtureCount } from './pl-12-toilet-fixture-count';
import { voltageDrop } from './el-01-voltage-drop';
import { powerCurrent } from './el-02-power-current';
import { allowableCurrent } from './el-03-allowable-current';
import { mainFeeder } from './el-04-main-feeder';
import { branchCircuit } from './el-05-branch-circuit';
import { shortCircuitCurrent } from './el-06-short-circuit-current';
import { transformerCapacity } from './el-07-transformer-capacity';
import { lumenMethod } from './el-09-lumen-method';
import { emergencyLighting } from './el-10-emergency-lighting';
import { groundingResistance } from './el-11-grounding-resistance';
import { insulationResistance } from './el-12-insulation-resistance';
import { conduitFill } from './el-16-conduit-fill';
import { indoorHydrant } from './fp-01-indoor-hydrant';
import { sprinkler } from './fp-02-sprinkler';
import { extinguisher } from './fp-03-extinguisher';
import { heatSmokeDetector } from './fp-04-heat-smoke-detector';
import { exitSignRange } from './fp-05-exit-sign-range';
import { mechanicalSmokeExhaust } from './fp-06-mechanical-smoke-exhaust';
import { naturalSmokeVent } from './fp-07-natural-smoke-vent';
import { unitConvert } from './cm-01-unit-convert';
import { pipeVelocity } from './cm-02-pipe-velocity';
import { shaftPower } from './cm-03-shaft-power';
import { sensibleHeat } from './cm-04-sensible-heat';
import { seismicAnchor } from './cm-06-seismic-anchor';

/**
 * 公開するツールの一覧。新しいツールはファイルを追加してここに登録する。
 * 並び順は分類（空調・換気→給排水衛生→電気設備→消防・防災→共通）、ID順。
 */
export const TOOLS: ToolDef[] = [
  ventilation,
  coolingHeatingLoad,
  outdoorAirLoad,
  psychrometrics,
  uValueCondensation,
  heatRemovalVentilation,
  sickHouseVentilation,
  ductSizing,
  fanStaticPressure,
  chilledWaterFlow,
  circulationPumpHead,
  supplyAirVolume,
  waterTank,
  waterSupplyPipe,
  hazenWilliams,
  boosterPumpHead,
  hotWaterSupply,
  drainagePipe,
  roofRainwater,
  septicTankPopulation,
  toiletFixtureCount,
  voltageDrop,
  powerCurrent,
  allowableCurrent,
  mainFeeder,
  branchCircuit,
  shortCircuitCurrent,
  transformerCapacity,
  lumenMethod,
  emergencyLighting,
  groundingResistance,
  insulationResistance,
  conduitFill,
  indoorHydrant,
  sprinkler,
  extinguisher,
  heatSmokeDetector,
  exitSignRange,
  mechanicalSmokeExhaust,
  naturalSmokeVent,
  unitConvert,
  pipeVelocity,
  shaftPower,
  sensibleHeat,
  seismicAnchor,
];

export function findTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function findToolById(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function toolsIn(category: CategoryId): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}

/** 検索。ID・名称・概要・キーワードに対して、空白区切りの全語を含むものを返す */
export function searchTools(query: string): ToolDef[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return TOOLS;
  return TOOLS.filter((t) => {
    const hay = [t.id, t.title, t.summary, ...t.keywords].join(' ').toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}
