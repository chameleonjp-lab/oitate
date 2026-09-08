import { expect, test } from "@playwright/test";

test("reports a readable WebGL failure instead of leaving an unusable page", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, type: string, ...args: any[]) {
      if (type === "webgl" || type === "webgl2") {
        throw new Error("WebGL context disabled for test");
      }
      return Reflect.apply(originalGetContext, this, [type, ...args]) as never;
    } as typeof originalGetContext;
  });

  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveAttribute("data-boot-failure", "webgl", { timeout: 15_000 });
  await expect(page.locator("#boot-status")).toHaveRole("alert");
  await expect(page.locator("#boot-status")).toContainText("3D画面を開始できませんでした");
  await expect(page.getByRole("button", { name: "もう一度読み込む" })).toBeVisible();
  await expect(page.locator("#app")).toBeEmpty();
  await context.close();
});

test("continues with the P7 entry when storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("localStorage disabled for test");
      },
    });
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/?p7=1&p7-e2e=1");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();
  await page.locator("button[data-p7-stage='1']").click();
  await expect(page.locator("#p7-stage-menu-overlay")).toBeHidden();
  await page.evaluate(() => window.__OITATE_P7__.e2e?.runCompletionReplay());
  await expect(page.locator("#p7-result-overlay")).toBeVisible();
  await expect(page.locator("#p7-result-overlay")).toContainText("結果");
});
