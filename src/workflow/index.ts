import { readFileSync, existsSync } from "fs";
import path from "path";
import { parseWorkflow, type WorkflowConfig } from "./schema.ts";
import { generateAgents, type AgentConfig } from "./agents.ts";
import {
  createWorkflowTools,
  type WorkflowTools,
  type SessionResolver,
} from "./tools.ts";
import { WorkflowState } from "./state.ts";

const WORKFLOW_PATH = ".workflow/workflow.yaml";

export interface WorkflowSetup {
  config: WorkflowConfig;
  agents: Record<string, AgentConfig>;
  tools: WorkflowTools;
}

/**
 * Creates a SessionResolver that follows the parentID chain to find the
 * root session ID. Caches results to avoid repeated API calls.
 *
 * This is necessary because subagents (like workflow-review) run in child
 * sessions. When they call workflow_advance, the state must be keyed by the
 * root/parent session so that the parent agent sees the change.
 */
interface SessionClient {
  session: {
    get(params: {
      path: { id: string };
    }): Promise<{
      data?: { parentID?: string | null };
    }>;
  };
}

function createSessionResolver(client: SessionClient): SessionResolver {
  const cache = new Map<string, string>();

  return async (sessionID: string): Promise<string> => {
    const cached = cache.get(sessionID);
    if (cached) return cached;

    let currentID = sessionID;
    const chain: string[] = [sessionID];

    while (true) {
      const result = await client.session.get({
        path: { id: currentID },
      });
      const parentID = result.data?.parentID;
      if (!parentID) break;
      chain.push(parentID);
      currentID = parentID;
    }

    // Cache every ID in the chain to the root
    for (const id of chain) {
      cache.set(id, currentID);
    }

    return currentID;
  };
}

export function setupWorkflow(
  directory: string,
  client: SessionClient,
): WorkflowSetup | null {
  const filePath = path.join(directory, WORKFLOW_PATH);

  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf-8");
  const config = parseWorkflow(content);
  const sessions = new Map<string, WorkflowState>();
  const resolveSession = createSessionResolver(client);

  return {
    config,
    agents: generateAgents(config),
    tools: createWorkflowTools(config, sessions, resolveSession),
  };
}
