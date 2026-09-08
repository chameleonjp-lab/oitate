export {};

interface BootFailureHandler {
  (reason: unknown): void;
}

declare global {
  interface Window {
    __OITATE_BOOT_FALLBACK__?: BootFailureHandler;
  }
}

function isWebGLFailure(reason: unknown): boolean {
  const text = reason instanceof Error
    ? reason.message
    : String(reason ?? "");
  return /webgl|renderer|3d|context/i.test(text);
}

function showFailure(reason: unknown): void {
  const app = document.getElementById("app");
  const boot = document.getElementById("boot-status");
  if (app) {
    app.replaceChildren();
    app.inert = true;
    app.setAttribute("aria-hidden", "true");
  }
  if (!boot) return;

  const webgl = isWebGLFailure(reason);
  boot.hidden = false;
  boot.dataset.bootFailure = webgl ? "webgl" : "general";
  boot.setAttribute("role", "alert");
  boot.innerHTML = `
    <div class="boot-card">
      <p>${webgl ? "3D画面を開始できませんでした。" : "ゲームの読み込みに失敗しました。"}
        <small>${webgl ? "WebGLを利用できない可能性があります。" : "ゲームの初期化に失敗しました。"}</small>
      </p>
      <button type="button" data-boot-retry>もう一度読み込む</button>
    </div>
  `;
  boot.querySelector<HTMLButtonElement>("[data-boot-retry]")?.addEventListener(
    "click",
    () => window.location.reload(),
  );
}

const fallback = window.__OITATE_BOOT_FALLBACK__ ?? showFailure;

async function start(): Promise<void> {
  try {
    // Keep the orientation cancellation listener registered before main binds
    // its own lifecycle and input handlers.
    await import("./portrait-runtime");
    await import("./main");
    const app = document.getElementById("app");
    if (!app || app.dataset.ready !== "true") {
      throw new Error("OITATEの初期化完了を確認できませんでした。");
    }
    app.inert = false;
    app.removeAttribute("aria-hidden");
    app.removeAttribute("aria-busy");
    document.documentElement.dataset.oitateBootReady = "true";
    const boot = document.getElementById("boot-status");
    if (boot) {
      boot.hidden = true;
      boot.dataset.bootState = "ready";
      boot.removeAttribute("role");
    }
  } catch (reason: unknown) {
    fallback(reason);
  }
}

void start();
