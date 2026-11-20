import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { $provideTypeInfo } from "../src/type-info.js";
import { Tester } from "./tester.js";

describe("arm: $provideTypeInfo", () => {
  it("is registered and surfaces resource metadata and lifecycle, list, and action operations", async () => {
    const { program, Widget } = await Tester.compile(t.code`
      @armProviderNamespace
      namespace Microsoft.Test;

      model WidgetProperties {}
      model ${t.model("Widget")} is TrackedResource<WidgetProperties> {
        @key("widgetName") @segment("widgets") @path name: string;
      }

      @armResourceOperations
      interface Widgets extends TrackedResourceOperations<Widget, WidgetProperties> {
        restart is ArmResourceActionSync<Widget, {}, void>;
      }
    `);

    const diagnostics = [...program.diagnostics];
    const info = program.getTypeInfo(Widget);
    expect(info?.content).toContain("`ARM Resource`: `Tracked`");
    expect(info?.content).toContain("`Provider`: `Microsoft.Test`");
    expect(info?.content).toContain("`Collection`: `widgets`");
    expect(info?.content).toContain("`Scope`: `ResourceGroup`");
    expect(info?.content).toContain(
      // cspell: disable-next-line
      "- `read`: `Microsoft.Test.Widgets.get` — `GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}{?api%2Dversion}`",
    );
    expect(info?.content).toContain(
      "- `createOrUpdate`: `Microsoft.Test.Widgets.createOrUpdate` — `PUT ",
    );
    expect(info?.content).toContain("- `update`: `Microsoft.Test.Widgets.update` — `PATCH ");
    expect(info?.content).toContain("- `delete`: `Microsoft.Test.Widgets.delete` — `DELETE ");
    expect(info?.content).toContain(
      "- `list`: `Microsoft.Test.Widgets.listByResourceGroup` — `GET ",
    );
    expect(info?.content).toContain(
      "- `list`: `Microsoft.Test.Widgets.listBySubscription` — `GET ",
    );
    expect(info?.content).toContain("- `action`: `Microsoft.Test.Widgets.restart` — `POST ");
    expect(program.getTypeInfo(Widget)).toEqual(info);
    expect(program.diagnostics).toEqual(diagnostics);
  });

  it("shows the parent of a nested resource even without operations", async () => {
    const { program, Child } = await Tester.compile(t.code`
      @armProviderNamespace
      namespace Microsoft.Test;

      model Parent is TrackedResource<{}> {
        @key("parentName") @segment("parents") @path name: string;
      }
      @parentResource(Parent)
      model ${t.model("Child")} is ProxyResource<{}> {
        @key("childName") @segment("children") @path name: string;
      }
    `);

    expect(program.getTypeInfo(Child)).toEqual({
      content:
        "`ARM Resource`: `Proxy`\n\n`Provider`: `Microsoft.Test`\n\n`Collection`: `children`\n\n`Scope`: `ResourceGroup`\n\n`Parent`: `Microsoft.Test.Parent`",
    });
  });

  it("ignores ordinary models and other types without reporting diagnostics", async () => {
    const { program, Plain, read } = await Tester.compile(t.code`
      namespace Test;
      model ${t.model("Plain")} {}
      @route("/plain") @get op ${t.op("read")}(): Plain;
    `);
    const diagnostics = [...program.diagnostics];

    expect($provideTypeInfo({ program, target: Plain })).toBeUndefined();
    expect(program.getTypeInfo(Plain)).toBeUndefined();
    expect($provideTypeInfo({ program, target: read })).toBeUndefined();
    expect(program.diagnostics).toEqual(diagnostics);
  });
});
