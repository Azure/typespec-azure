import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { boolPropertyNamePrefixRule } from "../../src/rules/bool-property-name-prefix.rule.js";
import { SimpleTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    boolPropertyNamePrefixRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("emits warning when a boolean property has no verb prefix", async () => {
  await tester
    .expect(
      `model Foo {
        tracked: boolean;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/bool-property-name-prefix",
      message: `Boolean property or parameter 'Tracked' should start with one of the following verb prefixes followed by an uppercase letter: Is, Has, Can, Should, Are, Was, Will, Does, Do. Consider renaming it (for example to 'IsTracked') or use @clientName("IsTracked", "csharp") to rename it for C#.`,
    });
});

it("is valid when boolean property starts with Is", async () => {
  await tester
    .expect(
      `model Foo {
        isTracked: boolean;
      }`,
    )
    .toBeValid();
});

it("is valid when boolean property starts with Has", async () => {
  await tester
    .expect(
      `model Foo {
        hasDynamicFieldSchema: boolean;
      }`,
    )
    .toBeValid();
});

it("is valid when boolean property starts with Can", async () => {
  await tester
    .expect(
      `model Foo {
        canDelete: boolean;
      }`,
    )
    .toBeValid();
});

it("is valid when boolean property starts with Should", async () => {
  await tester
    .expect(
      `model Foo {
        shouldRetry: boolean;
      }`,
    )
    .toBeValid();
});

it("does not emit for non-boolean properties", async () => {
  await tester
    .expect(
      `model Foo {
        name: string;
        count: int32;
      }`,
    )
    .toBeValid();
});

it("emits warning for properties whose type extends boolean", async () => {
  await tester
    .expect(
      `scalar MyBool extends boolean;
      model Foo {
        tracked: MyBool;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/bool-property-name-prefix",
      message: `Boolean property or parameter 'Tracked' should start with one of the following verb prefixes followed by an uppercase letter: Is, Has, Can, Should, Are, Was, Will, Does, Do. Consider renaming it (for example to 'IsTracked') or use @clientName("IsTracked", "csharp") to rename it for C#.`,
    });
});

it(`is valid when @clientName("IsTracked", "csharp") provides csharp-specific name with prefix`, async () => {
  await tester
    .expect(
      `model Foo {
        @clientName("IsTracked", "csharp")
        tracked: boolean;
      }`,
    )
    .toBeValid();
});

it(`emits warning when @clientName provides csharp name without prefix`, async () => {
  await tester
    .expect(
      `model Foo {
        @clientName("renamed", "csharp")
        isTracked: boolean;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/bool-property-name-prefix",
      message: `Boolean property or parameter 'Renamed' should start with one of the following verb prefixes followed by an uppercase letter: Is, Has, Can, Should, Are, Was, Will, Does, Do. Consider renaming it (for example to 'IsRenamed') or use @clientName("IsRenamed", "csharp") to rename it for C#.`,
    });
});

it("emits warning for boolean operation parameter without prefix", async () => {
  await tester.expect(`op getData(tracked: boolean): void;`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/bool-property-name-prefix",
    message: `Boolean property or parameter 'Tracked' should start with one of the following verb prefixes followed by an uppercase letter: Is, Has, Can, Should, Are, Was, Will, Does, Do. Consider renaming it (for example to 'IsTracked') or use @clientName("IsTracked", "csharp") to rename it for C#.`,
  });
});

it("is valid for boolean operation parameter with prefix", async () => {
  await tester.expect(`op getData(isTracked: boolean): void;`).toBeValid();
});

it("does not match prefix substrings without uppercase boundary", async () => {
  // "issue" starts with "is" but next char is lowercase -> still invalid
  await tester
    .expect(
      `model Foo {
        issue: boolean;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/bool-property-name-prefix",
    });
});
