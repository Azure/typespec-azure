import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { BasicTestRunner, createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { deepStrictEqual } from "assert";
import { diffProgram } from "../src/diff.js";
import { DiffContext, DiffMessage } from "../src/rules.js";

export async function createAzureCoreTestHost() {
  return createTestHost({
    libraries: [AzureCoreTestLibrary, HttpTestLibrary, RestTestLibrary, VersioningTestLibrary],
  });
}
const CommonCode = `import "@azure-tools/typespec-azure-core"; import "${HttpTestLibrary.name}"; import "${RestTestLibrary.name}"; import "${VersioningTestLibrary.name}"; using TypeSpec.Rest; using Azure.Core;using TypeSpec.Http;using TypeSpec.Versioning;
`;

export async function createTypeSpecDiffTestRunner(): Promise<BasicTestRunner> {
  const host = await createAzureCoreTestHost();
  return createTestWrapper(host, {
    autoImports: [],
    wrapper: (code: string) => `${CommonCode}${code}`,
    compilerOptions: {
      miscOptions: { "disable-linter": true },
    },
  });
}

async function createTestProgram(code: string) {
  const runner = await createTypeSpecDiffTestRunner();
  await runner.compile(code);
  return runner.program;
}

export async function diffTestCodes(oldCode: string, newCode: string) {
  const oldProgram = await createTestProgram(oldCode);
  const newProgram = await createTestProgram(newCode);
  const messages: DiffMessage[] = [];
  const ctx: DiffContext = {
    direction: "None",
    oldProgram,
    newProgram,
    visited: new Set(),
    caches: new Map(),
    versions: { oldVersion: "", newVersion: "" },
    messageReporter: {
      report: (msg) => {
        messages.push(msg);
      },
    },
  };
  diffProgram(oldProgram, newProgram, ctx);
  return messages;
}

export async function diffSameVersions(
  oldCode: string,
  newCode: string,
  reverseDirection: boolean = false
) {
  const header = `@service({
    title: "Contoso Widget Manager",
  })
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;
  enum Versions {
    @useDependency(Azure.Core.Versions.v1_0_Preview_1)
    v2022_08_31: "2022-08-31",
  }`;
  if (reverseDirection) {
    return await diffTestCodes(header + newCode, header + oldCode);
  }
  return await diffTestCodes(header + oldCode, header + newCode);
}

export function expectDiffCode(
  code: string,
  expectedMessages: DiffMessage[],
  actualMessages: DiffMessage[]
) {
  return deepStrictEqual(
    actualMessages
      .filter((msg) => msg.code === code)
      .map((msg) => {
        if (process.platform === "win32") {
          return {
            ...msg,
            new: msg.new ? msg.new.substring(2) : msg.new,
            old: msg.old ? msg.old.substring(2) : msg.old,
          };
        }
        return msg;
      }),
    expectedMessages.filter((msg) => msg.code === code)
  );
}
