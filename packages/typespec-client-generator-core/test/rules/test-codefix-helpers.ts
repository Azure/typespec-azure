import type { CompilerHost } from "@typespec/compiler";
import { applyCodeFix, navigateProgram } from "@typespec/compiler";
import type { TesterInstance } from "@typespec/compiler/testing";
import { expect } from "vitest";

/**
 * Apply a cross-file codefix and return the generated client.tsp content.
 *
 * Similar to the standard `tester.expect(code).applyCodeFix(id).toEqual(expected)`
 * but for codefixes that write to client.tsp instead of the source file.
 * Reusable across any linter rule that writes augment decorators to client.tsp.
 *
 * @param testRunner The tester instance.
 * @param rule The linter rule (must have `name` and `create`).
 * @param libraryName The library name (e.g., "@azure-tools/typespec-client-generator-core").
 * @param code The TypeSpec code to compile.
 * @param fixId The codefix ID to apply.
 * @returns The content written to client.tsp.
 */
export async function applyClientTspCodeFix(
  testRunner: TesterInstance,
  rule: { name: string; create: (context: any) => any },
  libraryName: string,
  code: string,
  fixId: string,
): Promise<string> {
  await testRunner.compileAndDiagnose(code);
  const diagnostics: any[] = [];
  const context = {
    program: testRunner.program,
    reportDiagnostic(diag: any) {
      diagnostics.push(diag);
    },
  };
  navigateProgram(testRunner.program, rule.create(context));

  const codefix = diagnostics.flatMap((d) => d.codefixes ?? []).find((f: any) => f.id === fixId);
  expect(codefix, `Codefix "${fixId}" not found`).toBeDefined();

  const writtenFiles = new Map<string, string>();
  const host: CompilerHost = {
    ...testRunner.program.host,
    writeFile: (path, content) => {
      writtenFiles.set(path, content);
      return Promise.resolve();
    },
  };
  await applyCodeFix(host, codefix);

  const entry = [...writtenFiles.entries()].find(([p]) => p.endsWith("client.tsp"));
  expect(entry, "No client.tsp was written").toBeDefined();
  return entry![1];
}
