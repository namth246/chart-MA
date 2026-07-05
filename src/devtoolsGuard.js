/**
 * @param {boolean} allowDevtools
 */
export function shouldBlockDevtools(allowDevtools) {
  return !allowDevtools;
}

/**
 * @param {{ key?: string, ctrlKey?: boolean, shiftKey?: boolean, metaKey?: boolean }} event
 */
export function isDevtoolsShortcut(event) {
  const key = String(event.key ?? "").toLowerCase();
  const ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);

  if (key === "f12") return true;

  if (ctrlOrMeta && event.shiftKey && ["i", "j", "c", "k"].includes(key)) {
    return true;
  }

  if (ctrlOrMeta && key === "u") return true;

  return false;
}

/**
 * @param {boolean} allowDevtools
 */
export function initDevtoolsGuard(allowDevtools) {
  if (!shouldBlockDevtools(allowDevtools)) return;

  document.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
    },
    { capture: true }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isDevtoolsShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true }
  );
}
