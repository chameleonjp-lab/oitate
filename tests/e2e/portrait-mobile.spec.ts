import { expect, test } from "@playwright/test";

test.describe("iPhone portrait gameplay", () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test("portrait is playable and core controls stay inside the viewport", async ({ page }) => {
    await page.goto("/?p7=1");

    await expect(page.locator("#orientation-overlay")).toBeHidden();
    await expect(page.locator("#p7-stage-menu-overlay")).toBeVisible();

    await page.locator("#p7-player-name").fill("テストプレイヤー");
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

  test("rotation clears held pointers without blocking portrait gameplay", async ({ page }) => {
    await page.setViewportSize({ width: 852, height: 393 });
    await page.goto("/?p1-probe=1");
    await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");

    const moveBox = await page.getByTestId("joystick-zone").boundingBox();
    const cameraBox = await page.getByTestId("camera-zone").boundingBox();
    if (!moveBox || !cameraBox) throw new Error("controls are not measurable");

    await page.getByTestId("joystick-zone").dispatchEvent("pointerdown", {
      pointerId: 301,
      pointerType: "touch",
      button: 0,
      buttons: 1,
      clientX: moveBox.x + 90,
      clientY: moveBox.y + 120,
      bubbles: true,
      cancelable: true,
    });
    await page.getByTestId("camera-zone").dispatchEvent("pointerdown", {
      pointerId: 302,
      pointerType: "touch",
      button: 0,
      buttons: 1,
      clientX: cameraBox.x + cameraBox.width * 0.55,
      clientY: cameraBox.y + 100,
      bubbles: true,
      cancelable: true,
    });

    await expect.poll(async () => page.evaluate(() => window.__OITATE_P1__.getState().owners))
      .toEqual({ movement: 301, camera: 302, guidance: null, threat: null });

    await page.setViewportSize({ width: 393, height: 852 });

    await expect.poll(async () => page.evaluate(() => window.__OITATE_P1__.getState().owners))
      .toEqual({ movement: null, camera: null, guidance: null, threat: null });
    await expect(page.locator("#orientation-overlay")).toBeHidden();

    const afterRotation = await page.evaluate(() => window.__OITATE_P1__.getState());
    if (afterRotation.paused || afterRotation.resumeRequired) {
      // WebKit can emit a lifecycle pause while Playwright emulates a viewport
      // rotation. That safety pause is valid; the important contract is that
      // portrait itself is not blocked and the user can explicitly continue.
      await expect(page.locator("#resume-overlay")).toBeVisible();
      await page.locator("[data-action='resume']").click();
    }

    await expect.poll(async () => page.evaluate(() => {
      const state = window.__OITATE_P1__.getState();
      return { paused: state.paused, resumeRequired: state.resumeRequired };
    })).toEqual({ paused: false, resumeRequired: false });
    await expect(page.locator("#orientation-overlay")).toBeHidden();
  });
});
