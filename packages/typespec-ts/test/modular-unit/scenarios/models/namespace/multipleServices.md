# Should trim a namespace shared by multiple services

This scenario verifies that only the namespace shared by all services is removed.

## TypeSpec

```tsp
import "@typespec/http";

using TypeSpec.Http;

namespace Service.MultipleServices;

@service
namespace ServiceA {
  model ModelA {
    value: string;
  }

  @get
  op getA(): ModelA;
}

@service
namespace ServiceB {
  model ModelB {
    value: string;
  }

  @get
  op getB(): ModelB;
}
```

```yaml
withRawContent: true
```

## Model files

```ts models
/** This file path is /models/serviceA/models.ts */

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface ModelA */
export interface ModelA {
  value: string;
}

export function modelADeserializer(item: any): ModelA {
  return {
    value: item["value"],
  };
}

/** This file path is /models/serviceB/models.ts */

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface ModelB */
export interface ModelB {
  value: string;
}

export function modelBDeserializer(item: any): ModelB {
  return {
    value: item["value"],
  };
}
```

# Should trim a single service namespace

This scenario verifies that a single service namespace is removed from model paths.

## TypeSpec

```tsp
import "@typespec/http";

using TypeSpec.Http;

@service
namespace Contoso.Compute {
  model RootModel {
    value: string;
  }

  namespace VirtualMachines {
    model NestedModel {
      value: string;
    }
  }

  @get
  @route("/root")
  op getRoot(): RootModel;

  @get
  @route("/nested")
  op getNested(): VirtualMachines.NestedModel;
}
```

```yaml
withRawContent: true
```

## Model files

```ts models
/** This file path is /models/models.ts */

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface RootModel */
export interface RootModel {
  value: string;
}

export function rootModelDeserializer(item: any): RootModel {
  return {
    value: item["value"],
  };
}

/** This file path is /models/virtualMachines/models.ts */

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface NestedModel */
export interface NestedModel {
  value: string;
}

export function nestedModelDeserializer(item: any): NestedModel {
  return {
    value: item["value"],
  };
}
```

# Should preserve unrelated top-level service namespaces

This scenario verifies that unrelated top-level service namespaces remain in model paths.

## TypeSpec

```tsp
import "@typespec/http";

using TypeSpec.Http;

@service
namespace ServiceA {
  model ModelA {
    value: string;
  }

  @get
  op getA(): ModelA;
}

@service
namespace ServiceB {
  model ModelB {
    value: string;
  }

  @get
  op getB(): ModelB;
}
```

```yaml
withRawContent: true
```

## Model files

```ts models
/** This file path is /models/serviceA/models.ts */

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface ModelA */
export interface ModelA {
  value: string;
}

export function modelADeserializer(item: any): ModelA {
  return {
    value: item["value"],
  };
}

/** This file path is /models/serviceB/models.ts */

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface ModelB */
export interface ModelB {
  value: string;
}

export function modelBDeserializer(item: any): ModelB {
  return {
    value: item["value"],
  };
}
```
