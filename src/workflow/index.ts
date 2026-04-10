import { readFileSync, existsSync } from "fs";
import path from "path";
import { parseWorkflow, type WorkflowConfig } from "./schema.ts";
import { generateAgents, type AgentConfig } from "./agents.ts";
import { createWorkflowTools, type WorkflowTools } from "./tools.ts";
import { WorkflowState } from "./state.ts";

const WORKFLOW_PATH = ".workflow/workflow.yaml";

export interface WorkflowSetup {
  config: WorkflowConfig;
  agents: Record<string, AgentConfig>;
  tools: WorkflowTools;
}

export function setupWorkflow(directory: string): WorkflowSetup | null {
  const filePath = path.join(directory, WORKFLOW_PATH);

  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf-8");
  const config = parseWorkflow(content);
  const sessions = new Map<string, WorkflowState>();

  return {
    config,
    agents: generateAgents(config),
    tools: createWorkflowTools(config, sessions),
  };
}
