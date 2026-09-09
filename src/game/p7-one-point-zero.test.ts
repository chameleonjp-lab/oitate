import { describe, expect, it } from "vitest";

import {
  calculateP7Result,
  createP7Progress,
  getP7LegacyStageRecord,
  getP7Stage,
  isP7Complete,
  isP7StageUnlocked,
  readP7Progress,
  updateP7Progress,
  writeP7Progress,
  type P7Storage,
  type P7StageId,
} from "./p7-one-point-zero";
import { createP6RunMetrics } from "./p6-vertical-slice-completion";
import {
  createP5Simulation,
  stepP5Simulation,
} from "./p5-vertical-slice-simulation";

class MemoryStorage implements P7Storage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function makeCompletedResult(stageId: P7StageId, assistedMode = false) {
  const state = createP5Simulation(getP7Stage(stageId).simulation);
  state.status = "completed";
  state.elapsedSeconds = 240;
  for (const animal of state.animals) {
    animal.lifeState = "captured";
    animal.phase = "captured";
  }
  state.discoveredRoutes.safe = true;
  state.discoveredRoutes.fast = true;
  state.events = getP7Stage(stageId).simulation.requiredEvents.map((type, index) => ({
    id: index + 1,
    type,
    atSeconds: 10 + index,
    subjectId: "fixture",
    reason: "p7-test",
  }));
  return calculateP7Result(stageId, createP6RunMetrics(assistedMode), state);
}

describe("P7 1.0 content progression", () => {
  it("defines six playable stages plus an optional practice stage", () => {
    expect(getP7Stage(0).isPractice).toBe(true);
    expect(getP7Stage(6).center).toBe("3種類を同時に管理する");
    expect(getP7Stage(2).simulation.requiredRoutes).toEqual(["fast"]);
    expect(getP7Stage(4).simulation.requiredEvents).toEqual([
      "animalStartedFollowing",
      "predatorThreatAccepted",
    ]);
  });

  it("derives every P7 simulation from its shared stage data", () => {
    for (const stage of [0, 1, 2, 3, 4, 5, 6] as const) {
      const definition = getP7Stage(stage);
      const state = createP5Simulation(definition.simulation);
      expect(definition.simulation.stageData).toBe(definition.stageData);
      expect(state.stageData.id).toBe(definition.stageData.id);
      expect(state.stageData.rulesetId).toBe(definition.stageData.rulesetId);
      expect(state.animals.map((animal) => animal.id)).toEqual(
        definition.stageData.animalSpawns.map((spawn) => spawn.id),
      );
      expect(state.pens).toEqual(definition.stageData.pens);
      expect(state.terrain).toEqual(definition.stageData.terrain);
    }
  });

  it("does not complete a stage until its required concept was used", () => {
    const stage = getP7Stage(3);
    const state = createP5Simulation(stage.simulation);
    for (const animal of state.animals) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }

    stepP5Simulation(state, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(state.status).toBe("failed");
    expect(state.failureReason).toBe("objectivesIncomplete");
    expect(state.unmetObjectives).toContain("威嚇音で危険種を引きつける");

    const completedState = createP5Simulation(stage.simulation);
    for (const animal of completedState.animals) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    completedState.events.push({
      id: 1,
      type: "predatorThreatAccepted",
      atSeconds: 1,
      subjectId: "predator-1",
      reason: "p7-test",
    });
    stepP5Simulation(completedState, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(completedState.status).toBe("completed");
  });

  it("enforces ordered signals and role-specific route use", () => {
    const stage4 = getP7Stage(4);
    const stage4State = createP5Simulation(stage4.simulation);
    for (const animal of stage4State.animals) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    stage4State.events = [
      {
        id: 1,
        type: "predatorThreatAccepted",
        atSeconds: 1,
        subjectId: "predator-1",
        reason: "test",
      },
      {
        id: 2,
        type: "animalStartedFollowing",
        atSeconds: 2,
        subjectId: "follower-1",
        reason: "test",
      },
    ];
    stepP5Simulation(stage4State, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(stage4State.status).toBe("failed");
    expect(stage4State.failureReason).toBe("objectivesIncomplete");

    const orderedStage4State = createP5Simulation(stage4.simulation);
    for (const animal of orderedStage4State.animals) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    orderedStage4State.events = [
      {
        id: 1,
        type: "animalStartedFollowing",
        atSeconds: 1,
        subjectId: "follower-1",
        reason: "test",
      },
      {
        id: 2,
        type: "predatorThreatAccepted",
        atSeconds: 2,
        subjectId: "predator-1",
        reason: "test",
      },
    ];
    stepP5Simulation(orderedStage4State, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(orderedStage4State.status).toBe("completed");

    const stage5 = getP7Stage(5);
    const stage5State = createP5Simulation(stage5.simulation);
    for (const animal of stage5State.animals) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    stage5State.discoveredRoutes.safe = true;
    stage5State.discoveredRoutes.fast = true;
    stage5State.events = [
      {
        id: 1,
        type: "routeDiscovered",
        atSeconds: 1,
        subjectId: "follower-1",
        reason: "safe",
      },
      {
        id: 2,
        type: "routeDiscovered",
        atSeconds: 2,
        subjectId: "coward-1",
        reason: "fast",
      },
    ];
    stepP5Simulation(stage5State, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(stage5State.status).toBe("failed");
    expect(stage5State.failureReason).toBe("objectivesIncomplete");

    const validStage5State = createP5Simulation(stage5.simulation);
    for (const animal of validStage5State.animals) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    validStage5State.discoveredRoutes.safe = true;
    validStage5State.discoveredRoutes.fast = true;
    validStage5State.events = [
      {
        id: 1,
        type: "routeDiscovered",
        atSeconds: 1,
        subjectId: "coward-1",
        reason: "safe",
      },
      {
        id: 2,
        type: "routeDiscovered",
        atSeconds: 2,
        subjectId: "follower-1",
        reason: "fast",
      },
    ];
    stepP5Simulation(validStage5State, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(validStage5State.status).toBe("completed");
  });

  it("requires all seven stage 4 animals and states the same objective", () => {
    const stage = getP7Stage(4);
    expect(stage.objective).toBe(
      "誘導音の後に威嚇音を使い、保護対象6体を収容し、危険種1体を隔離する",
    );
    const state = createP5Simulation(stage.simulation);
    expect(state.animals).toHaveLength(7);
    expect(state.animals.filter((animal) => animal.type !== "predator")).toHaveLength(6);
    expect(state.animals.filter((animal) => animal.type === "predator")).toHaveLength(1);
    for (const animal of state.animals.filter((candidate) => candidate.type !== "predator")) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    state.events = [
      {
        id: 1,
        type: "animalStartedFollowing",
        atSeconds: 1,
        subjectId: "follower-1",
        reason: "test",
      },
      {
        id: 2,
        type: "predatorThreatAccepted",
        atSeconds: 2,
        subjectId: "predator-1",
        reason: "test",
      },
    ];
    stepP5Simulation(state, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(state.status).toBe("active");

    const completedState = createP5Simulation(stage.simulation);
    for (const animal of completedState.animals.filter((candidate) => candidate.type !== "predator")) {
      animal.lifeState = "captured";
      animal.phase = "captured";
    }
    completedState.events = [
      {
        id: 1,
        type: "animalStartedFollowing",
        atSeconds: 1,
        subjectId: "follower-1",
        reason: "test",
      },
      {
        id: 2,
        type: "predatorThreatAccepted",
        atSeconds: 2,
        subjectId: "predator-1",
        reason: "test",
      },
    ];
    const predator = completedState.animals.find((animal) => animal.type === "predator");
    if (!predator) throw new Error("stage 4 test predator is missing");
    predator.lifeState = "captured";
    predator.phase = "captured";
    stepP5Simulation(completedState, { x: 0, z: 0, speed: 0, isRunning: false }, 0.05);
    expect(completedState.status).toBe("completed");
  });

  it("unlocks the next stage, keeps best records, and gates the fourth animal", () => {
    let progress = createP7Progress();
    expect(progress.rulesetId).toBe("oitate-stage-v2");
    expect(isP7StageUnlocked(progress, 1)).toBe(true);
    for (const stageId of [1, 2, 3, 4, 5, 6] as const) {
      progress = updateP7Progress(progress, makeCompletedResult(stageId));
    }
    expect(isP7Complete(progress)).toBe(true);
    expect(progress.fourthAnimalGate).toBe("eligible");
    expect(progress.unlockedStageIds).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(progress.records[6]?.standard?.bestScore).toBeGreaterThan(0);
  });

  it("survives malformed storage and persists progress without accounts", () => {
    const storage = new MemoryStorage();
    storage.setItem("oitate:p7:progress:v1", "not-json");
    expect(readP7Progress(storage)).toEqual(createP7Progress());

    const progress = updateP7Progress(createP7Progress(), makeCompletedResult(1));
    writeP7Progress(progress, storage);
    const restored = readP7Progress(storage);
    expect(restored.rulesetId).toBe("oitate-stage-v2");
    expect(restored.completedStageIds).toEqual([1]);
    expect(restored.unlockedStageIds).toEqual([0, 1, 2]);
    expect(restored.records[1]?.standard?.mode).toBe("standard");
    expect(restored.records[1]?.standard?.rulesetId).toBe("oitate-stage-v2");
    const written = JSON.parse(storage.getItem("oitate:p7:progress:v1") ?? "null") as Record<string, unknown>;
    expect(written.rulesetId).toBe("oitate-stage-v2");
  });

  it("rejects current fields from missing or mismatched v2 payloads while preserving embedded legacy access", () => {
    const storage = new MemoryStorage();
    const legacy = {
      version: 1,
      completedStageIds: [1],
      unlockedStageIds: [0, 1, 2],
      records: {
        1: { bestScore: 1_234, bestGrade: "B", bestTimeSeconds: 90, attempts: 2 },
      },
      fourthAnimalGate: "locked",
    };
    const currentRecord = {
      stageId: 6,
      rulesetId: "oitate-stage-v2",
      mode: "standard",
      bestScore: 9_999,
      bestGrade: "S",
      bestTimeSeconds: 20,
      attempts: 1,
    };

    for (const rulesetId of [undefined, "oitate-stage-v1"]) {
      const payload: Record<string, unknown> = {
        version: 2,
        completedStageIds: [6],
        unlockedStageIds: [0, 1, 6],
        records: { 6: { standard: currentRecord } },
        fourthAnimalGate: "eligible",
        legacy,
      };
      if (rulesetId !== undefined) payload.rulesetId = rulesetId;
      storage.setItem("oitate:p7:progress:v1", JSON.stringify(payload));

      const restored = readP7Progress(storage);
      expect(restored.rulesetId).toBe("oitate-stage-v2");
      expect(restored.completedStageIds).toEqual([]);
      expect(restored.unlockedStageIds).toEqual([0, 1, 2]);
      expect(restored.records).toEqual({});
      expect(restored.fourthAnimalGate).toBe("locked");
      expect(restored.legacy?.completedStageIds).toEqual([1]);
      expect(getP7LegacyStageRecord(restored, 1, "standard")).toMatchObject({
        bestScore: 1_234,
        rulesetId: "oitate-stage-v1",
      });
    }
  });

  it("keeps version-one clears as read-only legacy records during migration", () => {
    const storage = new MemoryStorage();
    const legacyPayload = {
      version: 1,
      completedStageIds: [1, 2],
      unlockedStageIds: [0, 1, 2],
      records: {
        // Old saves used a stage-level record without stageId or mode.
        1: { bestScore: 4_200, bestGrade: "B", bestTimeSeconds: 180, attempts: 3 },
        2: {
          standard: { stageId: 2, mode: "standard", bestScore: 6_000, bestGrade: "A", bestTimeSeconds: 140, attempts: 1 },
        },
      },
      fourthAnimalGate: "eligible",
    };
    storage.setItem("oitate:p7:progress:v1", JSON.stringify(legacyPayload));

    const restored = readP7Progress(storage);
    expect(restored.version).toBe(2);
    expect(restored.completedStageIds).toEqual([]);
    expect(restored.unlockedStageIds).toEqual([0, 1, 2]);
    expect(restored.fourthAnimalGate).toBe("locked");
    expect(restored.legacy?.completedStageIds).toEqual([1, 2]);
    expect(restored.legacy?.fourthAnimalGate).toBe("eligible");
    expect(getP7LegacyStageRecord(restored, 1, "standard")).toMatchObject({
      bestScore: 4_200,
      mode: "standard",
      rulesetId: "oitate-stage-v1",
    });
    expect(getP7LegacyStageRecord(restored, 2, "standard")?.bestGrade).toBe("A");
    // Reading alone must not overwrite the player's old payload.
    expect(storage.getItem("oitate:p7:progress:v1")).toBe(JSON.stringify(legacyPayload));
  });

  it("keeps practice, standard, and assisted records separate", () => {
    let progress = createP7Progress();
    progress = updateP7Progress(progress, makeCompletedResult(0));
    progress = updateP7Progress(progress, makeCompletedResult(1));
    progress = updateP7Progress(progress, makeCompletedResult(1, true));

    expect(progress.records[0]?.practice?.mode).toBe("practice");
    expect(progress.records[1]?.standard?.mode).toBe("standard");
    expect(progress.records[1]?.assisted?.mode).toBe("assisted");
  });

  it("falls back to the initial progress when an injected storage throws while reading", () => {
    const storage: P7Storage = {
      getItem: () => { throw new Error("storage read failed"); },
      setItem: () => { throw new Error("storage write failed"); },
    };

    expect(readP7Progress(storage)).toEqual(createP7Progress());
    expect(() => writeP7Progress(createP7Progress(), storage)).not.toThrow();
  });
});
