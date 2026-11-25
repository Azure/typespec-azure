import "@typespec/http";
import "@typespec/rest";
import "@typespec/spector";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Rest;
using Versioning;
using Spector;
using Azure.ResourceManager;

/** Test for loading a unified YAML example and generating management-plane sample code. */
@armProviderNamespace("Microsoft.Example")
@service
@versioned(Versions)
@scenario
@scenarioDoc("""
  Generate management-plane sample code using the unified YAML example at examples.yaml.
  Do not set "examples-dir"; the scenario-local tspconfig.yaml enables discovery.
  Expected sample provenance: examples.yaml#list.
  List widgets in resource group test-rg, returning one widget named widget.
  """)
namespace Azure.ResourceManager.Example;

enum Versions {
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  v2022_12_01_preview: "2022-12-01-preview",
}

@@Azure.ClientGenerator.Core.clientNamespace(
  Azure.ResourceManager.Example,
  "azure.resourcemanager.example",
  "java"
);

@resource("widgets")
model Widget is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {
  description?: string;
}

@armResourceOperations
interface Widgets {
  listByResourceGroup is ArmResourceListByParent<Widget>;
}
