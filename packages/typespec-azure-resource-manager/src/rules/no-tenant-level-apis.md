Tenant-level ARM APIs are strongly discouraged because they operate outside subscription and
resource-group boundaries and require additional security review. Define resource operations at
subscription or resource-group scope whenever possible.

The rule reports every ARM `PUT` operation whose resolved route begins with `/providers`, except
operations whose route ends with `/operations`.

## Incorrect

```typespec
@armProviderNamespace
@service(#{ title: "Contoso service" })
namespace Microsoft.Contoso;

@put
@route("/providers/Microsoft.Contoso/settings/{settingName}")
op createOrUpdateSetting(@path settingName: string, @body setting: Setting): Setting;
```

## Correct

```typespec
@armProviderNamespace
@service(#{ title: "Contoso service" })
namespace Microsoft.Contoso;

@put
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/settings/{settingName}")
op createOrUpdateSetting(
  @path subscriptionId: string,
  @path resourceGroupName: string,
  @path settingName: string,
  @body setting: Setting,
): Setting;
```

## LintDiff Equivalent

This rule is the TypeSpec equivalent of the Swagger validator rule
[`TenantLevelAPIsNotAllowed`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/tenant-level-apis-not-allowed.md).
