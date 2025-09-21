import type { Layouts } from "react-grid-layout";

const KEY = "gv_workstation_layouts_v1";

export function loadLayouts(): Layouts | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Layouts;
  } catch {
    return undefined;
  }
}

export function saveLayouts(layouts: Layouts) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layouts));
  } catch {
    // ignore
  }
}

export function clearLayouts() {
  localStorage.removeItem(KEY);
}
