let lastPortrait = window.innerHeight > window.innerWidth;

function clearHeldInputAfterOrientationChange(): void {
  const portrait = window.innerHeight > window.innerWidth;
  if (portrait === lastPortrait) return;
  lastPortrait = portrait;

  // Portrait and landscape are both playable. Rotation must only cancel any
  // fingers that were held during the geometry change so no control remains
  // logically pressed at a stale coordinate.
  window.dispatchEvent(new PointerEvent("pointercancel", {
    bubbles: true,
    cancelable: true,
    pointerId: -1,
    pointerType: "touch",
  }));
}

window.addEventListener("orientationchange", clearHeldInputAfterOrientationChange);
window.addEventListener("resize", clearHeldInputAfterOrientationChange);
