import { tool } from "@opencode-ai/plugin";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { WorkflowState } from "./state.ts";
import type { WorkflowConfig } from "./schema.ts";

export type WorkflowTools = {
  [key: string]: ToolDefinition;
};

/**
 * Resolves a session ID to its root session ID by following the parentID chain.
 * Subagents run in child sessions -- we need to key state by the root session
 * so that parent and child sessions share the same workflow state.
 */
export type SessionResolver = (sessionID: string) => Promise<string>;

async function getOrCreateState(
  sessions: Map<string, WorkflowState>,
  sessionID: string,
  workflow: WorkflowConfig,
  resolveSession: SessionResolver,
): Promise<WorkflowState> {
  const rootID = await resolveSession(sessionID);
  let state = sessions.get(rootID);
  if (!state) {
    state = new WorkflowState(workflow);
    sessions.set(rootID, state);
  }
  return state;
}

export function createWorkflowTools(
  workflow: WorkflowConfig,
  sessions: Map<string, WorkflowState>,
  resolveSession: SessionResolver,
): WorkflowTools {
  return {
    workflow_status: tool({
      description:
        "Get the current workflow phase, its conventions, and gate criteria. " +
        "Use this to understand what phase you are in and what is expected.",
      args: {},
      async execute(_args, context) {
        const state = await getOrCreateState(
          sessions,
          context.sessionID,
          workflow,
          resolveSession,
        );
        return JSON.stringify(state.status(), null, 2);
      },
    }),

    workflow_advance: tool({
      description:
        "Advance to the next workflow phase. " +
        "Only the workflow-review agent may call this tool after verifying gate criteria are met.",
      args: {
        reason: tool.schema
          .string()
          .describe("Why the current phase's gate criteria are met"),
      },
      async execute(args, context) {
        if (context.agent !== "workflow-review") {
          throw new Error(
            "Only the workflow-review agent can advance the workflow. " +
              `Current agent: ${context.agent}`,
          );
        }

        const state = await getOrCreateState(
          sessions,
          context.sessionID,
          workflow,
          resolveSession,
        );

        if (state.isDone()) {
          return JSON.stringify({
            status: "done",
            message: "All workflow phases are already complete.",
            completed: state.status().completed,
          });
        }

        const next = state.advance();

        if (next === "done") {
          return JSON.stringify({
            status: "done",
            message:
              "All workflow phases are complete. The task is finished.",
            completed: state.status().completed,
            reason: args.reason,
          });
        }

        return JSON.stringify({
          status: "advanced",
          advanced_to: next.id,
          phase_name: next.name,
          reason: args.reason,
          message: `Phase advanced to ${next.name}. The session will automatically switch to the workflow-${next.id} agent.`,
        });
      },
    }),
  };
}
