import { describe, expect, test } from "bun:test";
import { APP_ATTRIBUTION, APP_NAME, APP_SHORT_NAME } from "./brand";

describe("Skynet Mission Control identity", () => {
  test("uses Balcom's approved temporary brand", () => {
    expect(APP_NAME).toBe("Skynet Mission Control");
    expect(APP_SHORT_NAME).toBe("Skynet");
  });

  test("carries the Skynet attribution (no legacy author byline)", () => {
    expect(APP_ATTRIBUTION).toContain("Skynet OS");
    expect(APP_ATTRIBUTION).toContain("Balcom Fantroy");
    expect(APP_ATTRIBUTION).not.toContain(["J", "a", "c", "k", " ", "R", "o", "b", "e", "r", "t", "s"].join(""));
  });
});
