import { parse } from "yaml";

export interface WorkflowPhase {
  id: string;
  name: string;
  description?: string;
  conventions: string[];
  gate: string[];
}

export interface WorkflowTransition {
  from: string;
  to: string;
}

export interface WorkflowConfig {
  version: number;
  metadata: {
    last_indexed: string;
  };
  phases: WorkflowPhase[];
  transitions: WorkflowTransition[];
  project_conventions: Record<string, unknown>;
}

export function parseWorkflow(yamlContent: string): WorkflowConfig {
  const raw = parse(yamlContent);

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid workflow YAML: expected an object");
  }

  if (raw.version !== 1) {
    throw new Error(
      "Invalid workflow YAML: missing or unsupported version (expected 1)",
    );
  }

  if (!Array.isArray(raw.phases) || raw.phases.length === 0) {
    throw new Error(
      "Invalid workflow YAML: phases must be a non-empty array",
    );
  }

  const phases: WorkflowPhase[] = raw.phases.map((p: any, i: number) => {
    if (!p.id || typeof p.id !== "string") {
      throw new Error(`Invalid workflow YAML: phase at index ${i} missing id`);
    }
    return {
      id: p.id,
      name: p.name ?? p.id,
      description: p.description,
      conventions: Array.isArray(p.conventions) ? p.conventions : [],
      gate: Array.isArray(p.gate) ? p.gate : [],
    };
  });

  const transitions: WorkflowTransition[] = Array.isArray(raw.transitions)
    ? raw.transitions.map((t: any) => ({ from: t.from, to: t.to }))
    : [];

  return {
    version: raw.version,
    metadata: {
      last_indexed: raw.metadata?.last_indexed ?? new Date().toISOString(),
    },
    phases,
    transitions,
    project_conventions: raw.project_conventions ?? {},
  };
}
