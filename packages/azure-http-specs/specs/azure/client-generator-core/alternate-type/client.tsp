import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Azure.ClientGenerator.Core;

@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.ExternalType.Feature,
  {
    identity: "geojson.Feature",
    package: "geojson",
    minVersion: "3.2.0",
  },
  "python"
);

@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.ExternalType.Feature,
  {
    identity: "com.bedatadriven.jackson.datatype.geo.Feature",
    package: "com.bedatadriven.jackson.datatype.geo",
    minVersion: "1.0.0",
  },
  "java"
);

@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.ExternalType.Feature,
  {
    identity: "NetTopologySuite.IO.GeoJSON.Feature",
    package: "NetTopologySuite.IO.GeoJSON",
    minVersion: "4.0.0",
  },
  "csharp"
);

@@alternateType(_Specs_.Azure.ClientGenerator.Core.AlternateType.ExternalType.Feature,
  {
    identity: "NetTopologySuite.IO.GeoJSON.Feature",
    package: "@types/geojson",
    minVersion: "7946.0.0",
  },
  "typescript"
);
