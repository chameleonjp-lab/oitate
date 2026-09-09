import {
  calculateP6Result,
  type P6Grade,
  type P6RecordMode,
  type P6Result,
  type P6RunMetrics,
  type P6Storage,
} from "./p6-vertical-slice-completion";
import {
  createP5Scenario,
  type P5SimulationScenario,
  type P5SimulationState,
} from "./p5-vertical-slice-simulation";
import {
  createP5StageData,
  P5_STAGE_RULESET_ID,
  type P5StageCompletion,
  type P5StageCounts,
  type P5StageData,
} from "./stage-data";

export type P7StageId = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type P7RecordMode = P6RecordMode | "practice";
export type P7Grade = P6Grade;
export type P7FourthAnimalGate = "locked" | "eligible";

export interface P7StageDefinition {
  id: P7StageId;
  title: string;
  center: string;
  description: string;
  objective: string;
  stageData: P5StageData;
  simulation: P5SimulationScenario;
  isPractice: boolean;
}

export interface P7StageRecord {
  stageId: P7StageId;
  rulesetId: string;
  mode: P7RecordMode;
  bestScore: number;
  bestGrade: Exclude<P7Grade, "未クリア">;
  bestTimeSeconds: number;
  attempts: number;
}

export interface P7Progress {
  version: 2;
  /** Identifies the rules that current progress and records were earned with. */
  rulesetId: typeof P5_STAGE_RULESET_ID;
  completedStageIds: P7StageId[];
  unlockedStageIds: P7StageId[];
  records: Partial<Record<P7StageId, Partial<Record<P7RecordMode, P7StageRecord>>>>;
  fourthAnimalGate: P7FourthAnimalGate;
  legacy: P7LegacyProgress | null;
}

export interface P7LegacyProgress {
  version: 1;
  completedStageIds: P7StageId[];
  unlockedStageIds: P7StageId[];
  records: Partial<Record<P7StageId, Partial<Record<P7RecordMode, P7StageRecord>>>>;
  fourthAnimalGate: P7FourthAnimalGate;
}

export interface P7Result extends P6Result {
  stageId: P7StageId;
}

export interface P7Storage extends P6Storage {}

export const P7_STAGE_IDS: readonly P7StageId[] = [0, 1, 2, 3, 4, 5, 6];

function stage(
  id: P7StageId,
  title: string,
  center: string,
  description: string,
  objective: string,
  counts: P5StageCounts,
  completion: P5StageCompletion,
  isPractice: boolean,
): P7StageDefinition {
  const stageData = createP5StageData(`p7-stage-${id}`, counts, completion);
  return {
    id,
    title,
    center,
    description,
    objective,
    stageData,
    simulation: createP5Scenario(stageData),
    isPractice,
  };
}

export const P7_STAGES: readonly P7StageDefinition[] = [
  stage(0, "練習", "安全に操作を試す", "主人公を動かし、臆病種を囲いへ導く短い練習です。得点は参考表示です。", "臆病種2体を囲いへ収容する", { cowardCount: 2, followerCount: 0, predatorCount: 0 }, { requiredRoutes: [], requiredEvents: [], requiredEventSequence: [], requiredRouteAnimalTypes: {} }, true),
  stage(1, "1　接近圧力", "位置取りで動かす", "近づく距離と歩く速さを変え、臆病種の群れを整えます。", "臆病種6体を広い囲いへ収容する", { cowardCount: 6, followerCount: 0, predatorCount: 0 }, { requiredRoutes: [], requiredEvents: [], requiredEventSequence: [], requiredRouteAnimalTypes: {} }, false),
  stage(2, "2　誘導音と経路", "合図と地形を使う", "誘導音で追従種を動かし、浅い水を避けるか橋を使って進めます。", "誘導音を使い、速い経路を発見して追従種4体を収容する", { cowardCount: 0, followerCount: 4, predatorCount: 0 }, { requiredRoutes: ["fast"], requiredEvents: ["animalStartedFollowing"], requiredEventSequence: [], requiredRouteAnimalTypes: { fast: "follower" } }, false),
  stage(3, "3　危険管理", "危険種を先に隔離する", "狙いの予備動作を見て、威嚇音で危険種を主人公へ引きつけます。", "威嚇音を使い、危険種と保護対象を専用囲いへ収容する", { cowardCount: 1, followerCount: 0, predatorCount: 1 }, { requiredRoutes: [], requiredEvents: ["predatorThreatAccepted"], requiredEventSequence: [], requiredRouteAnimalTypes: {} }, false),
  stage(4, "4　合図の副作用", "合図の順番を選ぶ", "誘導音で追従種を動かした後、威嚇音で危険種を引きつけます。順番を変えると状況も変わります。", "誘導音の後に威嚇音を使い、保護対象6体を収容し、危険種1体を隔離する", { cowardCount: 3, followerCount: 3, predatorCount: 1 }, { requiredRoutes: [], requiredEvents: ["animalStartedFollowing", "predatorThreatAccepted"], requiredEventSequence: ["animalStartedFollowing", "predatorThreatAccepted"], requiredRouteAnimalTypes: {} }, false),
  stage(5, "5　群れの分裂", "狭い経路を順番に使う", "臆病種は安全経路、追従種は速い経路を使います。群れを一度に押し込まず、順番を選びます。", "安全経路を臆病種、速い経路を追従種が通り、10体を収容する", { cowardCount: 6, followerCount: 4, predatorCount: 0 }, { requiredRoutes: ["safe", "fast"], requiredEvents: [], requiredEventSequence: [], requiredRouteAnimalTypes: { safe: "coward", fast: "follower" } }, false),
  stage(6, "6　総合", "3種類を同時に管理する", "これまでの3種類、地形、2つの経路、2種類の合図を組み合わせます。", "安全経路を臆病種、速い経路を追従種が通り、2種類の合図を使って11体を収容する", { cowardCount: 6, followerCount: 4, predatorCount: 1 }, { requiredRoutes: ["safe", "fast"], requiredEvents: ["animalStartedFollowing", "predatorThreatAccepted"], requiredEventSequence: [], requiredRouteAnimalTypes: { safe: "coward", fast: "follower" } }, false),
];

// Keep the storage key stable for existing players; the payload version and
// ruleset id separate current records from the old P7 implementation.
const PROGRESS_KEY = "oitate:p7:progress:v1";
const CURRENT_PROGRESS_VERSION = 2;
const LEGACY_RULESET_ID = "oitate-stage-v1";

function resolveStorage(storage?: P7Storage): P7Storage | null {
  if (storage) return storage;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

function isStageId(value: unknown): value is P7StageId {
  return value === 0 || value === 1 || value === 2 || value === 3
    || value === 4 || value === 5 || value === 6;
}

function uniqueStageIds(value: unknown, fallback: P7StageId[]): P7StageId[] {
  if (!Array.isArray(value)) return [...fallback];
  return [...new Set(value.filter(isStageId))].sort((first, second) => first - second);
}

function isGrade(value: unknown): value is Exclude<P7Grade, "未クリア"> {
  return value === "S" || value === "A" || value === "B" || value === "C";
}

function isRecordMode(value: unknown): value is P7RecordMode {
  return value === "standard" || value === "assisted" || value === "practice";
}

function parseRecord(
  value: unknown,
  expectedMode: P7RecordMode | undefined,
  expectedStageId: P7StageId | undefined,
  rulesetId: string,
  allowMissingStageId: boolean,
): P7StageRecord | null {
  const object = asObject(value);
  const mode = expectedMode
    ?? (isRecordMode(object?.mode)
      ? object.mode
      : allowMissingStageId && expectedStageId !== undefined
        ? expectedStageId === 0 ? "practice" : "standard"
        : object?.mode);
  const stageId = object && isStageId(object.stageId) ? object.stageId : expectedStageId;
  if (!object || stageId === undefined || (!allowMissingStageId && !isStageId(object.stageId))
    || (expectedStageId !== undefined && stageId !== expectedStageId)
    || (!allowMissingStageId && object.rulesetId !== rulesetId)
    || !isRecordMode(mode)
    || typeof object.bestScore !== "number" || !Number.isFinite(object.bestScore)
    || !isGrade(object.bestGrade)
    || typeof object.bestTimeSeconds !== "number" || !Number.isFinite(object.bestTimeSeconds)
    || typeof object.attempts !== "number" || !Number.isFinite(object.attempts)) {
    return null;
  }
  return {
    stageId,
    rulesetId,
    mode,
    bestScore: Math.max(0, Math.min(100_000, Math.round(object.bestScore))),
    bestGrade: object.bestGrade,
    bestTimeSeconds: Math.max(0, object.bestTimeSeconds),
    attempts: Math.max(0, Math.floor(object.attempts)),
  };
}

export function createP7Progress(): P7Progress {
  return {
    version: CURRENT_PROGRESS_VERSION,
    rulesetId: P5_STAGE_RULESET_ID,
    completedStageIds: [],
    unlockedStageIds: [0, 1],
    records: {},
    fourthAnimalGate: "locked",
    legacy: null,
  };
}

function normalizeUnlockedStageIds(value: unknown, fallback: P7StageId[]): P7StageId[] {
  const unlocked = uniqueStageIds(value, fallback);
  if (!unlocked.includes(0)) unlocked.unshift(0);
  if (!unlocked.includes(1)) unlocked.push(1);
  return unlocked.sort((first, second) => first - second);
}

function emptyLegacyProgress(): P7LegacyProgress {
  return {
    version: 1,
    completedStageIds: [],
    unlockedStageIds: [0, 1],
    records: {},
    fourthAnimalGate: "locked",
  };
}

function parseRecordSet(
  value: unknown,
  expectedStageId: P7StageId,
  rulesetId: string,
  legacy: boolean,
): Partial<Record<P7RecordMode, P7StageRecord>> {
  const parsedSet: Partial<Record<P7RecordMode, P7StageRecord>> = {};
  const directRecord = parseRecord(
    value,
    undefined,
    expectedStageId,
    rulesetId,
    legacy,
  );
  if (directRecord) {
    parsedSet[directRecord.mode] = directRecord;
    return parsedSet;
  }
  const recordSet = asObject(value);
  if (!recordSet) return parsedSet;
  for (const mode of ["standard", "assisted", "practice"] as const) {
    const record = parseRecord(
      recordSet[mode],
      mode,
      expectedStageId,
      rulesetId,
      legacy,
    );
    if (record) parsedSet[mode] = record;
  }
  return parsedSet;
}

function parseRecords(
  value: unknown,
  rulesetId: string,
  legacy: boolean,
): Partial<Record<P7StageId, Partial<Record<P7RecordMode, P7StageRecord>>>> {
  const records: Partial<Record<P7StageId, Partial<Record<P7RecordMode, P7StageRecord>>>> = {};
  const source = asObject(value);
  if (!source) return records;
  for (const [key, recordValue] of Object.entries(source)) {
    const stageId = Number(key);
    if (!isStageId(stageId)) continue;
    const parsedSet = parseRecordSet(recordValue, stageId, rulesetId, legacy);
    if (Object.keys(parsedSet).length > 0) records[stageId] = parsedSet;
  }
  return records;
}

function parseLegacyProgress(parsed: Record<string, unknown>): P7LegacyProgress {
  const legacy = emptyLegacyProgress();
  legacy.completedStageIds = uniqueStageIds(parsed.completedStageIds, []);
  legacy.unlockedStageIds = normalizeUnlockedStageIds(parsed.unlockedStageIds, [0, 1]);
  legacy.records = parseRecords(parsed.records, LEGACY_RULESET_ID, true);
  legacy.fourthAnimalGate = parsed.fourthAnimalGate === "eligible" ? "eligible" : "locked";
  return legacy;
}

function readCurrentProgress(parsed: Record<string, unknown>): P7Progress {
  const progress = createP7Progress();
  const legacyObject = asObject(parsed.legacy);
  if (legacyObject && legacyObject.version === 1) {
    progress.legacy = parseLegacyProgress(legacyObject);
  }

  // Version 2 payloads are current only when the top-level ruleset matches.
  // Keep an embedded legacy payload available even when a stale or malformed
  // v2 payload is encountered, but never let its current fields leak into the
  // current progression namespace.
  if (parsed.rulesetId !== P5_STAGE_RULESET_ID) {
    if (progress.legacy) {
      progress.unlockedStageIds = normalizeUnlockedStageIds(
        progress.legacy.unlockedStageIds,
        [0, 1],
      );
    }
    return progress;
  }

  progress.completedStageIds = uniqueStageIds(parsed.completedStageIds, []);
  progress.unlockedStageIds = normalizeUnlockedStageIds(parsed.unlockedStageIds, [0, 1]);
  progress.records = parseRecords(parsed.records, P5_STAGE_RULESET_ID, false);
  progress.fourthAnimalGate = parsed.fourthAnimalGate === "eligible" ? "eligible" : "locked";
  if (progress.legacy) {
    progress.unlockedStageIds = normalizeUnlockedStageIds([
      ...progress.unlockedStageIds,
      ...progress.legacy.unlockedStageIds,
    ], [0, 1]);
  }
  return progress;
}

export function readP7Progress(storage?: P7Storage): P7Progress {
  const source = resolveStorage(storage);
  try {
    const raw = source?.getItem(PROGRESS_KEY);
    if (!raw) return createP7Progress();
    const parsed = asObject(JSON.parse(raw));
    if (!parsed) return createP7Progress();
    if (parsed.version === CURRENT_PROGRESS_VERSION) return readCurrentProgress(parsed);
    if (parsed.version === 1) {
      const progress = createP7Progress();
      progress.legacy = parseLegacyProgress(parsed);
      // Old clears keep their access, but never count as current-rule clears.
      progress.unlockedStageIds = normalizeUnlockedStageIds(
        progress.legacy.unlockedStageIds,
        [0, 1],
      );
      return progress;
    }
    return createP7Progress();
  } catch {
    return createP7Progress();
  }
}

export function writeP7Progress(progress: P7Progress, storage?: P7Storage): void {
  const source = resolveStorage(storage);
  try {
    source?.setItem(PROGRESS_KEY, JSON.stringify({
      ...progress,
      version: CURRENT_PROGRESS_VERSION,
      rulesetId: P5_STAGE_RULESET_ID,
    }));
  } catch {
    // A full or private storage area must not stop a play session.
  }
}

export function getP7Stage(stageId: P7StageId): P7StageDefinition {
  const stage = P7_STAGES.find((candidate) => candidate.id === stageId);
  if (!stage) throw new Error(`P7の面が見つかりません: ${stageId}`);
  return stage;
}

export function isP7StageUnlocked(progress: P7Progress, stageId: P7StageId): boolean {
  return progress.unlockedStageIds.includes(stageId);
}

export function isP7Complete(progress: P7Progress): boolean {
  return P7_STAGE_IDS.filter((stageId) => stageId > 0)
    .every((stageId) => progress.completedStageIds.includes(stageId));
}

export function calculateP7Result(
  stageId: P7StageId,
  metrics: P6RunMetrics,
  state: P5SimulationState,
): P7Result {
  return {
    ...calculateP6Result(metrics, state),
    stageId,
  };
}

function isBetterRecord(result: P7Result, record: P7StageRecord | undefined): boolean {
  if (!record) return true;
  return result.totalScore > record.bestScore
    || (result.totalScore === record.bestScore && result.elapsedSeconds < record.bestTimeSeconds);
}

export function updateP7Progress(progress: P7Progress, result: P7Result): P7Progress {
  if (!result.completed) return progress;
  const completedStageIds = progress.completedStageIds.includes(result.stageId)
    ? [...progress.completedStageIds]
    : [...progress.completedStageIds, result.stageId].sort((first, second) => first - second);
  const unlockedStageIds = [...progress.unlockedStageIds];
  const nextStage = result.stageId + 1;
  if (nextStage <= 6 && !unlockedStageIds.includes(nextStage as P7StageId)) {
    unlockedStageIds.push(nextStage as P7StageId);
    unlockedStageIds.sort((first, second) => first - second);
  }
  const mode: P7RecordMode = result.stageId === 0
    ? "practice"
    : result.assistedMode ? "assisted" : "standard";
  const previousRecords = progress.records[result.stageId] ?? {};
  const previous = previousRecords[mode];
  const better = isBetterRecord(result, previous);
  const record: P7StageRecord = {
    stageId: result.stageId,
    rulesetId: P5_STAGE_RULESET_ID,
    mode,
    bestScore: better ? result.totalScore : previous?.bestScore ?? result.totalScore,
    bestGrade: better ? result.grade as Exclude<P7Grade, "未クリア"> : previous?.bestGrade ?? "C",
    bestTimeSeconds: better
      ? result.elapsedSeconds
      : previous?.bestTimeSeconds ?? result.elapsedSeconds,
    attempts: (previous?.attempts ?? 0) + 1,
  };
  return {
    ...progress,
    version: CURRENT_PROGRESS_VERSION,
    rulesetId: P5_STAGE_RULESET_ID,
    completedStageIds,
    unlockedStageIds,
    records: {
      ...progress.records,
      [result.stageId]: { ...previousRecords, [mode]: record },
    },
    fourthAnimalGate: isP7Complete({ ...progress, completedStageIds }) ? "eligible" : progress.fourthAnimalGate,
  };
}

export function getP7StageRecord(
  progress: P7Progress,
  stageId: P7StageId,
  mode: P7RecordMode,
): P7StageRecord | null {
  return progress.records[stageId]?.[mode] ?? null;
}

export function getP7LegacyStageRecord(
  progress: P7Progress,
  stageId: P7StageId,
  mode: P7RecordMode,
): P7StageRecord | null {
  return progress.legacy?.records[stageId]?.[mode] ?? null;
}
