import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Azure.ClientGenerator.Core;

// Python: reference from the generated common-types package
@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef.Address,
  {
    identity: "common_types.models.Address",
    package: "common-types",
    minVersion: "1.0.0",
  },
  "python"
);

// Java: reference from the generated common-types package
@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef.Address,
  {
    identity: "com.azure.common.types.models.Address",
    package: "com.azure.common-types",
    minVersion: "1.0.0",
  },
  "java"
);

// C#: reference from the generated common-types package
@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef.Address,
  {
    identity: "CommonTypes.Models.Address",
    package: "CommonTypes",
    minVersion: "1.0.0",
  },
  "csharp"
);

// TypeScript: reference from the generated common-types package
@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef.Address,
  {
    identity: "Address",
    package: "common-types",
    minVersion: "1.0.0",
  },
  "typescript"
);

// Go: reference from the generated common-types package
@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef.Address,
  {
    identity: "commontypes.Address",
    package: "github.com/Azure/azure-sdk-for-go/sdk/common-types",
    minVersion: "1.0.0",
  },
  "go"
);
