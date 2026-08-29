import { defineConfig, type Plugin } from "vite";

function allowPortraitGameplay(): Plugin {
  return {
    name: "oitate-allow-portrait-gameplay",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/game/input.ts")) return null;
      const from = `export function isPortraitViewport(): boolean {\n  return window.innerHeight > window.innerWidth;\n}`;
      const to = `export function isPortraitViewport(): boolean {\n  // Portrait is a supported play orientation from 1.0 onward.\n  // Keep the historical API stable while disabling the old portrait blocker.\n  return false;\n}`;
      if (!code.includes(from)) return null;
      return { code: code.replace(from, to), map: null };
    },
  };
}

function stabilizeGameplayFoundation(): Plugin {
  return {
    name: "oitate-stabilize-gameplay-foundation",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith("/src/main.ts")) {
        const cameraFrom = `  const cameraFollow = 1 - Math.exp(-Math.min(renderDeltaSeconds, 0.25) * 9);\n  camera.position.lerp(desiredCameraPosition, cameraFollow);\n  camera.lookAt(cameraTarget);`;
        const cameraTo = `  const cameraFollow = 1 - Math.exp(-Math.min(renderDeltaSeconds, 0.25) * 9);\n  // Camera yaw is part of the movement contract. Snap the horizontal orbit to\n  // the requested yaw so the direction visible on screen and the direction\n  // used by held movement cannot disagree after a fast camera turn. Keep the\n  // vertical follow eased so the camera still feels smooth.\n  camera.position.x = desiredCameraPosition.x;\n  camera.position.z = desiredCameraPosition.z;\n  camera.position.y = THREE.MathUtils.lerp(\n    camera.position.y,\n    desiredCameraPosition.y,\n    cameraFollow,\n  );\n  camera.lookAt(cameraTarget);`;
        if (!code.includes(cameraFrom)) {
          throw new Error("rendered camera synchronization patch target is missing");
        }
        return { code: code.replace(cameraFrom, cameraTo), map: null };
      }

      if (id.endsWith("/src/game/p3-cowardly-simulation.ts")) {
        const directionFrom = `  let x = away.x * 0.72 + cohesion.x * 0.25 + towardPen.x * 0.08;\n  let z = away.z * 0.72 + cohesion.z * 0.25 + towardPen.z * 0.08;`;
        const directionTo = `  const remainingCount = state.animals.filter((candidate) => candidate.phase !== "captured").length;\n  const finalAnimal = remainingCount === 1;\n  const awayWeight = finalAnimal ? 0.58 : 0.72;\n  const cohesionWeight = finalAnimal ? 0 : 0.25;\n  const penWeight = finalAnimal ? 0.42 : 0.08;\n  let x = away.x * awayWeight + cohesion.x * cohesionWeight + towardPen.x * penWeight;\n  let z = away.z * awayWeight + cohesion.z * cohesionWeight + towardPen.z * penWeight;`;
        if (!code.includes(directionFrom)) {
          throw new Error("P3 final-animal steering patch target is missing");
        }
        code = code.replace(directionFrom, directionTo);

        const placementFrom = `  animal.z = clamp(state.pen.centerZ, bounds.minZ, bounds.maxZ);\n  animal.fullBodyInside = true;`;
        const placementTo = `  animal.z = clamp(state.pen.centerZ, bounds.minZ, bounds.maxZ);\n  // Captured animals are stationary. Keep interpolation history at the same\n  // position so the renderer cannot repeatedly lerp from an old outside point.\n  animal.previousX = animal.x;\n  animal.previousZ = animal.z;\n  animal.fullBodyInside = true;`;
        if (!code.includes(placementFrom)) {
          throw new Error("P3 captured interpolation patch target is missing");
        }
        code = code.replace(placementFrom, placementTo);

        const reservationFrom = `  state.penReservedAnimalId = owner?.id ?? null;\n\n  for (const animal of animals) {`;
        const reservationTo = `  // With one animal left there is no flock queue to protect. The final animal\n  // must not remain in the queue/back-off loop once it owns or reaches the gate.\n  const remaining = animals.filter((candidate) => candidate.phase !== "captured");\n  const finalAnimal = remaining.length === 1 ? remaining[0] : null;\n  if (!owner\n    && finalAnimal\n    && (finalAnimal.phase === "fleeing" || finalAnimal.phase === "waitingForEntrance")\n    && (isNearEntrance(finalAnimal, state.pen) || isFullBodyInsidePen(finalAnimal, state.pen))) {\n    owner = finalAnimal;\n  }\n  if (owner\n    && finalAnimal\n    && owner.id === finalAnimal.id\n    && (owner.phase === "fleeing" || owner.phase === "waitingForEntrance")\n    && (isNearEntrance(owner, state.pen) || isFullBodyInsidePen(owner, state.pen))) {\n    owner.phase = "enteringPen";\n    owner.phaseSeconds = 0;\n    owner.captureHoldSeconds = 0;\n    owner.waitingSeconds = 0;\n    owner.fleeTriggerBand = null;\n  }\n  state.penReservedAnimalId = owner?.id ?? null;\n\n  for (const animal of animals) {`;
        if (!code.includes(reservationFrom)) {
          throw new Error("P3 final reservation patch target is missing");
        }
        code = code.replace(reservationFrom, reservationTo);
        return { code, map: null };
      }

      return null;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [allowPortraitGameplay(), stabilizeGameplayFoundation()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
