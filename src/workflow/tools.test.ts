import { describe, expect, test, beforeEach } from "bun:test";
import { createWorkflowTools, type SessionResolver } from "./tools.ts";
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

/** Identity resolver -- no parent chain, returns sessionID as-is */
const identityResolver: SessionResolver = async (id) => id;

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
      const tools = createWorkflowTools(WORKFLOW, sessions, identityResolver);
      const result = await tools.workflow_status!.execute({}, makeContext());
      const parsed = JSON.parse(result);
      expect(parsed.current).toBe("plan");
      expect(parsed.position).toBe(1);
      expect(parsed.total).toBe(2);
      expect(parsed.conventions).toContain("Use TODOs");
    });

    test("initializes session state on first call", async () => {
      const emptySessions = new Map<string, WorkflowState>();
      const tools = createWorkflowTools(
        WORKFLOW,
        emptySessions,
        identityResolver,
      );
      const result = await tools.workflow_status!.execute({}, makeContext());
      const parsed = JSON.parse(result);
      expect(parsed.current).toBe("plan");
      expect(emptySessions.has("test-session")).toBe(true);
    });
  });

  describe("workflow_advance", () => {
    test("advances to next phase when called by review agent", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions, identityResolver);
      const result = await tools.workflow_advance!.execute(
        { reason: "Plan is documented" },
        makeContext({ agent: "workflow-review" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.advanced_to).toBe("implement");
      expect(parsed.status).toBe("advanced");
    });

    test("throws when called by non-review agent", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions, identityResolver);
      expect(
        tools.workflow_advance!.execute(
          { reason: "skip" },
          makeContext({ agent: "workflow-plan" }),
        ),
      ).rejects.toThrow("workflow-review");
    });

    test("returns done when all phases complete", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions, identityResolver);
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      const result = await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("done");
      expect(parsed.message).toContain("complete");
    });

    test("returns already done if called after completion", async () => {
      const tools = createWorkflowTools(WORKFLOW, sessions, identityResolver);
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      const result = await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({ agent: "workflow-review" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("done");
    });
  });

  describe("session resolver", () => {
    test("subagent session resolves to parent state", async () => {
      // Resolver that maps child -> parent
      const resolver: SessionResolver = async (id) =>
        id === "child-session" ? "test-session" : id;

      const tools = createWorkflowTools(WORKFLOW, sessions, resolver);

      // Advance from the child session (subagent)
      await tools.workflow_advance!.execute(
        { reason: "done" },
        makeContext({
          sessionID: "child-session",
          agent: "workflow-review",
        }),
      );

      // Check status from the parent session -- should see the advance
      const result = await tools.workflow_status!.execute(
        {},
        makeContext({ sessionID: "test-session" }),
      );
      const parsed = JSON.parse(result);
      expect(parsed.current).toBe("implement");
      expect(parsed.completed).toEqual(["plan"]);
    });
  });
});
