import { expect, test } from "@playwright/test";

test.describe("iPhone portrait gameplay", () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test("portrait is playable and core controls stay inside the viewport", async ({ page }) => {
    await page.goto("/?p7=1");

    await expect(page.locator("#orientation-overlay")).toBeHidden();
    await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();

    await page.locator('button[data-p7-stage="0"]').click();
    await expect(page.locator(".game-canvas")).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    for (const selector of [
      ".joystick-zone",
      ".camera-zone",
      ".p5-signal-button.guidance",
      ".p5-signal-button.threat",
      "button[data-action='pause']",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, `${selector} should have a layout box`).not.toBeNull();
      if (!box || !viewport) continue;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }

    const state = await page.evaluate(() => window.__OITATE_P1__.getState());
    expect(state.paused).toBe(false);
    expect(state.resumeRequired).toBe(false);
  });
});
