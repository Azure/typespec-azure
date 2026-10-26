// cspell:ignore temurin
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncCiToolVersions } from "./sync-ci-tool-versions.ts";

const mise = `[tools]
python = "3.12"
uv = "0.11.30"
java = "microsoft-11"
maven = "3.9.16"

[settings]
python = "not-a-tool-version"
`;

const action = `name: Setup Python
runs:
  using: composite
  steps:
    - name: Setup Python
      uses: actions/setup-python@python-sha # v7.0.0
      with:
        python-version: "3.12"
    - name: Setup uv
      uses: astral-sh/setup-uv@uv-sha # v10.0.1
      with:
        version: "0.11.30" # Keep this comment
    - uses: example/other@other-sha
      with:
        version: "1.0.0"
`;

const javaAction = `name: Setup Java
runs:
  using: composite
  steps:
    - name: Setup Java
      uses: actions/setup-java@java-sha # v6.1.0
      with:
        distribution: microsoft
        java-version: "11" # Keep this comment
        overwrite-settings: false
    - name: Log Maven version
      shell: bash
      run: mvn --version
`;

describe("syncCiToolVersions", () => {
  let root: string;
  let misePath: string;
  let actionPath: string;
  let javaActionPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sync-ci-tool-versions-"));
    misePath = join(root, "mise.toml");
    actionPath = join(root, ".github/actions/setup-python/action.yml");
    javaActionPath = join(root, ".github/actions/setup-java/action.yml");
    mkdirSync(join(root, ".github/actions/setup-python"), { recursive: true });
    mkdirSync(join(root, ".github/actions/setup-java"), { recursive: true });
    writeFileSync(misePath, mise);
    writeFileSync(actionPath, action);
    writeFileSync(javaActionPath, javaAction);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each(["check", "fix"] as const)("leaves matching versions unchanged in %s mode", (mode) => {
    expect(syncCiToolVersions(root, mode)).toEqual([]);
    expect(readFileSync(actionPath, "utf8")).toBe(action);
    expect(readFileSync(javaActionPath, "utf8")).toBe(javaAction);
  });

  it("reports both mismatches without changing either file in check mode", () => {
    const updatedMise = mise.replace("3.12", "3.13").replace("0.11.30", "0.12.0");
    writeFileSync(misePath, updatedMise);

    expect(syncCiToolVersions(root, "check")).toEqual([
      { tool: "python", currentVersion: "3.12", expectedVersion: "3.13" },
      { tool: "uv", currentVersion: "0.11.30", expectedVersion: "0.12.0" },
    ]);
    expect(readFileSync(actionPath, "utf8")).toBe(action);
    expect(readFileSync(misePath, "utf8")).toBe(updatedMise);
  });

  it("fixes only the tool inputs and is idempotent", () => {
    const updatedMise = mise.replace("3.12", "3.13").replace("0.11.30", "0.12.0");
    writeFileSync(misePath, updatedMise);

    expect(syncCiToolVersions(root, "fix")).toHaveLength(2);
    expect(readFileSync(actionPath, "utf8")).toBe(
      action
        .replace('python-version: "3.12"', 'python-version: "3.13"')
        .replace('version: "0.11.30"', 'version: "0.12.0"'),
    );
    expect(readFileSync(misePath, "utf8")).toBe(updatedMise);
    expect(syncCiToolVersions(root, "fix")).toEqual([]);
    expect(syncCiToolVersions(root, "check")).toEqual([]);
  });

  it("accepts quoted TOML versions with comments and quoted or plain YAML versions", () => {
    writeFileSync(misePath, mise.replace('uv = "0.11.30"', "uv = '0.11.30' # Pin uv"));
    writeFileSync(actionPath, action.replace('"3.12"', "'3.12'").replace('"0.11.30"', "0.11.30"));
    expect(syncCiToolVersions(root, "check")).toEqual([]);
  });

  it("reports Java mismatches without writing in check mode", () => {
    writeFileSync(misePath, mise.replace("microsoft-11", "microsoft-17"));

    expect(syncCiToolVersions(root, "check")).toEqual([
      { tool: "java", currentVersion: "11", expectedVersion: "17" },
    ]);
    expect(readFileSync(javaActionPath, "utf8")).toBe(javaAction);
  });

  it("fixes Java inputs without changing the distribution or action pins", () => {
    const updatedMise = mise.replace("microsoft-11", "microsoft-11.0.32");
    writeFileSync(misePath, updatedMise);

    expect(syncCiToolVersions(root, "fix")).toHaveLength(1);
    expect(readFileSync(javaActionPath, "utf8")).toBe(
      javaAction.replace('java-version: "11"', 'java-version: "11.0.32"'),
    );
    expect(readFileSync(actionPath, "utf8")).toBe(action);
    expect(readFileSync(misePath, "utf8")).toBe(updatedMise);
    expect(syncCiToolVersions(root, "fix")).toEqual([]);
  });

  it("does not synchronize the runner's Maven version with the local pin", () => {
    writeFileSync(misePath, mise.replace("3.9.16", "3.9.17"));

    expect(syncCiToolVersions(root, "fix")).toEqual([]);
    expect(readFileSync(javaActionPath, "utf8")).toBe(javaAction);
  });

  it.each(["temurin-11", "microsoft-"])(
    "rejects unsupported Java pin %s without writing",
    (version) => {
      writeFileSync(misePath, mise.replace("microsoft-11", version).replace("3.12", "3.13"));

      expect(() => syncCiToolVersions(root, "fix")).toThrow("Expected a microsoft- Java version");
      expect(readFileSync(actionPath, "utf8")).toBe(action);
      expect(readFileSync(javaActionPath, "utf8")).toBe(javaAction);
    },
  );

  it("does not partially update Python when the Java action is invalid", () => {
    writeFileSync(misePath, mise.replace("3.12", "3.13"));
    const invalidAction = javaAction.replace("actions/setup-java@", "example/setup-java@");
    writeFileSync(javaActionPath, invalidAction);

    expect(() => syncCiToolVersions(root, "fix")).toThrow(
      "Expected exactly one actions/setup-java step",
    );
    expect(readFileSync(actionPath, "utf8")).toBe(action);
    expect(readFileSync(javaActionPath, "utf8")).toBe(invalidAction);
  });

  it("preserves CRLF line endings when fixing", () => {
    writeFileSync(misePath, mise.replace("0.11.30", "0.12.0").replaceAll("\n", "\r\n"));
    writeFileSync(actionPath, action.replaceAll("\n", "\r\n"));

    expect(syncCiToolVersions(root, "fix")).toHaveLength(1);
    expect(readFileSync(actionPath, "utf8")).toBe(
      action.replace("0.11.30", "0.12.0").replaceAll("\n", "\r\n"),
    );
  });

  it.each([
    ["missing tools section", mise.replace("[tools]", "[other]"), "Missing [tools] section"],
    ["missing tool", mise.replace('uv = "0.11.30"\n', ""), "Expected a quoted uv version"],
    ["unsupported tool value", mise.replace('"0.11.30"', "{}"), "Expected a quoted uv version"],
  ])("rejects %s without writing", (_, invalidMise, message) => {
    writeFileSync(misePath, invalidMise);
    expect(() => syncCiToolVersions(root, "fix")).toThrow(message);
    expect(readFileSync(actionPath, "utf8")).toBe(action);
  });

  it.each([
    [
      "missing action",
      action.replace("astral-sh/setup-uv@", "example/setup-uv@"),
      "Expected exactly one astral-sh/setup-uv step",
    ],
    [
      "duplicate action",
      action + "    - uses: astral-sh/setup-uv@another-sha\n",
      "Expected exactly one astral-sh/setup-uv step",
    ],
    [
      "missing input",
      action.replace('        version: "0.11.30" # Keep this comment\n', ""),
      "Missing or unsupported version input",
    ],
  ])("rejects %s without partially fixing earlier steps", (_, invalidAction, message) => {
    writeFileSync(misePath, mise.replace("3.12", "3.13"));
    writeFileSync(actionPath, invalidAction);
    expect(() => syncCiToolVersions(root, "fix")).toThrow(message);
    expect(readFileSync(actionPath, "utf8")).toBe(invalidAction);
  });
});
