import type { WorkflowConfig, WorkflowPhase } from "./schema.ts";

export interface WorkflowStatus {
  current: string;
  position: number;
  total: number;
  completed: string[];
  conventions: string[];
  gate: string[];
  done: boolean;
}

export class WorkflowState {
  private workflow: WorkflowConfig;
  private phaseIndex: number;
  private completedPhases: string[];
  private _done: boolean;

  constructor(workflow: WorkflowConfig) {
    this.workflow = workflow;
    this.phaseIndex = 0;
    this.completedPhases = [];
    this._done = false;
  }

  currentPhase(): WorkflowPhase {
    return this.workflow.phases[this.phaseIndex]!;
  }

  isDone(): boolean {
    return this._done;
  }

  advance(): WorkflowPhase | "done" {
    const current = this.currentPhase();
    const transition = this.workflow.transitions.find(
      (t) => t.from === current.id,
    );

    if (!transition) {
      this.completedPhases.push(current.id);
      this._done = true;
      return "done";
    }

    const nextIndex = this.workflow.phases.findIndex(
      (p) => p.id === transition.to,
    );

    if (nextIndex === -1) {
      this.completedPhases.push(current.id);
      this._done = true;
      return "done";
    }

    this.completedPhases.push(current.id);
    this.phaseIndex = nextIndex;
    return this.workflow.phases[nextIndex]!;
  }

  status(): WorkflowStatus {
    if (this._done) {
      return {
        current: "done",
        position: this.workflow.phases.length,
        total: this.workflow.phases.length,
        completed: [...this.completedPhases],
        conventions: [],
        gate: [],
        done: true,
      };
    }

    const phase = this.currentPhase();
    return {
      current: phase.id,
      position: this.phaseIndex + 1,
      total: this.workflow.phases.length,
      completed: [...this.completedPhases],
      conventions: phase.conventions,
      gate: phase.gate,
      done: false,
    };
  }
}
