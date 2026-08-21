import { describe, expect, test } from "bun:test";
import {
  dashboardRootFromRegistry,
  graphRegistrationScriptFromRegistry,
  registryPathFromGraphPath,
} from "./graph-paths";

describe("Graphify dashboard paths", () => {
  test("resolves a Windows graph path to its registry", () => {
    expect(
      registryPathFromGraphPath(String.raw`C:\Users\Example\Skynet\src\data\graphs\reisift-crm.json`),
    ).toBe(String.raw`C:\Users\Example\Skynet\src\data\graphs\index.json`);
  });

  test("resolves a POSIX graph path to its registry", () => {
    expect(registryPathFromGraphPath("/home/me/skynet/src/data/graphs/reisift.json")).toBe(
      "/home/me/skynet/src/data/graphs/index.json",
    );
  });

  test("derives the dashboard root from either path style", () => {
    expect(
      dashboardRootFromRegistry(String.raw`C:\Users\Example\Skynet\src\data\graphs\index.json`),
    ).toBe(String.raw`C:\Users\Example\Skynet`);
    expect(dashboardRootFromRegistry("/home/me/skynet/src/data/graphs/index.json")).toBe(
      "/home/me/skynet",
    );
  });

  test("resolves the bundled relative registry to the repository script", () => {
    expect(graphRegistrationScriptFromRegistry("src/data/graphs/index.json")).toBe(
      "./scripts/graph-to-dashboard.sh",
    );
  });
});
