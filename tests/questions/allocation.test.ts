import { describe, expect, it } from "vitest";
import { allocateQuestions } from "../../src/modules/questions/allocation";

describe("paper allocation", () => {
  it("does not let a broad row consume the only specific candidate", () => {
    expect(allocateQuestions([["specific", "other"], ["specific"]])).toEqual([
      "other",
      "specific",
    ]);
  });
  it("retains locked questions across overlapping rows", () => {
    const result = allocateQuestions(
      [["a", "b", "locked"], ["a", "b"], ["a"]],
      ["locked"],
    );
    expect(result).toEqual(["locked", "b", "a"]);
  });
  it("rejects a shortage and incompatible locks", () => {
    expect(() => allocateQuestions([["a"], ["a"]])).toThrow(/Not enough/);
    expect(() => allocateQuestions([["a"]], ["outside"])).toThrow(/locked/);
  });
});
