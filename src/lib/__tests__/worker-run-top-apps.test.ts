import { describe, expect, it } from "vitest";
import {
  getWorkerTopAppButtonClassName,
  getWorkerTopAppIconWrapClassName,
  TERMINAL_TOP_APP_LABEL,
  WORKER_TOP_APP_IDS,
  WORKER_TOP_APPS_ROW_CLASSNAME,
} from "@/lib/worker-run-top-apps";

describe("worker run top apps", () => {
  it("keeps only main action apps in top icon row", () => {
    expect(WORKER_TOP_APP_IDS).toEqual(["agents", "vibing", "enhancements", "terminal-output"]);
  });

  it("renames terminal output top app label to terminal", () => {
    expect(TERMINAL_TOP_APP_LABEL).toBe("Terminal");
  });

  it("centers top app icon row", () => {
    expect(WORKER_TOP_APPS_ROW_CLASSNAME).toContain("justify-center");
  });

  it("uses borderless top app buttons", () => {
    expect(getWorkerTopAppButtonClassName(false, "bg-cyan-500/12")).toContain("border-0");
    expect(getWorkerTopAppButtonClassName(true, "bg-cyan-500/12")).toContain("border-0");
  });

  it("uses filled color class when selected", () => {
    expect(getWorkerTopAppButtonClassName(true, "bg-cyan-500/12")).toContain("bg-cyan-500/12");
  });

  it("fills active app icon background with stronger color", () => {
    expect(getWorkerTopAppIconWrapClassName(true, "bg-cyan-500/12 border-cyan-500/40")).toContain("bg-cyan-500/90");
    expect(getWorkerTopAppIconWrapClassName(true, "bg-fuchsia-500/12 border-fuchsia-500/40")).toContain("bg-fuchsia-500/90");
    expect(getWorkerTopAppIconWrapClassName(true, "bg-violet-500/12 border-violet-500/40")).toContain("bg-violet-500/90");
    expect(getWorkerTopAppIconWrapClassName(true, "bg-sky-500/12 border-sky-500/40")).toContain("bg-sky-500/90");
  });
});
