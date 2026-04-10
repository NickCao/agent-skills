import type { WorkflowConfig, WorkflowPhase } from "./schema.ts";

export type AgentConfig = {
  [key: string]: unknown;
  description?: string;
  mode?: "primary" | "subagent" | "all";
  hidden?: boolean;
  prompt?: string;
  color?: string;
  permission?: Record<string, unknown>;
};

function buildPhasePrompt(phase: WorkflowPhase): string {
  const lines: string[] = [];
  lines.push(
    `You are in the ${phase.name.toUpperCase()} phase of the project workflow.`,
  );

  if (phase.description) {
    lines.push("", phase.description);
  }

  if (phase.conventions.length > 0) {
    lines.push("", "## Conventions");
    for (const c of phase.conventions) {
      lines.push(`- ${c}`);
    }
  }

  if (phase.gate.length > 0) {
    lines.push("", "## Completion Gate");
    lines.push("Before this phase is complete, ensure:");
    for (const g of phase.gate) {
      lines.push(`- ${g}`);
    }
  }

  lines.push(
    "",
    "## When Done",
    "When your work for this phase is complete, invoke @workflow-review to check your work.",
    "If the review approves, the workflow will automatically transition to the next phase.",
  );

  return lines.join("\n");
}

function buildReviewPrompt(workflow: WorkflowConfig): string {
  const lines: string[] = [];
  lines.push("You are the workflow gate reviewer.");
  lines.push(
    "Your job is to review the current phase's output and determine if it meets the completion criteria.",
  );
  lines.push("");
  lines.push(
    "Call `workflow_status` to see the current phase and its gate criteria.",
  );
  lines.push("");
  lines.push("## Phase Gates");

  for (const phase of workflow.phases) {
    if (phase.gate.length > 0) {
      lines.push("");
      lines.push(`### ${phase.name} (${phase.id})`);
      for (const g of phase.gate) {
        lines.push(`- ${g}`);
      }
    }
  }

  lines.push("");
  lines.push("## Decision");
  lines.push(
    "- If gate criteria are met: call the `workflow_advance` tool with a reason.",
  );
  lines.push(
    "- If criteria are NOT met: return specific feedback on what is missing. Do NOT call `workflow_advance`.",
  );

  return lines.join("\n");
}

const PHASE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
];

export function generateAgents(
  workflow: WorkflowConfig,
): Record<string, AgentConfig> {
  const agents: Record<string, AgentConfig> = {};

  for (let i = 0; i < workflow.phases.length; i++) {
    const phase = workflow.phases[i]!;
    agents[`workflow-${phase.id}`] = {
      description: `${phase.name} phase — ${phase.description ?? phase.name}`,
      mode: "primary",
      prompt: buildPhasePrompt(phase),
      color: PHASE_COLORS[i % PHASE_COLORS.length],
      permission: {
        workflow_advance: "deny",
      },
    };
  }

  agents["workflow-review"] = {
    description:
      "Reviews phase completion and gates transitions between workflow phases",
    mode: "subagent",
    hidden: true,
    prompt: buildReviewPrompt(workflow),
    permission: {
      workflow_advance: "allow",
      edit: "deny",
    },
  };

  return agents;
}
