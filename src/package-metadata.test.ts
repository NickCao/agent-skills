import { describe, expect, test } from "bun:test";
import packageJson from "../package.json";

describe("package metadata", () => {
  test("declares @opencode-ai/plugin as a runtime dependency", () => {
    expect(packageJson.dependencies?.["@opencode-ai/plugin"]).toBeString();
    expect(packageJson.devDependencies?.["@opencode-ai/plugin"]).toBeUndefined();
  });
});
