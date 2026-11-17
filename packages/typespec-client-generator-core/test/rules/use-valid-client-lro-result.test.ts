import {
  createLinterRuleTester,
  expectDiagnosticEmpty,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useValidClientLroResultRule } from "../../src/rules/use-valid-client-lro-result.js";
import { ArmTester, AzureCoreTester } from "../tester.js";

const ruleCode = "@azure-tools/typespec-client-generator-core/use-valid-client-lro-result";

const resourceLro = `
  @service namespace TestService;
  alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;

  model Payload { value: string; }

  @resource("jobs")
  model Job {
    @key id: string;
    @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
    @lroResult result: Payload;
    secondary: Payload;
  }

  @get @route("/jobs/{id}") op read(@path id: string): Job;
  @get @route("/jobs/{id}/status") op poll(@path id: string): Job;

  @pollingOperation(poll)
  op start is Operations.LongRunningResourceCreateOrReplace<Job>;
`;

const actionLro = `
  @service namespace TestService;

  model Payload { value: string; }
  model Status {
    @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
    @lroResult result: Payload;
  }

  @post @route("/jobs")
  op start(): {
    @statusCode statusCode: 202;
    @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
  };
`;

const resourceLroWithSeparateStatusMonitor = `
  @service namespace TestService;
  alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;

  model Payload { value: string; }

  @resource("widgets")
  model Widget {
    @key id: string;
  }

  model Status {
    @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
    @lroResult result: Payload;
    resource: Widget;
  }

  @get @route("/widgets/{id}") op read(@path id: string): Widget;
  @get @route("/widgets/{id}/status") op poll(@path id: string): Status;

  @pollingOperation(poll)
  op start is Operations.LongRunningResourceCreateOrReplace<Widget>;
`;

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await AzureCoreTester.createInstance(),
    useValidClientLroResultRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("use-valid-client-lro-result", () => {
  it("warns when a resource LRO selects a status-monitor property", async () => {
    await tester
      .expect(
        `
        ${resourceLro}
        @@clientLroResult(start, Job.secondary);
      `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "@clientLroResult on resource LRO 'start' selects 'TestService.Payload' instead of 'TestService.Job'.",
      });
  });

  it("warns when a resource LRO selects its separate status-monitor response", async () => {
    await tester
      .expect(
        `
        ${resourceLroWithSeparateStatusMonitor}
        @@clientLroResult(start, Status);
      `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "@clientLroResult on resource LRO 'start' selects 'TestService.Status' instead of 'TestService.Widget'.",
      });
  });

  it("warns when a resource DELETE LRO selects the resource", async () => {
    await tester
      .expect(
        `
        ${resourceLroWithSeparateStatusMonitor}

        @delete
        @route("/widgets/{id}")
        @deletesResource(Widget)
        @pollingOperation(poll)
        op remove(@path id: string): {
          @statusCode statusCode: 202;
          @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
        };

        @@clientLroResult(remove, Status.resource);
      `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "@clientLroResult on resource LRO 'remove' selects 'TestService.Widget' instead of 'void'.",
      });
  });

  it("accepts a selected property containing the resource", async () => {
    await tester
      .expect(
        `
        ${resourceLroWithSeparateStatusMonitor}
        @@clientLroResult(start, Status.resource);
      `,
      )
      .toBeValid();
  });

  it("reports one warning when several scopes select the result property", async () => {
    await tester
      .expect(
        `
        ${resourceLro}
        @@clientLroResult(start, Job.result, "python");
        @@clientLroResult(start, Job.result, "java");
      `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
      });
  });

  it("allows suppressing the warning to preserve a GA SDK result type", async () => {
    const diagnostics = await AzureCoreTester.diagnose(
      `
        @service namespace TestService;
        alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;

        model Payload { value: string; }

        @resource("jobs")
        model Job {
          @key id: string;
          @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
          @lroResult result: Payload;
        }

        @get @route("/jobs/{id}") op read(@path id: string): Job;
        @get @route("/jobs/{id}/status") op poll(@path id: string): Job;

        #suppress "${ruleCode}" "Preserve the GA SDK return type."
        @pollingOperation(poll)
        op start is Operations.LongRunningResourceCreateOrReplace<Job>;

        @@clientLroResult(start, Job.result, "python");
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              [ruleCode]: true,
            },
          },
        },
      },
    );
    expectDiagnosticEmpty(diagnostics);
  });

  it("accepts the resource response body", async () => {
    await tester
      .expect(
        `
        ${resourceLro}
        @@clientLroResult(start, Job);
      `,
      )
      .toBeValid();
  });

  it("accepts an action result property", async () => {
    await tester
      .expect(
        `
        ${actionLro}
        @@clientLroResult(start, Status.result);
      `,
      )
      .toBeValid();
  });

  it("accepts an action status-monitor body", async () => {
    await tester
      .expect(
        `
        ${actionLro}
        @@clientLroResult(start, Status);
      `,
      )
      .toBeValid();
  });

  it("does not report on Azure.Core or Azure.ResourceManager library operations", async () => {
    const armTester = createLinterRuleTester(
      await ArmTester.createInstance(),
      useValidClientLroResultRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await armTester
      .expect(
        `
        @armProviderNamespace
        @service
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Microsoft.Contoso;

        model Widget is TrackedResource<WidgetProperties> {
          @key("widgetName") @segment("widgets") name: string;
        }

        model WidgetProperties {
          provisioningState?: ResourceProvisioningState;
        }

        @armResourceOperations
        interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        }
      `,
      )
      .toBeValid();
  });
});
