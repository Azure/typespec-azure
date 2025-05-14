import { deepEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { compileOpenAPI } from "../test-host.js";

it("emits correct paths for tenant resources", async () => {
  const openApi = await compileOpenAPI(
    `
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Contoso;

        @doc("Widget resource")
        model Widget is ProxyResource<WidgetProperties> {
          @doc("The name of the widget")
          @key("widgetName")
          @segment("widgets")
          @path
          @visibility(Lifecycle.Read)
          name: string;
        }

      @doc("The properties of a widget")
      model WidgetProperties {
        @doc("The spin of the widget")
        spin?: SpinValues;
      }
      
      enum SpinValues {
        up,
        down,
        string,
      }
      
      interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
        @autoRoute
        @doc("Flip to the opposite of the current spin")
        @action
        flipSpin(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
      }

      @doc("Flange resource")
      @parentResource(Widget)
      model Flange is ProxyResource<FlangeProperties> {
        @doc("The name of the flange")
        @key("flangeName")
        @segment("flanges")
        @path
        @visibility(Lifecycle.Read)
        name: string;
      }
      
      @doc("The properties of a Flange")
      model FlangeProperties {
        @doc("The description of the flange")
        description: string;
      
        @doc("The weight in ounces of the flange")
        weight: safeint;
      }
      
      #suppress "deprecated" "test"
      interface Flanges
        extends TenantResourceCreate<Flange>,
          TenantResourceDelete<Flange>,
          TenantResourceRead<Flange>,
          TenantResourceListByParent<Flange> {
        @autoRoute
        @doc("Add a certain amount to the weight")
        @action
        increaseWeight(
          ...TenantInstanceParameters<Flange>,
          increment: safeint
        ): ArmNoContentResponse<"Weight added successfully"> | ErrorResponse;
      }
      `,
    { preset: "azure" },
  );
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets"].get);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].get);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].put);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].patch);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}"].delete);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges"].get);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}"].get);
  ok(openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}"].put);
  ok(
    openApi.paths["/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}"].delete,
  );
  ok(
    openApi.paths[
      "/providers/Microsoft.Contoso/widgets/{widgetName}/flanges/{flangeName}/increaseWeight"
    ].post,
  );
});

it("emits correct paths for checkLocalName endpoints", async () => {
  const openApi = await compileOpenAPI(
    `
          @armProviderNamespace
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          namespace Microsoft.Contoso;

          @doc("Widget resource")
          model Widget is ProxyResource<WidgetProperties> {
            @doc("The name of the widget")
            @key("widgetName")
            @segment("widgets")
            @path
            @visibility(Lifecycle.Read)
            name: string;
          }

          @doc("The properties of a widget")
          model WidgetProperties {
            @doc("The spin of the widget")
            spin?: SpinValues;
          }
      
          enum SpinValues {
            up,
            down,
            string,
          }

          interface Widgets extends Operations {
            checkName is checkGlobalNameAvailability;
            checkLocalName is checkLocalNameAvailability;
          }
      `,
    { preset: "azure" },
  );
  ok(
    openApi.paths[
      "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/checkNameAvailability"
    ].post,
  );
  ok(
    openApi.paths[
      "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/locations/{location}/checkNameAvailability"
    ].post,
  );
});

it("emits correct paths for ArmResourceHead operation", async () => {
  const openApi = await compileOpenAPI(
    `
        @armProviderNamespace
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Contoso;
        @doc("Widget resource")
        model Widget is ProxyResource<WidgetProperties> {
          @doc("The name of the widget")
          @key("widgetName")
          @segment("widgets")
          @path
          @visibility(Lifecycle.Read)
          name: string;
        }
        @doc("The properties of a widget")
        model WidgetProperties {
          @doc("The spin of the widget")
          spin?: SpinValues;
        }
        enum SpinValues {
          up,
          down,
          string,
        }
        interface Widgets extends Operations {
          checkExist is ArmResourceCheckExistence<Widget>;
        }
    `,
    { preset: "azure" },
  );
  const headOperation =
    openApi.paths[
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}"
    ].head;
  ok(headOperation);
  deepEqual(headOperation, {
    operationId: "Widgets_CheckExist",
    description: "Check for the existence of a Widget",
    parameters: [
      {
        $ref: "../../common-types/resource-management/v5/types.json#/parameters/ApiVersionParameter",
      },
      {
        $ref: "../../common-types/resource-management/v5/types.json#/parameters/SubscriptionIdParameter",
      },
      {
        $ref: "../../common-types/resource-management/v5/types.json#/parameters/ResourceGroupNameParameter",
      },
      {
        name: "widgetName",
        in: "path",
        description: "The name of the widget",
        required: true,
        type: "string",
      },
    ],
    responses: {
      "204": { description: "The Azure resource exists" },
      "404": { description: "The Azure resource is not found" },
      default: {
        description: "An unexpected error response.",
        schema: {
          $ref: "../../common-types/resource-management/v5/types.json#/definitions/ErrorResponse",
        },
      },
    },
  });
});

it("emits correct fixed union name parameter for resource", async () => {
  const openApi = await compileOpenAPI(
    `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is ProxyResource<WidgetProperties> {
       ...ResourceNameParameter<Widget, Type=WidgetNameType>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
       size: int32;
    }

    /** different type of widget used on resource path */
    union WidgetNameType {
      string,
      /** small widget */
      Small: "Small",
      /** large widget */        
      Large: "Large"
    }

    interface Widgets extends Operations {
      get is ArmResourceRead<Widget>;
    }
`,
    { preset: "azure" },
  );
  const getOperation =
    openApi.paths[
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}"
    ].get;
  ok(getOperation);
  deepEqual(getOperation.parameters[3], {
    description: "The name of the Widget",
    enum: ["Small", "Large"],
    "x-ms-enum": {
      modelAsString: true,
      name: "WidgetNameType",
      values: [
        {
          name: "Small",
          value: "Small",
          description: "small widget",
        },
        {
          name: "Large",
          value: "Large",
          description: "large widget",
        },
      ],
    },
    in: "path",
    name: "widgetName",
    required: true,
    type: "string",
  });
});

it("emits a scalar string with decorator parameter for resource", async () => {
  const openApi = await compileOpenAPI(
    `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is ProxyResource<WidgetProperties> {
       ...ResourceNameParameter<Widget, Type=WidgetNameType>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
       size: int32;
    }

    @minLength(1)
    @maxLength(10)
    @pattern("xxxxxx")
    scalar WidgetNameType extends string;

    interface Widgets extends Operations {
      get is ArmResourceRead<Widget>;
    }
`,
    { preset: "azure" },
  );
  const getOperation =
    openApi.paths[
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}"
    ].get;
  ok(getOperation);
  deepEqual(getOperation.parameters[3], {
    description: "The name of the Widget",
    in: "path",
    maxLength: 10,
    minLength: 1,
    name: "widgetName",
    pattern: "^[a-zA-Z0-9-]{3,24}$",
    required: true,
    type: "string",
  });
});

it("emits x-ms-azure-resource for resource with @azureResourceBase", async () => {
  const openApi = await compileOpenAPI(
    `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    @Azure.ResourceManager.Private.azureResourceBase
    model Widget {
       name: string;
    }
`,
    { preset: "azure" },
  );
  ok(openApi.definitions?.Widget["x-ms-azure-resource"]);
});

it("excludes properties marked @invisible from the resource payload", async () => {
  const openApi = await compileOpenAPI(
    `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is ProxyResource<WidgetProperties> {
      ...ResourceNameParameter<Widget, Type=WidgetNameType>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
      size: int32;

      @invisible(Lifecycle)
      hiddenProperty: string;
    }

    @minLength(1)
    @maxLength(10)
    @pattern("xxxxxx")
    scalar WidgetNameType extends string;

    interface Widgets extends Operations {
      get is ArmResourceRead<Widget>;
    }
  `,
    { preset: "azure" },
  );

  const Widget = openApi.definitions?.Widget;

  ok(Widget);

  strictEqual(Widget.type, "object");
  deepEqual(Widget.properties, {
    properties: {
      $ref: "#/definitions/WidgetProperties",
      description: "The resource-specific properties for this resource.",
    },
  });

  const WidgetProperties = openApi.definitions?.WidgetProperties;

  deepEqual(WidgetProperties, {
    type: "object",
    description: "The properties of a widget",
    properties: {
      size: {
        type: "integer",
        format: "int32",
      },
    },
    required: ["size"],
  });
});
