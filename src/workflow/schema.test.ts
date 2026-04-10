import { describe, expect, test } from "bun:test";
import { parseWorkflow } from "./schema.ts";

const VALID_YAML = `
version: 1
metadata:
  last_indexed: "2026-04-10T10:30:00Z"

phases:
  - id: plan
    name: Planning
    description: Define requirements and approach
    conventions:
      - Use TODO lists for task tracking
    gate:
      - Plan documented

  - id: implement
    name: Implementation
    description: Write code following project patterns
    conventions:
      - Follow existing module patterns

transitions:
  - from: plan
    to: implement

project_conventions:
  branching:
    pattern: "feature/*, fix/*"
    main_branch: main
  commits:
    format: conventional
`;

describe("parseWorkflow", () => {
  test("parses valid workflow YAML", () => {
    const result = parseWorkflow(VALID_YAML);
    expect(result.version).toBe(1);
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0]!.id).toBe("plan");
    expect(result.phases[0]!.conventions).toEqual([
      "Use TODO lists for task tracking",
    ]);
    expect(result.phases[0]!.gate).toEqual(["Plan documented"]);
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0]).toEqual({ from: "plan", to: "implement" });
  });

  test("throws on missing version", () => {
    expect(() => parseWorkflow("phases: []")).toThrow("version");
  });

  test("throws on empty phases", () => {
    expect(() => parseWorkflow("version: 1\nphases: []")).toThrow("phases");
  });

  test("throws on phase missing id", () => {
    const yaml = `
version: 1
phases:
  - name: Planning
    conventions: []
transitions: []
`;
    expect(() => parseWorkflow(yaml)).toThrow("id");
  });

  test("defaults gate to empty array when omitted", () => {
    const result = parseWorkflow(VALID_YAML);
    expect(result.phases[1]!.gate).toEqual([]);
  });

  test("defaults project_conventions to empty object when omitted", () => {
    const yaml = `
version: 1
phases:
  - id: plan
    name: Planning
    conventions: []
transitions: []
`;
    const result = parseWorkflow(yaml);
    expect(result.project_conventions).toEqual({});
  });
});
