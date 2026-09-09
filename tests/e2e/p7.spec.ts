import { expect, test, type Page } from "@playwright/test";

type P7State = ReturnType<Window["__OITATE_P7__"]["getState"]>;

async function getP7State(page: Page): Promise<P7State> {
  return page.evaluate(() => window.__OITATE_P7__.getState());
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/?p7=1&p7-e2e=1");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
});

test("opens with a saved-progress stage menu and six content stages", async ({ page }) => {
  await expect(page.getByTestId("p7-status")).toBeVisible();
  await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();
  await expect(page.locator("#p7-stage-list [data-p7-stage]")).toHaveCount(7);
  const state = await getP7State(page);
  expect(state.menuVisible).toBe(true);
  expect(state.progress.unlockedStageIds).toEqual([0, 1]);
  await expect(page.locator("#p7-stage-list [data-p7-stage='2']")).toBeDisabled();
});

test("shows the complete stage 4 objective in menu and play status", async ({ page }) => {
  const objective = "誘導音の後に威嚇音を使い、保護対象6体を収容し、危険種1体を隔離する";
  await expect(page.getByText(objective, { exact: true })).toBeVisible();
  await page.evaluate(() => window.__OITATE_P7__.e2e?.openStage(4));
  await expect(page.locator("#p7-stage-menu-overlay")).toBeHidden();
  await expect(page.locator("#p7-stage-objective")).toHaveText(objective);
});

test("starts a selected stage and shows its central concept", async ({ page }) => {
  await page.locator("#p7-stage-list [data-p7-stage='1']").click();
  await expect(page.locator("#p7-stage-menu-overlay")).toBeHidden();
  await expect(page.locator("#p7-stage-center")).toContainText("接近圧力");
  const state = await getP7State(page);
  expect(state.stageId).toBe(1);
  expect(state.status).toBe("active");
});

test("records a completed stage and unlocks the next stage", async ({ page }) => {
  await page.locator("#p7-stage-list [data-p7-stage='1']").click();
  await page.evaluate(() => window.__OITATE_P7__.e2e?.runCompletionReplay());
  await expect(page.locator("#p7-result-overlay")).toBeVisible();
  const state = await getP7State(page);
  expect(state.status).toBe("completed");
  expect(state.result?.stageId).toBe(1);
  expect(state.progress.completedStageIds).toContain(1);
  expect(state.progress.unlockedStageIds).toContain(2);
  await page.locator("[data-action='p7-select-stage']").click();
  await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();
  await expect(page.locator("#p7-stage-list [data-p7-stage='2']")).toBeEnabled();
});

test("shows objective-incomplete results without changing progression or records", async ({ page }) => {
  await page.evaluate(() => window.__OITATE_P7__.e2e?.openStage(2));
  const before = await getP7State(page);
  await page.evaluate(() => window.__OITATE_P7__.e2e?.runObjectiveIncompleteReplay());

  await expect(page.locator("#p7-result-overlay")).toBeVisible();
  await expect(page.locator("#p7-result-title")).toContainText("条件が不足");
  await expect(page.locator("#p7-result-title-text")).toContainText("不足");
  const after = await getP7State(page);
  expect(after.status).toBe("failed");
  expect(after.failureReason).toBe("objectivesIncomplete");
  expect(after.progress.completedStageIds).toEqual(before.progress.completedStageIds);
  expect(after.progress.unlockedStageIds).toEqual(before.progress.unlockedStageIds);
  expect(after.progress.records).toEqual(before.progress.records);
});

test("keeps legacy display and shows it beside a new current record after migration", async ({ page }) => {
  const legacyPayload = {
    version: 1,
    completedStageIds: [1],
    unlockedStageIds: [0, 1, 2],
    records: {
      1: { bestScore: 1_234, bestGrade: "B", bestTimeSeconds: 90, attempts: 2 },
    },
    fourthAnimalGate: "locked",
  };
  await page.evaluate((payload) => {
    window.localStorage.setItem("oitate:p7:progress:v1", JSON.stringify(payload));
  }, legacyPayload);
  await page.reload();
  await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();
  await expect(page.locator("#p7-stage-list [data-p7-stage='1']")).toContainText("旧版クリア");

  await page.locator("#p7-stage-list [data-p7-stage='1']").click();
  await page.evaluate(() => window.__OITATE_P7__.e2e?.runCompletionReplay());
  await expect(page.locator("#p7-result-overlay")).toBeVisible();
  const state = await getP7State(page);
  const currentScore = state.result?.totalScore;
  expect(currentScore).toBeDefined();
  const resultRecordText = page.locator("#p7-result-record");
  await expect(resultRecordText).toContainText("1,234点");
  await expect(resultRecordText).toContainText(`${currentScore?.toLocaleString("ja-JP")}点`);
  await expect(resultRecordText).toContainText("旧版の参考記録");

  await page.locator("[data-action='p7-select-stage']").click();
  await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();
  await expect(page.locator("#p7-stage-record-text")).toContainText("1,234点");
  await expect(page.locator("#p7-stage-record-text")).toContainText(`${currentScore?.toLocaleString("ja-JP")}点`);
});

test("does not expose the P7 E2E hook on a production query", async ({ page }) => {
  await page.goto("/?p7=1");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  expect(await page.evaluate(() => typeof window.__OITATE_P7__.e2e)).toBe("undefined");
});
