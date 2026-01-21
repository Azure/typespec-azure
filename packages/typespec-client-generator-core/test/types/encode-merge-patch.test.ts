import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("encode propagated to merge patch model properties for arrays", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model Widget {
        @encode(ArrayEncoding.commaDelimited)
        requiredColors: string[];

        @encode(ArrayEncoding.spaceDelimited)
        optionalColors?: string[];
      }

      @route("/widgets")
      @patch
      op update(
        @body widget: MergePatchUpdate<Widget>,
      ): Widget;
    }
  `);

  const models = runner.context.sdkPackage.models;
  const widgetModel = models.find((m) => m.name === "WidgetMergePatchUpdate");
  strictEqual(widgetModel?.kind, "model");

  const requiredColorsProp = widgetModel?.properties.find((p) => p.name === "requiredColors");
  strictEqual(requiredColorsProp?.encode, "commaDelimited");
  strictEqual(requiredColorsProp?.type.kind, "array");

  const optionalColorsProp = widgetModel?.properties.find((p) => p.name === "optionalColors");
  strictEqual(optionalColorsProp?.encode, "spaceDelimited");
  strictEqual(optionalColorsProp?.type.kind, "nullable");
  strictEqual(optionalColorsProp?.type.type.kind, "array");
});

it("encode propagated to merge patch model properties for datetime", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model Event {
        @encode(DateTimeKnownEncoding.rfc3339)
        requiredTime: utcDateTime;

        @encode(DateTimeKnownEncoding.rfc7231)
        optionalTime?: utcDateTime;
      }

      @route("/events")
      @patch
      op update(
        @body event: MergePatchUpdate<Event>,
      ): Event;
    }
  `);

  const models = runner.context.sdkPackage.models;
  const eventModel = models.find((m) => m.name === "EventMergePatchUpdate");
  strictEqual(eventModel?.kind, "model");

  const requiredTimeProp = eventModel?.properties.find((p) => p.name === "requiredTime");
  strictEqual(requiredTimeProp?.type.kind, "utcDateTime");
  strictEqual(requiredTimeProp.type.encode, "rfc3339");

  const optionalTimeProp = eventModel?.properties.find((p) => p.name === "optionalTime");
  strictEqual(optionalTimeProp?.type.kind, "nullable");
  strictEqual(optionalTimeProp?.type.type.kind, "utcDateTime");
  strictEqual(optionalTimeProp.type.type.encode, "rfc7231");
});

it("encode propagated to merge patch model properties for duration", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model Task {
        @encode(DurationKnownEncoding.seconds, float32)
        requiredDuration: duration;

        @encode(DurationKnownEncoding.ISO8601)
        optionalDuration?: duration;
      }

      @route("/tasks")
      @patch
      op update(
        @body task: MergePatchUpdate<Task>,
      ): Task;
    }
  `);

  const models = runner.context.sdkPackage.models;
  const taskModel = models.find((m) => m.name === "TaskMergePatchUpdate");
  strictEqual(taskModel?.kind, "model");

  const requiredDurationProp = taskModel?.properties.find((p) => p.name === "requiredDuration");
  strictEqual(requiredDurationProp?.type.kind, "duration");
  strictEqual(requiredDurationProp.type.encode, "seconds");
  strictEqual(requiredDurationProp.type.wireType.kind, "float32");

  const optionalDurationProp = taskModel?.properties.find((p) => p.name === "optionalDuration");
  strictEqual(optionalDurationProp?.type.kind, "nullable");
  strictEqual(optionalDurationProp?.type.type.kind, "duration");
  strictEqual(optionalDurationProp.type.type.encode, "ISO8601");
});
