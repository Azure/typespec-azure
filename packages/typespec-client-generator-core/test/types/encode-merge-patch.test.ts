import { strictEqual } from "assert";
import { it } from "vitest";
import { AzureCoreTesterWithService, createSdkContextForTester } from "../tester.js";

it("encode propagated to merge patch model properties for arrays", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
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
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
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
  const { program } = await AzureCoreTesterWithService.compile(`
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
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
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
  const { program } = await AzureCoreTesterWithService.compile(`
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
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
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
