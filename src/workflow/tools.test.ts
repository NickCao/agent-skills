import { describe, expect, test, beforeEach } from "bun:test";
import { createWorkflowTools } from "./tools.ts";
import { WorkflowState } from "./state.ts";
import type { WorkflowConfig } from "./schema.ts";
import type { ToolContext } from "@opencode-ai/plugin";

const WORKFLOW: WorkflowConfig = {
  version: 1,
  metadata: { last_indexed: "2026-04-10" },
  phases: [
    {
      id: "plan",
      name: "Planning",
      conventions: ["Use TODOs"],
      gate: ["Plan exists"],
    },
    {
      id: "implement",
      name: "Implementation",
      conventions: ["Follow patterns"],
      gate: [],
    },
  ],
  transitions: [{ from: "plan", to: "implement" }],
  project_conventions: {},
};

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    sessionID: "test-session",
    messageID: "test-message",
    agent: "workflow-review",
    directory: "/tmp/test",
    worktree: "/tmp/test",
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
    ...overrides,
  };
}

describe("createWorkflowTools", () => {
  let sessions: Map<string, WorkflowState>;

  beforeEach(() => {
    sessions = new Map();
    sessions.set("test-session", new WorkflowState(WORKFLOW));
  });

  describe("workflow_status", () => {
    test("returns current phase info", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions);
      const result = await tools.workflow_status!.execute({}, makeContext());
      const parsed = JSON.parse(result);
      expect(parsed.current).toBe("plan");
      expect(parsed.position).toBe(1);
      expect(parsed.total).toBe(2);
      expect(parsed.conventions).toContain("Use TODOs");
    });

    test("initializes session state on first call", async () => {
      const emptySessions = new Map<string, WorkflowState>();
      const tools = createWorkflowTools(WORKFLOW, emptySessions);
      const result = await tools.workflow_status!.execute({}, makeContext());
      const parsed = JSON.parse(result);
      expect(parsed.current).toBe("plan");
      expect(emptySessions.has("test-session")).toBe(true);
    });
  });

  describe("workflow_advance", () => {
    test("advances to next phase when called by review agent", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions);
      const result = await tools.workflow_advance!.execute(
        { reason: "Plan is documented" },
        makeContext({ agent: "workflow-review" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.advanced_to).toBe("implement");
      expect(parsed.status).toBe("advanced");
    });

    test("throws when called by non-review agent", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions);
      expect(
        tools.workflow_advance!.execute(
          { reason: "skip" },
          makeContext({ agent: "workflow-plan" }),
        ),
      ).rejects.toThrow("workflow-review");
    });

    test("returns done when all phases complete", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions);
      // advance plan -> implement
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      // advance implement -> done
      const result = await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("done");
      expect(parsed.message).toContain("complete");
    });

    test("returns already done if called after completion", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions);
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      // now done, try again
      const result = await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("done");
    });
  });
});
