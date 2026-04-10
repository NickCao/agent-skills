import { describe, expect, test } from "bun:test";
import { generateAgents } from "./agents.ts";
import type { WorkflowConfig } from "./schema.ts";

const WORKFLOW: WorkflowConfig = {
  version: 1,
  metadata: { last_indexed: "2026-04-10" },
  phases: [
    {
      id: "plan",
      name: "Planning",
      description: "Define requirements",
      conventions: ["Use TODO lists"],
      gate: ["Plan documented"],
    },
    {
      id: "implement",
      name: "Implementation",
      description: "Write code",
      conventions: ["Follow patterns"],
      gate: [],
    },
  ],
  transitions: [{ from: "plan", to: "implement" }],
  project_conventions: {},
};

describe("generateAgents", () => {
  const agents = generateAgents(WORKFLOW);

  test("creates one agent per phase plus one review agent", () => {
    const names = Object.keys(agents);
    expect(names).toContain("workflow-plan");
    expect(names).toContain("workflow-implement");
    expect(names).toContain("workflow-review");
    expect(names).toHaveLength(3);
  });

  test("phase agents are primary mode", () => {
    expect(agents["workflow-plan"]!.mode).toBe("primary");
    expect(agents["workflow-implement"]!.mode).toBe("primary");
  });

  test("review agent is hidden subagent", () => {
    expect(agents["workflow-review"]!.mode).toBe("subagent");
    expect(agents["workflow-review"]!.hidden).toBe(true);
  });

  test("phase agents have description from workflow", () => {
    expect(agents["workflow-plan"]!.description).toContain("Planning");
  });

  test("phase agents have prompt with conventions", () => {
    expect(agents["workflow-plan"]!.prompt).toContain("Use TODO lists");
  });

  test("phase agents have prompt with gate criteria", () => {
    expect(agents["workflow-plan"]!.prompt).toContain("Plan documented");
  });

  test("phase agents deny workflow_advance permission", () => {
    const permission = agents["workflow-plan"]!.permission as Record<
      string,
      unknown
    >;
    expect(permission["workflow_advance"]).toBe("deny");
  });

  test("review agent allows workflow_advance permission", () => {
    const permission = agents["workflow-review"]!.permission as Record<
      string,
      unknown
    >;
    expect(permission["workflow_advance"]).toBe("allow");
  });

  test("review agent prompt includes gate criteria for all phases", () => {
    const prompt = agents["workflow-review"]!.prompt!;
    expect(prompt).toContain("Plan documented");
  });

  test("review agent has edit denied", () => {
    const permission = agents["workflow-review"]!.permission as Record<
      string,
      unknown
    >;
    expect(permission["edit"]).toBe("deny");
  });
});
