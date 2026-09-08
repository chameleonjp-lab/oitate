/**
 * Shared stage geometry and completion data.
 *
 * P5, P6, and P7 deliberately consume the same immutable description of a
 * playfield.  The simulation clones it at run start so a test fixture or a
 * completed animal can never mutate the next stage.
 */

export type P5AnimalType = "coward" | "follower" | "predator";
export type P5Route = "safe" | "fast";

export type P5EventType =
  | "routeDiscovered"
  | "animalStartedFollowing"
  | "animalEnteredPen"
  | "animalCaptured"
  | "predatorTargeted"
  | "predatorAimStarted"
  | "predatorLungeStarted"
  | "victimRescuePending"
  | "rescueSucceeded"
  | "rescueFailed"
  | "predatorThreatAccepted"
  | "predatorThreatRejected"
  | "predatorEnteredPen"
  | "predatorCaptured";

export interface P5Pen {
  readonly type: P5AnimalType;
  readonly centerX: number;
  readonly centerZ: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly entranceZ: number;
  readonly entranceHalfWidth: number;
  readonly animalRadius: number;
}

export interface P5Terrain {
  readonly water: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
  readonly bridge: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
  readonly safeMarker: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
  readonly fastMarker: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
}

export interface P5WorldBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface P5StagePoint {
  readonly x: number;
  readonly z: number;
}

export interface P5AnimalSpawn extends P5StagePoint {
  readonly id: string;
  readonly type: P5AnimalType;
}

export interface P5StageCompletion {
  readonly requiredRoutes: readonly P5Route[];
  readonly requiredEvents: readonly P5EventType[];
  readonly requiredEventSequence: readonly P5EventType[];
  readonly requiredRouteAnimalTypes: Readonly<Partial<Record<P5Route, P5AnimalType>>>;
}

export interface P5StageData {
  readonly id: string;
  /** A ruleset change invalidates current records without deleting legacy data. */
  readonly rulesetId: string;
  readonly worldBounds: P5WorldBounds;
  readonly playerSpawn: P5StagePoint;
  readonly animalSpawns: readonly P5AnimalSpawn[];
  readonly pens: Readonly<Record<P5AnimalType, P5Pen>>;
  readonly terrain: P5Terrain;
  readonly completion: P5StageCompletion;
}

export const P5_STAGE_RULESET_ID = "oitate-stage-v2";

const DEFAULT_COWARD_SPAWNS: readonly P5StagePoint[] = [
  { x: -5.8, z: 5.7 },
  { x: -4.2, z: 6.4 },
  { x: -2.6, z: 5.5 },
  { x: -1.0, z: 6.4 },
  { x: 0.6, z: 5.6 },
  { x: 2.2, z: 6.3 },
];

const DEFAULT_FOLLOWER_SPAWNS: readonly P5StagePoint[] = [
  { x: 5.2, z: 5.6 },
  { x: 6.8, z: 6.3 },
  { x: 8.4, z: 5.5 },
  { x: 10, z: 6.2 },
];

const DEFAULT_PREDATOR_SPAWN: P5StagePoint = { x: 3.6, z: 0.8 };

const DEFAULT_WORLD_BOUNDS: P5WorldBounds = {
  minX: -16.5,
  maxX: 16.5,
  minZ: -16.5,
  maxZ: 16.5,
};

const DEFAULT_PLAYER_SPAWN: P5StagePoint = { x: 0, z: 7.5 };

const DEFAULT_TERRAIN: P5Terrain = {
  water: { minX: -2.8, maxX: 2.8, minZ: -3.8, maxZ: 2.2 },
  bridge: { minX: -0.72, maxX: 0.72, minZ: -3.8, maxZ: 2.2 },
  safeMarker: { minX: -6.6, maxX: -4.2, minZ: -3.8, maxZ: 2.4 },
  fastMarker: { minX: -0.95, maxX: 0.95, minZ: -3.8, maxZ: 2.4 },
};

const DEFAULT_PENS: Record<P5AnimalType, P5Pen> = {
  coward: {
    type: "coward",
    centerX: -8.2,
    centerZ: -10.2,
    halfWidth: 3.3,
    halfDepth: 2.1,
    entranceZ: -8.1,
    entranceHalfWidth: 1.8,
    animalRadius: 0.52,
  },
  follower: {
    type: "follower",
    centerX: 8.2,
    centerZ: -10.2,
    halfWidth: 3.3,
    halfDepth: 2.1,
    entranceZ: -8.1,
    entranceHalfWidth: 1.8,
    animalRadius: 0.52,
  },
  predator: {
    type: "predator",
    centerX: 0,
    centerZ: -10.8,
    halfWidth: 2.1,
    halfDepth: 1.7,
    entranceZ: -9.1,
    entranceHalfWidth: 1.05,
    animalRadius: 0.55,
  },
};

const EMPTY_COMPLETION: P5StageCompletion = {
  requiredRoutes: [],
  requiredEvents: [],
  requiredEventSequence: [],
  requiredRouteAnimalTypes: {},
};

function clonePoint(point: P5StagePoint): P5StagePoint {
  return { x: point.x, z: point.z };
}

function cloneTerrain(terrain: P5Terrain): P5Terrain {
  return {
    water: { ...terrain.water },
    bridge: { ...terrain.bridge },
    safeMarker: { ...terrain.safeMarker },
    fastMarker: { ...terrain.fastMarker },
  };
}

function clonePens(pens: Readonly<Record<P5AnimalType, P5Pen>>): Record<P5AnimalType, P5Pen> {
  return {
    coward: { ...pens.coward },
    follower: { ...pens.follower },
    predator: { ...pens.predator },
  };
}

function cloneCompletion(completion: P5StageCompletion): P5StageCompletion {
  return {
    requiredRoutes: [...completion.requiredRoutes],
    requiredEvents: [...completion.requiredEvents],
    requiredEventSequence: [...completion.requiredEventSequence],
    requiredRouteAnimalTypes: { ...completion.requiredRouteAnimalTypes },
  };
}

function freezeCompletion(completion: P5StageCompletion): P5StageCompletion {
  Object.freeze(completion.requiredRoutes);
  Object.freeze(completion.requiredEvents);
  Object.freeze(completion.requiredEventSequence);
  Object.freeze(completion.requiredRouteAnimalTypes);
  return Object.freeze(completion);
}

function freezeTerrain(terrain: P5Terrain): P5Terrain {
  Object.freeze(terrain.water);
  Object.freeze(terrain.bridge);
  Object.freeze(terrain.safeMarker);
  Object.freeze(terrain.fastMarker);
  return Object.freeze(terrain);
}

function freezeStageData(stageData: P5StageData): P5StageData {
  Object.freeze(stageData.worldBounds);
  Object.freeze(stageData.playerSpawn);
  for (const spawn of stageData.animalSpawns) Object.freeze(spawn);
  Object.freeze(stageData.animalSpawns);
  for (const pen of Object.values(stageData.pens)) Object.freeze(pen);
  Object.freeze(stageData.pens);
  freezeTerrain(stageData.terrain);
  freezeCompletion(stageData.completion);
  return Object.freeze(stageData);
}

function spawnAnimals(
  type: P5AnimalType,
  count: number,
  positions: readonly P5StagePoint[],
): P5AnimalSpawn[] {
  const safeCount = Math.max(0, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => {
    const position = positions[index] ?? {
      x: (index % 6) * 1.4 - 3.5,
      z: 6 + Math.floor(index / 6) * 1.4,
    };
    return {
      id: `${type}-${index + 1}`,
      type,
      x: position.x,
      z: position.z,
    };
  });
}

function countAnimals(
  animalSpawns: readonly P5AnimalSpawn[],
  type: P5AnimalType,
): number {
  return animalSpawns.filter((spawn) => spawn.type === type).length;
}

/** The current P5/P6 board. P7 stage data is derived from this same board. */
export const P5_DEFAULT_STAGE_DATA: P5StageData = freezeStageData({
  id: "p5-default",
  rulesetId: P5_STAGE_RULESET_ID,
  worldBounds: { ...DEFAULT_WORLD_BOUNDS },
  playerSpawn: { ...DEFAULT_PLAYER_SPAWN },
  animalSpawns: [
    ...spawnAnimals("coward", DEFAULT_COWARD_SPAWNS.length, DEFAULT_COWARD_SPAWNS),
    ...spawnAnimals("follower", DEFAULT_FOLLOWER_SPAWNS.length, DEFAULT_FOLLOWER_SPAWNS),
    { id: "predator-1", type: "predator", ...DEFAULT_PREDATOR_SPAWN },
  ],
  pens: clonePens(DEFAULT_PENS),
  terrain: cloneTerrain(DEFAULT_TERRAIN),
  completion: cloneCompletion(EMPTY_COMPLETION),
});

export interface P5StageCounts {
  readonly cowardCount: number;
  readonly followerCount: number;
  readonly predatorCount: number;
}

/**
 * Builds a stage using the current board geometry while changing only the
 * explicitly requested population and completion contract. This keeps legacy
 * P5/P6 callers compatible while making P7's source of truth one object.
 */
export function createP5StageData(
  id: string,
  counts: P5StageCounts,
  completion: P5StageCompletion = EMPTY_COMPLETION,
): P5StageData {
  const animalSpawns = [
    ...spawnAnimals("coward", counts.cowardCount, DEFAULT_COWARD_SPAWNS),
    ...spawnAnimals("follower", counts.followerCount, DEFAULT_FOLLOWER_SPAWNS),
    ...(Math.max(0, Math.floor(counts.predatorCount)) > 0
      ? [{ id: "predator-1", type: "predator" as const, ...DEFAULT_PREDATOR_SPAWN }]
      : []),
  ];
  return freezeStageData({
    id,
    rulesetId: P5_STAGE_RULESET_ID,
    worldBounds: { ...DEFAULT_WORLD_BOUNDS },
    playerSpawn: { ...DEFAULT_PLAYER_SPAWN },
    animalSpawns,
    pens: clonePens(DEFAULT_PENS),
    terrain: cloneTerrain(DEFAULT_TERRAIN),
    completion: cloneCompletion(completion),
  });
}

export function cloneP5StageData(stageData: P5StageData): P5StageData {
  return freezeStageData({
    id: stageData.id,
    rulesetId: stageData.rulesetId,
    worldBounds: { ...stageData.worldBounds },
    playerSpawn: clonePoint(stageData.playerSpawn),
    animalSpawns: stageData.animalSpawns.map((spawn) => ({ ...spawn })),
    pens: clonePens(stageData.pens),
    terrain: cloneTerrain(stageData.terrain),
    completion: cloneCompletion(stageData.completion),
  });
}

export function getP5StageCounts(stageData: P5StageData): P5StageCounts {
  return {
    cowardCount: countAnimals(stageData.animalSpawns, "coward"),
    followerCount: countAnimals(stageData.animalSpawns, "follower"),
    predatorCount: countAnimals(stageData.animalSpawns, "predator"),
  };
}
