import {
  Diagnostic,
  DiagnosticCollector,
  NoTarget,
  SourceFile,
  createDiagnosticCollector,
  resolvePath,
} from "@typespec/compiler";
import { HttpStatusCodeRange } from "@typespec/http";
import { resolveOperationId } from "@typespec/openapi";
import {
  SdkAnyExample,
  SdkArrayExample,
  SdkArrayType,
  SdkBodyModelPropertyType,
  SdkClientType,
  SdkDictionaryExample,
  SdkDictionaryType,
  SdkHttpOperation,
  SdkHttpOperationExample,
  SdkHttpParameter,
  SdkHttpParameterExample,
  SdkHttpResponse,
  SdkHttpResponseExample,
  SdkModelExample,
  SdkModelPropertyType,
  SdkModelType,
  SdkNullExample,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkType,
  SdkTypeExample,
  SdkUnionExample,
  isSdkFloatKind,
  isSdkIntKind,
} from "./interfaces.js";
import { TCGCContext } from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";

interface LoadedExample {
  readonly relativePath: string;
  readonly file: SourceFile;
  readonly data: any;
}

async function loadExamples<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  client: SdkClientType<TServiceOperation>
): Promise<[Map<string, Record<string, LoadedExample>>, readonly Diagnostic[]]> {
  const diagnostics = createDiagnosticCollector();
  if (!context.examplesDirectory) {
    return diagnostics.wrap(new Map());
  }

  const allApiVersions = client.apiVersions;
  let apiVersion = context.apiVersion;
  if (apiVersion === "all") {
    return diagnostics.wrap(new Map());
  }
  if (apiVersion === "latest" || apiVersion === undefined || !allApiVersions.includes(apiVersion)) {
    apiVersion = allApiVersions[allApiVersions.length - 1];
  }

  const exampleDir = apiVersion
    ? resolvePath(context.examplesDirectory, apiVersion)
    : resolvePath(context.examplesDirectory);
  try {
    if (!(await context.program.host.stat(exampleDir)).isDirectory())
      return diagnostics.wrap(new Map());
  } catch (err) {
    diagnostics.add(
      createDiagnostic({
        code: "example-loading",
        messageId: "noDirectory",
        format: { directory: exampleDir },
        target: NoTarget,
      })
    );
    return diagnostics.wrap(new Map());
  }

  const map = new Map<string, Record<string, LoadedExample>>();
  const exampleFiles = await context.program.host.readDir(exampleDir);
  for (const fileName of exampleFiles) {
    try {
      const exampleFile = await context.program.host.readFile(resolvePath(exampleDir, fileName));
      const example = JSON.parse(exampleFile.text);
      if (!example.operationId || !example.title) {
        diagnostics.add(
          createDiagnostic({
            code: "example-loading",
            messageId: "noOperationId",
            format: { filename: fileName },
            target: NoTarget,
          })
        );
        continue;
      }

      if (!map.has(example.operationId)) {
        map.set(example.operationId.toLowerCase(), {});
      }
      const examples = map.get(example.operationId.toLowerCase())!;

      if (example.title in examples) {
        diagnostics.add(
          createDiagnostic({
            code: "duplicate-example-file",
            target: NoTarget,
            format: {
              filename: fileName,
              operationId: example.operationId,
              title: example.title,
            },
          })
        );
      }

      examples[example.title] = {
        relativePath: fileName,
        file: exampleFile,
        data: example,
      };
    } catch (err) {
      diagnostics.add(
        createDiagnostic({
          code: "example-loading",
          messageId: "default",
          format: { filename: fileName, error: err?.toString() ?? "" },
          target: NoTarget,
        })
      );
    }
  }
  return diagnostics.wrap(map);
}

export async function handleClientExamples(
  context: TCGCContext,
  client: SdkClientType<SdkServiceOperation>
): Promise<[void, readonly Diagnostic[]]> {
  const diagnostics = createDiagnosticCollector();

  const examples = diagnostics.pipe(await loadExamples(context, client));
  const methodQueue = [...client.methods];
  while (methodQueue.length > 0) {
    const method = methodQueue.pop()!;
    if (method.kind === "clientaccessor") {
      methodQueue.push(...method.response.methods);
    } else {
      const operationId = resolveOperationId(context.program, method.__raw!).toLowerCase();
      if (examples.has(operationId)) {
        diagnostics.pipe(handleMethodExamples(context, method, examples.get(operationId)!));
      }
    }
  }
  return diagnostics.wrap(undefined);
}

function handleMethodExamples<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  method: SdkServiceMethod<TServiceOperation>,
  examples: Record<string, LoadedExample>
): [void, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  if (method.operation.kind === "http") {
    diagnostics.pipe(handleHttpOperationExamples(method.operation, examples));
    if (method.operation.examples) {
      if (!context.__httpOperationExamples) {
        context.__httpOperationExamples = new Map();
      }
      context.__httpOperationExamples!.set(method.operation.__raw, method.operation.examples);
    }
  }

  return diagnostics.wrap(undefined);
}

function handleHttpOperationExamples(
  operation: SdkHttpOperation,
  examples: Record<string, LoadedExample>
) {
  const diagnostics = createDiagnosticCollector();
  operation.examples = [];

  for (const [title, example] of Object.entries(examples)) {
    const operationExample = {
      kind: "http",
      name: title,
      description: title,
      filePath: example.file.path,
      parameters: diagnostics.pipe(
        handleHttpParameters(
          operation.bodyParam
            ? [...operation.parameters, operation.bodyParam]
            : operation.parameters,
          example.data,
          example.relativePath
        )
      ),
      responses: diagnostics.pipe(
        handleHttpResponses(operation.responses, example.data, example.relativePath)
      ),
      rawExample: example.data,
    } as SdkHttpOperationExample;

    operation.examples.push(operationExample);
  }

  return diagnostics.wrap(undefined);
}

function handleHttpParameters(
  parameters: SdkHttpParameter[],
  example: any,
  relativePath: string
): [SdkHttpParameterExample[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const parameterExamples = [] as SdkHttpParameterExample[];
  if ("parameters" in example && typeof example.parameters === "object") {
    for (const name of Object.keys(example.parameters)) {
      const parameter = parameters.find(
        (p) => (p.kind !== "body" && p.serializedName === name) || p.name === name
      );
      if (parameter) {
        const value = diagnostics.pipe(
          getSdkTypeExample(parameter.type, example.parameters[parameter.name], relativePath)
        );
        if (value) {
          parameterExamples.push({
            parameter,
            value,
          });
        }
      } else {
        addExampleValueNoMappingDignostic(
          diagnostics,
          { [name]: example.parameters[name] },
          relativePath
        );
      }
    }
  }
  return diagnostics.wrap(parameterExamples);
}

function handleHttpResponses(
  responses: Map<number | HttpStatusCodeRange, SdkHttpResponse>,
  example: any,
  relativePath: string
): [Map<number, SdkHttpResponseExample>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const responseExamples = new Map<number, SdkHttpResponseExample>();
  if ("responses" in example && typeof example.responses === "object") {
    for (const code of Object.keys(example.responses)) {
      const statusCode = parseInt(code, 10);
      let found = false;
      for (const [responseCode, response] of responses.entries()) {
        if (responseCode === statusCode) {
          responseExamples.set(
            statusCode,
            diagnostics.pipe(handleHttpResponse(response, example.responses[code], relativePath))
          );
          found = true;
          break;
        } else if (
          typeof responseCode === "object" &&
          responseCode.start <= statusCode &&
          responseCode.end >= statusCode
        ) {
          responseExamples.set(
            statusCode,
            diagnostics.pipe(handleHttpResponse(response, example.responses[code], relativePath))
          );
          found = true;
          break;
        }
      }
      if (!found) {
        addExampleValueNoMappingDignostic(
          diagnostics,
          { [code]: example.responses[code] },
          relativePath
        );
      }
    }
  }
  return diagnostics.wrap(responseExamples);
}

function handleHttpResponse(
  response: SdkHttpResponse,
  example: any,
  relativePath: string
): [SdkHttpResponseExample, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const responseExample = {
    response,
    headers: [],
  } as SdkHttpResponseExample;
  if (typeof example === "object") {
    for (const name of Object.keys(example)) {
      if (name === "description") {
        continue;
      } else if (name === "body") {
        if (response.type) {
          responseExample.value = diagnostics.pipe(
            getSdkTypeExample(response.type, example.body, relativePath)
          );
        } else {
          addExampleValueNoMappingDignostic(diagnostics, { body: example.body }, relativePath);
        }
      } else if (name === "headers") {
        for (const subName of Object.keys(example.headers)) {
          const header = response.headers.find((p) => p.serializedName === subName);
          if (header) {
            const value = diagnostics.pipe(
              getSdkTypeExample(header.type, example[name][subName], relativePath)
            );
            if (value) {
              responseExample.headers.push({
                header,
                value,
              });
            }
          } else {
            addExampleValueNoMappingDignostic(
              diagnostics,
              { [subName]: example[name][subName] },
              relativePath
            );
          }
        }
      } else {
        addExampleValueNoMappingDignostic(diagnostics, { [name]: example[name] }, relativePath);
      }
    }
  }
  return diagnostics.wrap(responseExample);
}

function getSdkTypeExample(
  type: SdkType | SdkModelPropertyType,
  example: any,
  relativePath: string
): [SdkTypeExample | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  if (isSdkIntKind(type.kind) || isSdkFloatKind(type.kind)) {
    return getSdkBaseTypeExample("number", type as SdkType, example, relativePath);
  } else if (type.kind === "string" || type.kind === "bytes") {
    return getSdkBaseTypeExample("string", type as SdkType, example, relativePath);
  } else if (type.kind === "boolean") {
    return getSdkBaseTypeExample("boolean", type as SdkType, example, relativePath);
  } else if (
    type.kind === "password" ||
    type.kind === "guid" ||
    type.kind === "url" ||
    type.kind === "uri" ||
    type.kind === "ipAddress" ||
    type.kind === "uuid" ||
    type.kind === "ipV4Address" ||
    type.kind === "ipV6Address" ||
    type.kind === "eTag" ||
    type.kind === "armId" ||
    type.kind === "azureLocation" ||
    type.kind === "plainDate" ||
    type.kind === "plainTime"
  ) {
    return getSdkBaseTypeExample("string", type as SdkType, example, relativePath);
  } else if (type.kind === "nullable") {
    if (example === null) {
      return diagnostics.wrap({
        kind: "null",
        type,
        value: null,
      } as SdkNullExample);
    } else {
      return getSdkTypeExample(type.type, example, relativePath);
    }
  } else if (type.kind === "any") {
    return diagnostics.wrap({
      kind: "any",
      type,
      value: example,
    } as SdkAnyExample);
  } else if (type.kind === "constant") {
    if (example === type.value) {
      return getSdkBaseTypeExample(
        typeof type.value as "string" | "number" | "boolean",
        type,
        example,
        relativePath
      );
    } else {
      addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
      return diagnostics.wrap(undefined);
    }
  } else if (type.kind === "enum") {
    if (type.values.some((v) => v.value === example)) {
      return getSdkBaseTypeExample(
        typeof example as "string" | "number",
        type,
        example,
        relativePath
      );
    } else {
      addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
      return diagnostics.wrap(undefined);
    }
  } else if (type.kind === "enumvalue") {
    if (type.value === example) {
      return getSdkBaseTypeExample(
        typeof example as "string" | "number",
        type,
        example,
        relativePath
      );
    } else {
      addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
      return diagnostics.wrap(undefined);
    }
  } else if (
    type.kind === "utcDateTime" ||
    type.kind === "offsetDateTime" ||
    type.kind === "duration"
  ) {
    const inner = diagnostics.pipe(getSdkTypeExample(type.wireType, example, relativePath));
    if (inner) {
      inner.type = type;
    }
    return diagnostics.wrap(inner);
  } else if (type.kind === "union") {
    return diagnostics.wrap({
      kind: "union",
      type,
      value: example,
    } as SdkUnionExample);
  } else if (type.kind === "array") {
    return getSdkArrayExample(type, example, relativePath);
  } else if (type.kind === "dict") {
    return getSdkDictionaryExample(type, example, relativePath);
  } else if (type.kind === "model") {
    return getSdkModelExample(type, example, relativePath);
  }
  return diagnostics.wrap(undefined);
}

function getSdkBaseTypeExample(
  kind: "string" | "number" | "boolean",
  type: SdkType,
  example: any,
  relativePath: string
): [SdkTypeExample | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (typeof example === kind) {
    return diagnostics.wrap({
      kind,
      type,
      value: example,
    } as SdkTypeExample);
  } else {
    addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
  }
  return diagnostics.wrap(undefined);
}

function getSdkArrayExample(
  type: SdkArrayType,
  example: any,
  relativePath: string
): [SdkArrayExample | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (Array.isArray(example)) {
    const arrayExample = [] as SdkTypeExample[];
    for (const item of example) {
      const result = diagnostics.pipe(getSdkTypeExample(type.valueType, item, relativePath));
      if (result) {
        arrayExample.push(result);
      }
    }
    return diagnostics.wrap({
      kind: "array",
      type,
      value: arrayExample,
    } as SdkArrayExample);
  } else {
    addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
    return diagnostics.wrap(undefined);
  }
}

function getSdkDictionaryExample(
  type: SdkDictionaryType,
  example: any,
  relativePath: string
): [SdkDictionaryExample | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (typeof example === "object") {
    const dictionaryExample = {} as Record<string, SdkTypeExample>;
    for (const key of Object.keys(example)) {
      const result = diagnostics.pipe(
        getSdkTypeExample(type.valueType, example[key], relativePath)
      );
      if (result) {
        dictionaryExample[key] = result;
      }
    }
    return diagnostics.wrap({
      kind: "dict",
      type,
      value: dictionaryExample,
    } as SdkDictionaryExample);
  } else {
    addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
    return diagnostics.wrap(undefined);
  }
}

function getSdkModelExample(
  type: SdkModelType,
  example: any,
  relativePath: string
): [SdkModelExample | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (typeof example === "object") {
    // handle discriminated model
    if (type.discriminatorProperty) {
      if (
        type.discriminatorProperty.name in example &&
        example[type.discriminatorProperty.name] in type.discriminatedSubtypes!
      ) {
        return getSdkModelExample(
          type.discriminatedSubtypes![example[type.discriminatorProperty.name]],
          example,
          relativePath
        );
      } else {
        addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
        return diagnostics.wrap(undefined);
      }
    }

    let additionalPropertiesType: SdkType | undefined;
    const additionalProperties: Record<string, any> = new Map();
    const additionalPropertiesExample: Record<string, SdkTypeExample> = {};

    const properties: Map<string, SdkModelPropertyType> = new Map();
    const propertiesExample: Record<string, SdkTypeExample> = {};

    // get all properties type and additional properties type if exist
    const modelQueue = [type];
    while (modelQueue.length > 0) {
      const model = modelQueue.pop()!;
      for (let property of model.properties) {
        property = property as SdkBodyModelPropertyType;
        if (!properties.has(property.serializedName)) {
          properties.set(property.serializedName, property);
        }
      }
      if (model.additionalProperties && additionalPropertiesType === undefined) {
        additionalPropertiesType = model.additionalProperties;
      }
      if (model.baseModel) {
        modelQueue.push(model.baseModel);
      }
    }

    for (const name of Object.keys(example)) {
      const property = properties.get(name);
      if (property) {
        const result = diagnostics.pipe(
          getSdkTypeExample(property.type, example[name], relativePath)
        );
        if (result) {
          propertiesExample[name] = result;
        }
      } else {
        additionalProperties[name] = example[name];
      }
    }

    // handle additional properties
    if (Object.keys(additionalProperties).length > 0) {
      if (additionalPropertiesType) {
        for (const [name, value] of Object.entries(additionalProperties)) {
          const result = diagnostics.pipe(
            getSdkTypeExample(additionalPropertiesType, value, relativePath)
          );
          if (result) {
            additionalPropertiesExample[name] = result;
          }
        }
      } else {
        addExampleValueNoMappingDignostic(diagnostics, additionalProperties, relativePath);
      }
    }

    return diagnostics.wrap({
      kind: "model",
      type,
      value: propertiesExample,
      additionalProperties:
        Object.keys(additionalPropertiesExample).length > 0
          ? additionalPropertiesExample
          : undefined,
    } as SdkModelExample);
  } else {
    addExampleValueNoMappingDignostic(diagnostics, example, relativePath);
    return diagnostics.wrap(undefined);
  }
}

function addExampleValueNoMappingDignostic(
  diagnostics: DiagnosticCollector,
  value: any,
  relativePath: string
) {
  diagnostics.add(
    createDiagnostic({
      code: "example-value-no-mapping",
      target: NoTarget,
      format: {
        value: JSON.stringify(value),
        relativePath,
      },
    })
  );
}
