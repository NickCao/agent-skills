import { describe, expect, test, beforeEach } from "bun:test";
import { WorkflowState } from "./state.ts";
import type { WorkflowConfig } from "./schema.ts";

const WORKFLOW: WorkflowConfig = {
  version: 1,
  metadata: { last_indexed: "2026-04-10" },
  phases: [
    { id: "plan", name: "Planning", conventions: [], gate: [] },
    { id: "implement", name: "Implementation", conventions: [], gate: [] },
    { id: "test", name: "Testing", conventions: [], gate: [] },
  ],
  transitions: [
    { from: "plan", to: "implement" },
    { from: "implement", to: "test" },
  ],
  project_conventions: {},
};

describe("WorkflowState", () => {
  let state: WorkflowState;

  beforeEach(() => {
    state = new WorkflowState(WORKFLOW);
  });

  test("starts at the first phase", () => {
    expect(state.currentPhase().id).toBe("plan");
  });

  test("starts not done", () => {
    expect(state.isDone()).toBe(false);
  });

  test("advance moves to next phase via transition", () => {
    const next = state.advance();
    expect(next).not.toBe("done");
    expect((next as any).id).toBe("implement");
    expect(state.currentPhase().id).toBe("implement");
  });

  test("advance from last phase returns done", () => {
    state.advance(); // plan -> implement
    state.advance(); // implement -> test
    const result = state.advance(); // test -> no transition -> done
    expect(result).toBe("done");
    expect(state.isDone()).toBe(true);
  });

  test("status returns current phase and position", () => {
    const status = state.status();
    expect(status.current).toBe("plan");
    expect(status.position).toBe(1);
    expect(status.total).toBe(3);
    expect(status.completed).toEqual([]);
    expect(status.done).toBe(false);
  });

  test("status tracks completed phases", () => {
    state.advance();
    const status = state.status();
    expect(status.completed).toEqual(["plan"]);
    expect(status.current).toBe("implement");
  });

  test("status shows done when workflow is complete", () => {
    state.advance(); // plan -> implement
    state.advance(); // implement -> test
    state.advance(); // test -> done
    const status = state.status();
    expect(status.current).toBe("done");
    expect(status.done).toBe(true);
    expect(status.completed).toEqual(["plan", "implement", "test"]);
  });
});
