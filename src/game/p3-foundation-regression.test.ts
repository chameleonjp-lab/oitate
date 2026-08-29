import { describe, expect, it } from "vitest";

import { createP3Simulation, stepP3Simulation } from "./p3-cowardly-simulation";

describe("P3 gameplay foundation regressions", () => {
  it("keeps captured interpolation history stationary", () => {
    const state = createP3Simulation();
    const animal = state.animals[0];
    if (!animal) throw new Error("missing animal");

    for (const other of state.animals.slice(1)) {
      other.phase = "captured";
      other.fullBodyInside = true;
    }
    animal.phase = "enteringPen";
    animal.x = state.pen.centerX;
    animal.z = state.pen.centerZ;
    animal.previousX = state.pen.centerX + 4;
    animal.previousZ = state.pen.centerZ + 4;
    animal.fullBodyInside = true;
    animal.captureHoldSeconds = 0.34;
    state.penReservedAnimalId = animal.id;

    stepP3Simulation(state, { x: 0, z: 6 }, 0.05);

    expect(animal.phase).toBe("captured");
    expect(animal.previousX).toBe(animal.x);
    expect(animal.previousZ).toBe(animal.z);
  });

  it("lets the final animal claim the gate without re-entering the queue loop", () => {
    const state = createP3Simulation();
    const finalAnimal = state.animals[5];
    if (!finalAnimal) throw new Error("missing final animal");

    for (const animal of state.animals.slice(0, 5)) {
      animal.phase = "captured";
      animal.fullBodyInside = true;
    }
    state.capturedCount = 5;
    const outerFace = state.pen.entranceZ + state.pen.animalRadius;
    finalAnimal.phase = "waitingForEntrance";
    finalAnimal.x = state.pen.centerX;
    finalAnimal.z = outerFace + 0.04;
    finalAnimal.previousX = finalAnimal.x;
    finalAnimal.previousZ = finalAnimal.z;
    finalAnimal.waitingSeconds = 1.9;
    state.penReservedAnimalId = null;

    stepP3Simulation(state, { x: 0, z: 1 }, 0.05);

    expect(state.penReservedAnimalId).toBe(finalAnimal.id);
    expect(finalAnimal.phase).toBe("enteringPen");

    for (let step = 0; step < 30 && !state.completed; step += 1) {
      stepP3Simulation(state, { x: 0, z: 1 }, 0.05);
    }

    expect(finalAnimal.phase).toBe("captured");
    expect(state.capturedCount).toBe(6);
    expect(state.completed).toBe(true);
  });
});
