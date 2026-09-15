/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as naming from "../../naming/naming.js";
import { CodegenError } from "./errors.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

// represents the generated content for an example
export class ExampleContent {
  readonly name: string;
  readonly content: string;

  constructor(name: string, content: string) {
    this.name = name;
    this.content = content;
  }
}

/**
 * Creates the content for all the *_example_test.go files.
 *
 * @param pkg contains the package content
 * @param target the codegen target for the module
 * @param options the emitter options
 * @returns the text for the files or the empty string
 */
export function generateExamples(
  pkg: go.TestPackage,
  target: go.CodeModelType,
  options: go.Options,
): Array<ExampleContent> {
  // generate examples
  const examples = new Array<ExampleContent>();
  if (pkg.src.clients.length === 0) {
    return examples;
  }

  const azureARM = target === "azure-arm";

  for (const client of pkg.src.clients) {
    // client must be constructable to create a sample
    if (client.instance?.kind !== "constructable") {
      continue;
    }
    const imports = new ImportManager(pkg);
    // the list of packages to import
    if (client.methods.length > 0) {
      // add standard imports for clients with methods.
      // clients that are purely hierarchical (i.e. having no APIs) won't need them.
      imports.add("context");
      imports.add("log");
      imports.add("github.com/Azure/azure-sdk-for-go/sdk/azidentity");
      imports.addForPkg(pkg.src);
    }

    let clientFactoryParams: Array<go.ClientParameter>;
    if (options["factory-gather-all-params"]) {
      clientFactoryParams = helpers.getAllClientParameters(pkg.src, target);
    } else {
      clientFactoryParams = helpers.getCommonClientParameters(pkg.src, target);
    }
    const clientFactoryParamsMap = new Map<string, go.ClientParameter>();
    for (const param of clientFactoryParams) {
      clientFactoryParamsMap.set(param.name, param);
    }

    let exampleText = "";
    for (const method of client.methods) {
      for (const example of method.examples) {
        const indent = new helpers.Indentation();
        // function signature
        exampleText += `// Generated from example definition: ${example.filePath}\n`;
        const exampleFuncNamePrefix =
          method.examples.length > 1 ? `_${helpers.camelCase(example.name)}` : "";
        exampleText += `func Example${client.name}_${helpers.fixUpMethodName(method)}${exampleFuncNamePrefix}() {\n`;

        // create credential
        exampleText += `${indent.get()}cred, err := azidentity.NewDefaultAzureCredential(nil)\n`;
        exampleText += `${indent.get()}if err != nil {\n`;
        exampleText += `${indent.push().get()}log.Fatalf("failed to obtain a credential: %v", err)\n`;
        exampleText += `${indent.pop().get()}}\n`;

        // create context
        exampleText += `${indent.get()}ctx := context.Background()\n`;

        // create client
        const clientParameters: go.ParameterExample[] = [];
        for (const param of method.parameters) {
          if (param.location === "client") {
            if (go.isLiteralParameter(param.style)) {
              continue;
            }
            const clientParam = example.parameters.find((p) => p.parameter.name === param.name);
            if (clientParam) {
              clientParameters.push(clientParam);
            }
          }
        }
        // TODO: client optional parameters

        let clientRef: string;
        if (azureARM) {
          // since not all operation has all the client factory required parameters, we need to fake for the missing ones
          const clientFactoryParamsExample: go.ParameterExample[] = [];
          for (const clientParam of clientFactoryParams) {
            const clientFactoryParam = clientParameters.find(
              (p) => p.parameter.name === clientParam.name,
            );
            if (clientFactoryParam) {
              clientFactoryParamsExample.push(clientFactoryParam);
            } else {
              clientFactoryParamsExample.push({
                parameter: clientParam,
                value: generateFakeExample(clientParam.type, clientParam.name),
              });
            }
          }
          exampleText += `${indent.get()}clientFactory, err := ${go.getPackageName(pkg.src)}.NewClientFactory(${clientFactoryParamsExample.map((p) => getExampleValue(pkg, p.value, "\t", imports, p.parameter.type.kind !== "ptr")).join(", ")}, nil)\n`;
          exampleText += `${indent.get()}if err != nil {\n`;
          exampleText += `${indent.push().get()}log.Fatalf("failed to create client: %v", err)\n`;
          exampleText += `${indent.pop().get()}}\n`;
          clientRef = `clientFactory.${client.instance.constructors[0].name}(`;
          // since not all operations have all the client constructor required parameters, we need to generate fake values for the missing ones
          const clientPrivateParameters: go.ParameterExample[] = [];
          for (const ctorParam of client.instance.constructors[0].parameters) {
            if (clientFactoryParamsMap.has(ctorParam.name) || go.isAPIVersionParameter(ctorParam)) {
              continue;
            }
            const existingParam = clientParameters.find((p) => p.parameter.name === ctorParam.name);
            if (existingParam) {
              clientPrivateParameters.push(existingParam);
            } else {
              clientPrivateParameters.push({
                parameter: ctorParam,
                value: generateFakeExample(ctorParam.type, ctorParam.name),
              });
            }
          }
          if (clientPrivateParameters.length > 0) {
            clientRef += `${clientPrivateParameters.map((p) => getExampleValue(pkg, p.value, "\t", imports, p.parameter.type.kind !== "ptr").slice(1)).join(", ")}`;
          }
          clientRef += `)`;
        } else {
          exampleText += `${indent.get()}client, err := ${go.getPackageName(client.instance.constructors[0].pkg)}.${client.instance.constructors[0].name}(${clientParameters.map((p) => getExampleValue(pkg, p.value, "\t", imports, p.parameter.type.kind !== "ptr").slice(1)).join(", ")}, cred, nil)\n`;
          exampleText += `${indent.get()}if err != nil {\n`;
          exampleText += `${indent.push().get()}log.Fatalf("failed to create client: %v", err)\n`;
          exampleText += `${indent.pop().get()}}\n`;
          clientRef = "client";
        }

        // call method, using getMethodParameters for correct ordering (including required param groups)
        const renderedParams: string[] = [];
        for (const methodParam of helpers.getMethodParameters(method)) {
          if (methodParam.kind === "paramGroup") {
            if (methodParam === method.optionalParamsGroup) continue;
            imports.addForPkg(methodParam.pkg);
            const fieldTexts: string[] = [];
            for (const groupParam of methodParam.params) {
              if (!shouldRenderParam(groupParam, example)) continue;
              fieldTexts.push(
                `${naming.capitalize(groupParam.name)}: ${getParamExampleValue(pkg, groupParam, example, imports)}`,
              );
            }
            renderedParams.push(
              `${go.getPackageName(methodParam.pkg)}.${methodParam.groupName}{${fieldTexts.join(", ")}}`,
            );
          } else {
            if (!shouldRenderParam(methodParam, example)) continue;
            renderedParams.push(getParamExampleValue(pkg, methodParam, example, imports));
          }
        }

        const methodOptionalParameters = example.optionalParamsGroup.filter(
          (p) => p.parameter.location === "method",
        );
        const checkResponse = example.responseEnvelope !== undefined;

        let methodOptionalParametersText = "nil";
        if (methodOptionalParameters.length > 0) {
          methodOptionalParametersText = `&${go.getPackageName(method.optionalParamsGroup.pkg)}.${method.optionalParamsGroup.groupName}{\n`;
          methodOptionalParametersText += methodOptionalParameters
            .map(
              (p) =>
                `${naming.capitalize(p.parameter.name)}: ${getExampleValue(pkg, p.value, "\t", imports, isParamByValue(p)).slice(1)}`,
            )
            .join(",\n");
          methodOptionalParametersText += `}`;
        }

        switch (method.kind) {
          case "lroMethod":
          case "lroPageableMethod":
            exampleText += `${indent.get()}poller, err := ${clientRef}.${helpers.fixUpMethodName(method)}(ctx, ${renderedParams.join(", ")}${renderedParams.length > 0 ? ", " : ""}${methodOptionalParametersText.split("\n").join("\n" + indent.get())})\n`;
            exampleText += `${indent.get()}if err != nil {\n`;
            exampleText += `${indent.push().get()}log.Fatalf("failed to finish the request: %v", err)\n`;
            exampleText += `${indent.pop().get()}}\n`;

            exampleText += `${indent.get()}${checkResponse ? "res" : "_"}, err ${checkResponse ? ":=" : "="} poller.PollUntilDone(ctx, nil)\n`;
            exampleText += `${indent.get()}if err != nil {\n`;
            exampleText += `${indent.push().get()}log.Fatalf("failed to poll the result: %v", err)\n`;
            exampleText += `${indent.pop().get()}}\n`;
            break;
          case "method":
            exampleText += `${indent.get()}${checkResponse ? "res" : "_"}, err ${checkResponse ? ":=" : "="} ${clientRef}.${helpers.fixUpMethodName(method)}(ctx, ${renderedParams.join(", ")}${renderedParams.length > 0 ? ", " : ""}${methodOptionalParametersText.split("\n").join("\n" + indent.get())})\n`;
            exampleText += `${indent.get()}if err != nil {\n`;
            exampleText += `${indent.push().get()}log.Fatalf("failed to finish the request: %v", err)\n`;
            exampleText += `${indent.pop().get()}}\n`;
            break;
          case "pageableMethod":
            exampleText += `${indent.get()}pager := ${clientRef}.${helpers.fixUpMethodName(method)}(${renderedParams.join(", ")}${renderedParams.length > 0 ? ", " : ""}${methodOptionalParametersText.split("\n").join("\n" + indent.get())})\n`;
            break;
          default:
            method satisfies never;
        }

        // check response
        if (
          (method.kind === "lroPageableMethod" || method.kind === "pageableMethod") &&
          example.responseEnvelope
        ) {
          let resultName = "pager";
          if (method.kind === "lroPageableMethod") {
            resultName = "res";
          }
          const itemType = (
            (method as go.PageableMethod).returns.result as go.ModelResult
          ).modelType.fields.find((f) => f.type.kind === "slice")!;
          exampleText += `${indent.get()}for ${resultName}.More() {\n`;
          exampleText += `${indent.push().get()}page, err := ${resultName}.NextPage(ctx)\n`;
          exampleText += `${indent.get()}if err != nil {\n`;
          exampleText += `${indent.push().get()}log.Fatalf("failed to advance page: %v", err)\n`;
          exampleText += `${indent.pop().get()}}\n`;
          exampleText += `${indent.get()}for _, v := range page.${itemType.name} {\n`;
          exampleText += `${indent.push().get()}// You could use page here. We use blank identifier for just demo purposes.\n`;
          exampleText += `${indent.get()}_ = v\n`;
          exampleText += `${indent.pop().get()}}\n`;
          exampleText += `${indent.get()}// If the HTTP response code is 200 as defined in example definition, your page structure would look as follows. Please pay attention that all the values in the output are fake values for just demo purposes.\n`;
          exampleText += `${indent.get()}// page = ${go.getPackageName(example.responseEnvelope.response.method.receiver.type.pkg)}.${example.responseEnvelope.response.name}{\n`;
          for (const header of example.responseEnvelope.headers ?? []) {
            exampleText += `${indent.get()}// \t${header.header.fieldName}: ${getExampleValue(
              pkg,
              header.value,
              "",
              undefined,
              (header.header as any).byValue,
            )
              .split("\n")
              .join(`\n${indent.get()}// \t`)},\n`;
          }
          exampleText += `${indent.get()}// \t${(example.responseEnvelope.result.type as go.Model).name}: ${getExampleValue(pkg, example.responseEnvelope.result!, "", undefined, true).split("\n").join(`\n${indent.get()}// \t`)},\n`;
          exampleText += `${indent.get()}// }\n`;
          exampleText += `${indent.pop().get()}}\n`;
        } else if (example.responseEnvelope) {
          // if has fieldName, then the result is not a model type
          const fieldName = (method.returns.result as any)?.fieldName;
          exampleText += `${indent.get()}// You could use response here. We use blank identifier for just demo purposes.\n`;
          exampleText += `${indent.get()}_ = res\n`;

          exampleText += `${indent.get()}// If the HTTP response code is 200 as defined in example definition, your response structure would look as follows. Please pay attention that all the values in the output are fake values for just demo purposes.\n`;
          exampleText += `${indent.get()}// res = ${go.getPackageName(example.responseEnvelope.response.method.receiver.type.pkg)}.${example.responseEnvelope.response.name}{\n`;
          for (const header of example.responseEnvelope?.headers ?? []) {
            exampleText += `${indent.get()}// \t${header.header.fieldName}: ${getExampleValue(
              pkg,
              header.value,
              "",
              undefined,
              (header.header as any).byValue,
            )
              .split("\n")
              .join(`\n${indent.get()}// \t`)},\n`;
          }
          if (example.responseEnvelope?.result) {
            // modelResult and polymorphicResult are anonymously embedded by value in the response struct.
            // monomorphicResult has an explicit byValue property. all other result types default to by value.
            let resultByValue = true;
            let resultFieldName = fieldName
              ? fieldName
              : (example.responseEnvelope?.result.type as go.Model).name;
            if (method.returns.result?.kind === "monomorphicResult") {
              resultByValue = method.returns.result.monomorphicType.kind !== "ptr";
            } else if (method.returns.result?.kind === "polymorphicResult") {
              resultFieldName = method.returns.result.interface.name;
              resultByValue = false;
            }
            exampleText += `${indent.get()}// \t${resultFieldName}: ${getExampleValue(pkg, example.responseEnvelope.result, "", undefined, resultByValue).split("\n").join(`\n${indent.get()}// \t`)},\n`;
          }
          exampleText += `${indent.get()}// }\n`;
        }
        exampleText += `}\n\n`;
      }
    }

    // if no example, then do not generate example file
    if (exampleText === "") continue;

    // stitch it all together
    let text = helpers.contentPreamble(pkg);
    text += imports.text();
    text += exampleText;
    examples.push(new ExampleContent(client.name, text));
  }
  return examples;
}

function getExampleValue(
  pkg: go.TestPackage,
  example: go.ExampleType,
  indent: string,
  imports?: ImportManager,
  byValue: boolean = false,
  inArray: boolean = false,
): string {
  switch (example.kind) {
    case "string": {
      let exampleText = `"${escapeString(example.value)}"`;
      if (example.type.kind === "constant") {
        exampleText = getConstantValue(pkg, example.type, example.value);
      } else if (example.type.kind === "time") {
        exampleText = getTimeValue(example.type, example.value, imports);
      } else if (example.type.kind === "encodedBytes") {
        exampleText = `[]byte("${escapeString(example.value)}")`;
      } else if (example.type.kind === "literal" && example.type.type.kind === "constant") {
        exampleText = getConstantValue(
          pkg,
          example.type.type,
          (<go.ConstantValue>example.type.literal).value,
        );
      } else if (example.type.kind === "etag") {
        imports?.add(example.type.module);
        exampleText = `${go.getTypeDeclaration(example.type, pkg)}("${escapeString(example.value)}")`;
      } else if (go.isScalar(example.type, "byte")) {
        exampleText = `io.NopCloser(bytes.NewReader([]byte("${escapeString(example.value)}")))`;
      } else if (example.type.kind === "readSeekCloser") {
        imports?.add("bytes");
        imports?.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");
        exampleText = `streaming.NopCloser(bytes.NewReader([]byte("${escapeString(example.value)}")))`;
      }
      return `${indent}${getPointerValue(example.type, exampleText, byValue, imports)}`;
    }
    case "number": {
      let exampleText = `${example.value}`;
      switch (example.type.kind) {
        case "constant":
          exampleText = `${indent}${getConstantValue(pkg, example.type, example.value)}`;
          break;
        case "time":
          exampleText = getTimeValue(example.type, example.value, imports);
          break;
      }
      return `${indent}${getPointerValue(example.type, exampleText, byValue, imports)}`;
    }
    case "boolean": {
      let exampleText = `${example.value}`;
      if (example.type.kind === "constant") {
        exampleText = `${indent}${getConstantValue(pkg, example.type, example.value)}`;
      }
      return `${indent}${getPointerValue(example.type, exampleText, byValue, imports)}`;
    }
    case "null":
      return `${indent}nil`;
    case "any":
      return jsonToGo(example.value, indent);
    case "array": {
      const isElementByValue = example.type.elementType.kind !== "ptr";
      // if polymorphic, need to add type name in array, so inArray will be set to false
      // if other case, no need to add type name in array, so inArray will be set to true
      const isElementPolymorphic = example.type.elementType.kind === "interface";
      let exampleText = `${indent}${getRef(byValue)}${go.getTypeDeclaration(example.type, pkg)}{\n`;
      for (const element of example.value) {
        exampleText += `${getExampleValue(pkg, element, indent + "\t", imports, isElementByValue && !isElementPolymorphic, !isElementPolymorphic)},\n`;
      }
      exampleText += `${indent}}`;
      return exampleText;
    }
    case "dictionary": {
      let exampleText = `${indent}${getRef(byValue)}${go.getTypeDeclaration(example.type, pkg)}{\n`;
      const isValueByValue = example.type.valueType.kind !== "ptr";
      const isValuePolymorphic = example.type.valueType.kind === "interface";
      for (const key in example.value) {
        exampleText += `${indent}\t"${key}": ${getExampleValue(pkg, example.value[key], indent + "\t", imports, isValueByValue && !isValuePolymorphic).slice(indent.length + 1)},\n`;
      }
      exampleText += `${indent}}`;
      return exampleText;
    }
    case "model": {
      let exampleText = `${indent}${getRef(byValue)}${go.getTypeDeclaration(example.type, pkg)}{\n`;
      if (inArray) {
        exampleText = `${indent}{\n`;
      }
      for (const field in example.value) {
        const goField = example.type.fields.find((f) => f.name === field)!;
        const isFieldByValue = goField.type.kind !== "ptr";
        const isFieldPolymorphic = goField.type.kind === "interface";
        exampleText += `${indent}\t${field}: ${getExampleValue(pkg, example.value[field], indent + "\t", imports, isFieldByValue && !isFieldPolymorphic).slice(indent.length + 1)},\n`;
      }
      if (example.additionalProperties) {
        const additionalPropertiesField = example.type.fields.find((f) =>
          go.isAdditionalProperties(f),
        )!;
        const isAdditionalPropertiesFieldByValue =
          additionalPropertiesField.type.valueType.kind !== "ptr";
        const isAdditionalPropertiesPolymorphic =
          additionalPropertiesField.type.valueType.kind === "interface";
        exampleText += `${indent}\t${additionalPropertiesField.name}: ${getRef(isAdditionalPropertiesFieldByValue)}${go.getTypeDeclaration(additionalPropertiesField.type, pkg)}{\n`;
        for (const key in example.additionalProperties) {
          exampleText += `${indent}\t"${key}": ${getExampleValue(pkg, example.additionalProperties[key], indent + "\t", imports, isAdditionalPropertiesFieldByValue && !isAdditionalPropertiesPolymorphic).slice(indent.length + 1)},\n`;
        }
        exampleText += `${indent}},\n`;
      }
      exampleText += `${indent}}`;
      return exampleText;
    }
    case "tokenCredential":
      return example.value;
  }
}

function getRef(byValue: boolean): string {
  return byValue ? "" : "&";
}

function getConstantValue(pkg: go.TestPackage, type: go.Constant, value: any): string {
  for (const constantValue of type.values) {
    if (constantValue.value === value) {
      return go.getTypeDeclaration(constantValue, pkg);
    }
  }
  switch (type.type) {
    case "string":
      return `${go.getTypeDeclaration(type, pkg)}("${value}")`;
    default:
      return `${go.getTypeDeclaration(type, pkg)}(${value})`;
  }
}

// month names indexed by (month - 1), mapped to Go's time.Month constants so an
// example datetime can be emitted as a readable time.Date(...) literal instead of
// leaking the wire format into a time.Parse call.
const goMonthConstants = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthNameToNumber: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

interface TimeComponents {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  nanosecond: number;
  /** minutes east of UTC carried by the wire value (0 for Z/GMT/zoneless formats) */
  offsetMinutes: number;
}

// converts an optional fractional-seconds string (for example "123") into
// nanoseconds by right-padding to nine digits.
function fractionalToNanoseconds(fraction: string | undefined): number {
  if (!fraction) {
    return 0;
  }
  return Number((fraction + "000000000").slice(0, 9));
}

// folds a wall-clock time carrying a UTC offset into UTC. offsets are always
// whole minutes, so the sub-second component is unaffected and nanosecond
// fidelity is preserved.
function foldOffsetToUTC(components: TimeComponents): TimeComponents {
  if (components.offsetMinutes === 0) {
    return components;
  }
  const utc = new Date(
    Date.UTC(
      components.year,
      components.month - 1,
      components.day,
      components.hour,
      components.minute,
      components.second,
    ) -
      components.offsetMinutes * 60000,
  );
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    hour: utc.getUTCHours(),
    minute: utc.getUTCMinutes(),
    second: utc.getUTCSeconds(),
    nanosecond: components.nanosecond,
    offsetMinutes: 0,
  };
}

// parses an example datetime wire value into its components (preserving any wire
// offset) based on the Go serde format. returns undefined when the value doesn't
// match the expected shape so the caller can fall back to a placeholder (examples
// are illustrative, not production code).
function parseExampleTime(format: go.Time["format"], value: string): TimeComponents | undefined {
  switch (format) {
    case "RFC3339": {
      const m =
        /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(
          value,
        );
      if (m) {
        let offsetMinutes = 0;
        if (m[8]) {
          offsetMinutes = (Number(m[9]) * 60 + Number(m[10])) * (m[8] === "-" ? -1 : 1);
        }
        return {
          year: Number(m[1]),
          month: Number(m[2]),
          day: Number(m[3]),
          hour: Number(m[4]),
          minute: Number(m[5]),
          second: Number(m[6]),
          nanosecond: fractionalToNanoseconds(m[7]),
          offsetMinutes,
        };
      }
      break;
    }
    case "RFC7231":
    case "RFC1123": {
      // RFC7231 (IMF-fixdate) and RFC1123 share the "Wdy, DD Mon YYYY HH:MM:SS GMT"
      // grammar; the weekday prefix is optional and the zone is treated as UTC
      // (a rare numeric offset is preserved).
      const m =
        /^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([A-Za-z]+|[+-]\d{4})$/.exec(
          value,
        );
      if (m) {
        const monthName = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
        const month = monthNameToNumber[monthName];
        if (month) {
          let offsetMinutes = 0;
          const numericOffset = /^([+-])(\d{2})(\d{2})$/.exec(m[7]);
          if (numericOffset) {
            offsetMinutes =
              (Number(numericOffset[2]) * 60 + Number(numericOffset[3])) *
              (numericOffset[1] === "-" ? -1 : 1);
          }
          return {
            year: Number(m[3]),
            month,
            day: Number(m[1]),
            hour: Number(m[4]),
            minute: Number(m[5]),
            second: Number(m[6]),
            nanosecond: 0,
            offsetMinutes,
          };
        }
      }
      break;
    }
    case "PlainDate": {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (m) {
        return {
          year: Number(m[1]),
          month: Number(m[2]),
          day: Number(m[3]),
          hour: 0,
          minute: 0,
          second: 0,
          nanosecond: 0,
          offsetMinutes: 0,
        };
      }
      break;
    }
    case "PlainTime": {
      const m = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(value);
      if (m) {
        // mirrors time.Parse(time.TimeOnly, ...), which yields the zero date.
        return {
          year: 0,
          month: 1,
          day: 1,
          hour: Number(m[1]),
          minute: Number(m[2]),
          second: Number(m[3]),
          nanosecond: fractionalToNanoseconds(m[4]),
          offsetMinutes: 0,
        };
      }
      break;
    }
  }
  return undefined;
}

// emits an example datetime as a readable time.Date(...) literal (or time.Unix(...)
// for epoch timestamps) rather than a time.Parse call that would leak the wire
// format into the generated sample. utcDateTime (and the inherently-UTC formats)
// are normalized to time.UTC; offsetDateTime preserves its wire offset via a
// time.FixedZone so the zone-bearing instant round-trips unchanged.
function getTimeValue(type: go.Time, value: any, imports?: ImportManager): string {
  imports?.add("time");
  if (type.format === "Unix") {
    // unixTimestamp is absolute epoch seconds; there's no wire-format string to leak.
    // no .UTC(): the SDK never requires callers to normalize time.Time, and the Unix
    // marshaler ignores the zone anyway, so a sample must not imply the coercion is needed.
    return `time.Unix(${Math.trunc(Number(value))}, 0)`;
  }
  const c = parseExampleTime(type.format, String(value));
  if (!c) {
    // examples are illustrative, not production code: if the value doesn't match the
    // expected wire shape, fall back to a placeholder rather than failing the build.
    return "time.Time{}";
  }
  // offsetDateTime (utc === false) preserves the authored offset; everything else
  // (utcDateTime, RFC7231/GMT, plain date/time) is normalized to UTC.
  if (!type.utc && c.offsetMinutes !== 0) {
    return `time.Date(${c.year}, time.${goMonthConstants[c.month - 1]}, ${c.day}, ${c.hour}, ${c.minute}, ${c.second}, ${c.nanosecond}, time.FixedZone("", ${c.offsetMinutes * 60}))`;
  }
  const utc = foldOffsetToUTC(c);
  return `time.Date(${utc.year}, time.${goMonthConstants[utc.month - 1]}, ${utc.day}, ${utc.hour}, ${utc.minute}, ${utc.second}, ${utc.nanosecond}, time.UTC)`;
}

function getPointerValue(
  type: go.WireType,
  valueString: string,
  byValue: boolean,
  imports?: ImportManager,
): string {
  if (byValue) {
    return valueString;
  }

  switch (type.kind) {
    case "any":
    case "constant":
    case "constantDef":
    case "etag":
    case "string":
    case "time":
      if (imports) imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/to");
      return `to.Ptr(${valueString})`;
    case "literal":
      // unwrap the literal and delegate to the inner type's case
      return getPointerValue(type.type as go.WireType, valueString, byValue, imports);
    case "scalar": {
      if (type.type === "byte") {
        return valueString;
      }
      let prtType: string;
      switch (type.type) {
        case `bool`:
        case `rune`:
          prtType = "Ptr";
          break;
        default:
          prtType = `Ptr[${type.type}]`;
      }
      if (imports) imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/to");
      return `to.${prtType}(${valueString})`;
    }
    case "readSeekCloser":
      return valueString;
    default:
      return `&${valueString}`;
  }
}

function jsonToGo(value: any, indent: string): string {
  if (typeof value === "string") {
    return `${indent}"${escapeString(value)}"`;
  } else if (typeof value === "number" || typeof value === "bigint") {
    return `${indent}${value}`;
  } else if (typeof value === "boolean") {
    return `${indent}${value}`;
  } else if (typeof value === "undefined") {
    return `${indent}nil`;
  } else if (typeof value === "object") {
    if (value === null) {
      return `${indent}nil`;
    } else if (Array.isArray(value)) {
      let result = `${indent}[]any{\n`;
      for (const item of value) {
        result += `${jsonToGo(item, indent + "\t")},\n`;
      }
      result += `${indent}}`;
      return result;
    } else {
      let result = `${indent}map[string]any{\n`;
      for (const key in value) {
        result += `${indent}\t"${key}": ${jsonToGo(value[key], indent + "\t").slice(indent.length + 1)},\n`;
      }
      result += `${indent}}`;
      return result;
    }
  }
  return "";
}

function generateFakeExample(goType: go.Type, name?: string): go.ExampleType {
  switch (goType.kind) {
    case "any":
      return new go.NullExample(goType);
    case "constant":
      switch (goType.type) {
        case "bool":
          return new go.BooleanExample(goType.values[0].value as boolean, goType);
        case "string":
          return new go.StringExample(goType.values[0].value as string, goType);
        default:
          return new go.NumberExample(goType.values[0].value as number, goType);
      }
    case "literal":
      return new go.StringExample(<string>goType.literal, goType);
    case "scalar":
      switch (goType.type) {
        case "bool":
          return new go.BooleanExample(false, goType);
        case "byte":
        case "rune":
          return new go.StringExample(`<${name ?? "test"}>`, goType);
        default:
          return new go.NumberExample(0, goType);
      }
    case "string":
      return new go.StringExample(`<${name ?? "test"}>`, goType);
    case "tokenCredential":
      // we hard code the credential var name to cred
      return new go.TokenCredentialExample("cred");
    case "encodedBytes":
      return new go.StringExample(`<${name ?? "test"}>`, goType);
    case "time":
      // use a placeholder date value for time types
      return new go.StringExample("2006-01-02T15:04:05Z", goType);
    case "etag":
      return new go.StringExample(`<${name ?? "etag"}>`, goType);
    case "model":
    case "polymorphicModel":
      // return an empty struct example for model types
      return new go.StructExample(goType);
    case "slice":
      // return an empty array example for slice types
      return new go.ArrayExample(goType);
    case "map":
      // return an empty map example for map types
      return new go.DictionaryExample(goType);
    case "interface":
      // for interface types, use the root type (which is a PolymorphicModel) to create an example
      return new go.StructExample(goType.rootType);
    default:
      throw new CodegenError("InternalError", `unhandled fake example kind ${goType.kind}`);
  }
}

function escapeString(str: string): string {
  return str
    .split("\\")
    .join("\\\\")
    .split('"')
    .join('\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * returns true if the parameter's example value should be passed by value,
 * false if it should be passed by reference. For interface parameters,
 * it returns false when passing concrete types to ensure the example value
 * is passed by reference for Go interface satisfaction via pointer receivers,
 * even when the parameter style is byValue.
 * @param p the parameter example to check
 * @returns true if the parameter's example value should be passed by value, false if it should be passed by reference
 */
function isParamByValue(p: go.ParameterExample): boolean {
  switch (p.parameter.type.kind) {
    case "interface":
      return p.value.kind === "null";
    default:
      return p.parameter.type.kind !== "ptr";
  }
}

/**
 * Returns true if the parameter should be rendered in the example output.
 * Skips literal parameters and optional parameters without an example value.
 */
function shouldRenderParam(param: go.MethodParameter, example: go.MethodExample): boolean {
  if (go.isLiteralParameter(param.style)) return false;
  if (example.parameters.find((p) => p.parameter.name === param.name)) return true;
  return go.isRequiredParameter(param.style);
}

/**
 * Gets the example value text for a parameter.
 * Uses the example value if available, otherwise generates a fake value.
 * Callers should check shouldRenderParam before calling this.
 */
function getParamExampleValue(
  pkg: go.TestPackage,
  param: go.MethodParameter,
  example: go.MethodExample,
  imports: ImportManager,
): string {
  const paramExample = example.parameters.find((p) => p.parameter.name === param.name);
  if (paramExample) {
    return getExampleValue(
      pkg,
      paramExample.value,
      "\t",
      imports,
      isParamByValue(paramExample),
    ).slice(1);
  }
  const fakeValue = generateFakeExample(param.type, param.name);
  return getExampleValue(pkg, fakeValue, "\t", imports, param.type.kind !== "ptr").slice(1);
}
