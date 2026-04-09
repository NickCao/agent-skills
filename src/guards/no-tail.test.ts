import { describe, expect, test } from "bun:test";
import { findPipeTruncation } from "./no-tail";

describe("findPipeTruncation", () => {
  describe("should block", () => {
    test("simple pipe to tail", () => {
      expect(findPipeTruncation("make | tail -20")).toBe("tail");
    });

    test("simple pipe to head", () => {
      expect(findPipeTruncation("make | head -50")).toBe("head");
    });

    test("pipe with stderr redirect", () => {
      expect(findPipeTruncation("make 2>&1 | tail -20")).toBe("tail");
    });

    test("chained pipe ending in tail", () => {
      expect(findPipeTruncation("make | grep error | tail -5")).toBe("tail");
    });

    test("full path to tail", () => {
      expect(findPipeTruncation("make | /usr/bin/tail -20")).toBe("tail");
    });

    test("pytest piped to tail", () => {
      expect(findPipeTruncation("pytest | tail -100")).toBe("tail");
    });

    test("cargo build piped to head", () => {
      expect(findPipeTruncation("cargo build 2>&1 | head -50")).toBe("head");
    });
  });

  describe("should allow", () => {
    test("tail on a file", () => {
      expect(findPipeTruncation("tail -20 /tmp/output.log")).toBeNull();
    });

    test("head on a file", () => {
      expect(findPipeTruncation("head -50 somefile.txt")).toBeNull();
    });

    test("tail -f for log watching", () => {
      expect(findPipeTruncation("tail -f /var/log/syslog")).toBeNull();
    });

    test("pipe to tee", () => {
      expect(findPipeTruncation("make 2>&1 | tee /tmp/output.log")).toBeNull();
    });

    test("pipe to grep", () => {
      expect(findPipeTruncation("make | grep error")).toBeNull();
    });

    test("tail after && (sequential, not piped)", () => {
      expect(
        findPipeTruncation("make > /tmp/out.log && tail /tmp/out.log"),
      ).toBeNull();
    });

    test("plain command with no pipes", () => {
      expect(findPipeTruncation("make")).toBeNull();
    });

    test("tail in a quoted string", () => {
      expect(findPipeTruncation('echo "make | tail"')).toBeNull();
    });
  });
});
