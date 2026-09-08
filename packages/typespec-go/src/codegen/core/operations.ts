/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as naming from "../../naming/naming.js";
import { CodegenError } from "./errors.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";
import { createRequestHandler } from "./request-handler.js";
import { createResponseHandler } from "./response-handler.js";

// represents the generated content for an operation group
export class OperationGroupContent {
  readonly name: string;
  readonly content: string;

  constructor(name: string, content: string) {
    this.name = name;
    this.content = content;
  }
}

/**
 * Creates the content for all the *_client.go files.
 *
 * @param pkg contains the package content
 * @param target the codegen target for the module
 * @param options the emitter options
 * @returns the text for the files or the empty string
 */
export function generateOperations(
  pkg: go.PackageContent,
  target: go.CodeModelType,
  options: go.Options,
): Array<OperationGroupContent> {
  // generate protocol operations
  const operations = new Array<OperationGroupContent>();
  if (pkg.clients.length === 0) {
    return operations;
  }
  const azureARM = target === "azure-arm";
  for (const client of pkg.clients) {
    // the list of packages to import
    const imports = new ImportManager(pkg);
    if (client.methods.length > 0) {
      // add standard imports for clients with methods.
      // clients that are purely hierarchical (i.e. having no APIs) won't need them.
      imports.add("net/http");
      imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/policy");
      imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime");
    }

    imports.add(
      azureARM
        ? "github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
        : "github.com/Azure/azure-sdk-for-go/sdk/azcore",
    );

    // generate client type
    let clientText = helpers.formatDocComment(client.docs);
    clientText += "// Don't use this type directly, use ";
    if (client.instance?.kind === "constructable" && client.instance.constructors.length === 1) {
      clientText += `${client.instance.constructors[0].name}() instead.\n`;
    } else if (client.parent) {
      // find the accessor method
      let accessorMethod: string | undefined;
      for (const clientAccessor of client.parent.clientAccessors) {
        if (clientAccessor.returns === client) {
          accessorMethod = clientAccessor.name;
          break;
        }
      }
      if (!accessorMethod) {
        throw new CodegenError(
          "InternalError",
          `didn't find accessor method for client ${client.name} on parent client ${client.parent.name}`,
        );
      }
      clientText += `[${client.parent.name}.${accessorMethod}] instead.\n`;
    } else {
      clientText += "a constructor function instead.\n";
    }

    if (client.apiVersions.length > 0) {
      clientText += `//\n// Generated from API version`;
      if (client.apiVersions.length > 1) {
        clientText += `s ${client.apiVersions
          .map((v) => v.literal.literal)
          .sort()
          .join(", ")}\n`;
      } else {
        clientText += ` ${client.apiVersions[0].literal.literal}\n`;
      }
    }

    const indent = new helpers.Indentation();

    clientText += `type ${client.name} struct {\n`;
    clientText += `${indent.get()}internal *${azureARM ? "arm" : "azcore"}.Client\n`;

    // check for any optional host params
    const optionalParams = new Array<go.ClientParameter>();

    const isParamPointer = function (param: go.ClientParameter): boolean {
      // for client params, only optional and flag types are passed by pointer
      return param.style === "flag" || param.style === "optional";
    };

    // now emit any client params (non parameterized host params case)
    if (client.parameters.length > 0) {
      const addedGroups = new Set<string>();
      for (const clientParam of client.parameters) {
        if (go.isLiteralParameter(clientParam.style)) {
          continue;
        }
        if (clientParam.group) {
          if (!addedGroups.has(clientParam.group.groupName)) {
            clientText += `${indent.get()}${naming.uncapitalize(clientParam.group.groupName)} ${!isParamPointer(clientParam) ? "" : "*"}${clientParam.group.groupName}\n`;
            addedGroups.add(clientParam.group.groupName);
          }
          continue;
        }
        clientText += `${indent.get()}${clientParam.name} `;
        if (!isParamPointer(clientParam)) {
          clientText += `${go.getTypeDeclaration(clientParam.type, client.pkg)}\n`;
        } else {
          clientText += `${helpers.formatParameterTypeName(client.pkg, clientParam)}\n`;
        }
        if (!go.isRequiredParameter(clientParam.style)) {
          optionalParams.push(clientParam);
        }
      }
    }

    // end of client definition
    clientText += "}\n\n";

    clientText += generateConstructors(client, target, imports, indent);

    // generate client accessors and operations
    let opText = "";
    for (const clientAccessor of client.clientAccessors) {
      imports.addForType(clientAccessor.returns);
      const subClientDecl = go.getTypeDeclaration(clientAccessor.returns, pkg);
      opText += helpers.formatDocComment(clientAccessor.docs);
      opText += `func (client *${client.name}) ${clientAccessor.name}(${getAPIParametersSig(clientAccessor, imports)}) *${subClientDecl} {\n`;
      opText += `${indent.get()}return &${subClientDecl}{\n`;
      const initFields = new Array<string>("internal: client.internal");
      // propagate all client params
      for (const param of clientAccessor.parameters) {
        // by convention, the client accessor params have the
        // same name as their corresponding client fields.
        initFields.push(`${param.name}: ${param.name}`);
      }

      // accessor params and client fields are mutually exclusive
      // so we don't need to worry about potentials for duplication.
      for (const param of client.parameters) {
        if (go.isLiteralParameter(param.style)) {
          continue;
        } else if (clientAccessor.returns.parameters.some((p) => p.name === param.name)) {
          // only propagate ctor params that are common between parent/child
          initFields.push(`${param.name}: client.${param.name}`);
        }
      }

      initFields.sort();
      indent.push();
      for (const initField of initFields) {
        opText += `${indent.get()}${initField},\n`;
      }
      indent.pop();
      opText += `${indent.get()}}\n}\n\n`;
    }

    const nextPageMethods = new Array<go.NextPageMethod>();
    for (const method of client.methods) {
      // protocol creation can add imports to the list so
      // it must be done before the imports are written out
      if (go.isLROMethod(method)) {
        // generate Begin method
        opText += generateLROBeginMethod(method, options, imports, indent);
      }
      opText += generateOperation(method, options, imports, indent);
      opText += createRequestHandler(azureARM, method, imports, indent);
      if (needsResponseHandler(method) && method.kind !== "lroMethod") {
        // we don't emit the response handler for vanilla LROs as the Poller[T]
        // handles that. we do need it for pageable LROs though.
        opText += createResponseHandler(method, imports, indent);
      }
      if (
        go.isPageableMethod(method) &&
        method.strategy?.kind === "nextLink" &&
        method.strategy.method &&
        !nextPageMethods.includes(method.strategy.method)
      ) {
        // track the next page methods to generate as multiple operations can use the same next page operation
        nextPageMethods.push(method.strategy.method);
      }
    }

    for (const method of nextPageMethods) {
      opText += createRequestHandler(azureARM, method, imports, indent);
    }

    // stitch it all together
    let text = helpers.contentPreamble(pkg);
    text += imports.text();
    text += clientText;
    text += opText;
    operations.push(new OperationGroupContent(client.name, text));
  }
  return operations;
}

/**
 * generates all modeled client constructors and client options types.
 * if there are no client constructors, the empty string is returned.
 *
 * @param client the client for which to generate constructors and the client options type
 * @param imports the import manager currently in scope
 * @returns the client constructor code or the empty string
 */
function generateConstructors(
  client: go.Client,
  type: go.CodeModelType,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  if (client.instance?.kind !== "constructable") {
    return "";
  }

  const clientOptions = client.instance.options;

  let ctorText = "";

  if (clientOptions.kind === "clientOptions") {
    // for non-ARM, the options type will always be a parameter group
    ctorText += `// ${clientOptions.name} contains the optional values for creating a [${client.name}].\n`;
    ctorText += `type ${clientOptions.name} struct {\n${indent.get()}azcore.ClientOptions\n`;
    for (const param of clientOptions.parameters) {
      if (go.isAPIVersionParameter(param)) {
        // we use azcore.ClientOptions.APIVersion
        continue;
      }
      ctorText += helpers.formatDocCommentWithPrefix(naming.ensureNameCase(param.name), param.docs);
      if (go.isClientSideDefault(param.style)) {
        if (!param.docs.description && !param.docs.summary) {
          ctorText += "\n";
        }
        ctorText += `${indent.get()}${helpers.comment(`The default value is ${helpers.formatLiteralValue(param.style.defaultValue, false)}`, "// ")}.\n`;
      }
      ctorText += `${indent.get()}${naming.ensureNameCase(param.name)} *${go.getTypeDeclaration(param.type, client.pkg)}\n`;
    }
    ctorText += "}\n\n";
  }

  for (const constructor of client.instance.constructors) {
    const ctorParams = new Array<string>();
    const paramDocs = new Array<string>();

    // ctor params can also be present in the supplemental endpoint parameters
    const consolidatedCtorParams = new Array<go.ClientParameter>();
    if (client.instance.endpoint) {
      consolidatedCtorParams.push(client.instance.endpoint.parameter);
      if (client.instance.endpoint.supplemental) {
        consolidatedCtorParams.push(...client.instance.endpoint.supplemental.parameters);
      }
    }

    for (const param of helpers.sortClientParameters(constructor.parameters, type)) {
      if (!consolidatedCtorParams.includes(param)) {
        consolidatedCtorParams.push(param);
      }
    }

    for (const ctorParam of consolidatedCtorParams) {
      if (!go.isRequiredParameter(ctorParam.style)) {
        // param is part of the options group
        continue;
      }
      imports.addForType(ctorParam.type);
      ctorParams.push(
        `${ctorParam.name} ${helpers.formatParameterTypeName(client.pkg, ctorParam)}`,
      );
      if (ctorParam.docs.summary || ctorParam.docs.description) {
        paramDocs.push(helpers.formatCommentAsBulletItem(ctorParam.name, ctorParam.docs));
      }
    }

    const emitProlog = function (
      optionsTypeName: string,
      tokenAuth: boolean,
      plOpts?: string,
    ): string {
      imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime");
      let bodyText = `${indent.get()}if options == nil {\n`;
      bodyText += `${indent.push().get()}options = ${optionsTypeName}{}\n`;
      bodyText += `${indent.pop().get()}}\n`;
      let apiVersionConfig = "";
      // check if there's an api version parameter
      let apiVersionParam:
        | go.HeaderScalarParameter
        | go.PathScalarParameter
        | go.QueryScalarParameter
        | go.URIParameter
        | undefined;
      for (const param of consolidatedCtorParams) {
        // emit empty path param checks
        if (param.kind === "pathScalarParam") {
          if (!param.isApiVersion) {
            bodyText += helpers.emitEmptyPathParamCheck(param, "ctor", imports, indent);
          }
        }

        switch (param.kind) {
          case "headerScalarParam":
          case "pathScalarParam":
          case "queryScalarParam":
          case "uriParam":
            if (param.isApiVersion) {
              apiVersionParam = param;
            }
        }
      }

      if (tokenAuth) {
        imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud");
        imports.add("fmt");
        imports.add("reflect");
        bodyText += `${indent.get()}if reflect.ValueOf(options.Cloud).IsZero() {\n`;
        bodyText += `${indent.push().get()}options.Cloud = cloud.AzurePublic\n`;
        bodyText += `${indent.pop().get()}}\n`;
        bodyText += `${indent.get()}c, ok := options.Cloud.Services[ServiceName]\n`;
        bodyText += `${indent.get()}if !ok {\n`;
        bodyText += `${indent.push().get()}return nil, fmt.Errorf("provided Cloud field is missing configuration for %s", ServiceName)\n`;
        bodyText += `${indent.pop().get()}} else if c.Audience == "" {\n`;
        bodyText += `${indent.push().get()}return nil, fmt.Errorf("provided Cloud field is missing Audience for %s", ServiceName)\n`;
        bodyText += `${indent.pop().get()}}\n`;
      }

      if (apiVersionParam) {
        let location: string;
        let name: string | undefined;
        switch (apiVersionParam.kind) {
          case "headerScalarParam":
            location = "Header";
            name = apiVersionParam.headerName;
            break;
          case "pathScalarParam":
          case "uriParam":
            location = "Path";
            // name isn't used for the path case
            break;
          case "queryScalarParam":
            location = "QueryParam";
            name = apiVersionParam.queryParameter;
            break;
        }

        indent.push(); // level 2 for PipelineOptions fields
        if (name) {
          indent.push(); // level 3 for APIVersionOptions fields
          name = `\n${indent.get()}Name: "${name}",`;
          indent.pop(); // back to level 2
        } else {
          name = "";
        }

        indent.push(); // level 3 for APIVersionOptions fields
        apiVersionConfig = `\n${indent.pop().get()}APIVersion: runtime.APIVersionOptions{${name}\n${indent.push().get()}Location: runtime.APIVersionLocation${location},\n${indent.pop().get()}},`;
        indent.pop(); // back to level 1
        if (!plOpts) {
          apiVersionConfig += "\n";
        }
      }
      bodyText += `${indent.get()}cl, err := azcore.NewClient(moduleName, moduleVersion, runtime.PipelineOptions{${apiVersionConfig}${plOpts ?? ""}}, &options.ClientOptions)\n`;
      return bodyText;
    };

    // check if there's a credential parameter
    let credentialParam: go.ClientCredentialParameter | undefined;
    for (const param of constructor.parameters) {
      if (param.kind === "credentialParam") {
        credentialParam = param;
        break;
      }
    }

    let prolog: string;
    if (credentialParam) {
      switch (credentialParam.type.kind) {
        case "tokenCredential":
          imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore");
          paramDocs.push(
            helpers.formatCommentAsBulletItem("credential", {
              summary: "used to authorize requests. Usually a credential from azidentity.",
            }),
          );
          switch (clientOptions.kind) {
            case "clientOptions": {
              imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/policy");
              indent.push(); // level 2 for PipelineOptions fields
              indent.push(); // level 3 for BearerTokenOptions fields
              const tokenPolicyOpts = `&policy.BearerTokenOptions{\n${indent.get()}InsecureAllowCredentialWithHTTP: options.InsecureAllowCredentialWithHTTP,\n${indent.pop().get()}}`;
              // we assume a single scope. this is enforced when adapting the data from tcgc
              const tokenPolicy = `\n${indent.get()}PerCall: []policy.Policy{\n${indent.get()}runtime.NewBearerTokenPolicy(credential, []string{c.Audience + "${helpers.splitScope(credentialParam.type.scopes[0]).scope}"}, ${tokenPolicyOpts}),\n${indent.get()}},\n`;
              indent.pop(); // back to level 1
              prolog = emitProlog(
                go.getTypeDeclaration(clientOptions, client.pkg, true),
                true,
                tokenPolicy,
              );
              break;
            }
            case "armClientOptions":
              // this is the ARM case
              prolog = "";
              imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/arm");
              for (const param of consolidatedCtorParams) {
                // emit empty path param checks
                if (param.kind === "pathScalarParam") {
                  if (!param.isApiVersion) {
                    prolog += helpers.emitEmptyPathParamCheck(param, "ctor", imports, indent);
                  }
                }
              }
              prolog += `${indent.get()}cl, err := arm.NewClient(moduleName, moduleVersion, credential, options)\n`;
              break;
          }
          break;
      }
    } else {
      prolog = emitProlog(go.getTypeDeclaration(clientOptions, client.pkg, true), false);
    }

    // add client options last
    ctorParams.push(`options ${helpers.formatParameterTypeName(client.pkg, clientOptions)}`);
    paramDocs.push(
      helpers.formatCommentAsBulletItem("options", {
        summary: "Contains optional client configuration. Pass nil to accept the default values.",
      }),
    );

    ctorText += `// ${constructor.name} creates a new instance of ${client.name} with the specified values.\n`;
    for (const doc of paramDocs) {
      ctorText += doc;
    }

    ctorText += `func ${constructor.name}(${ctorParams.join(", ")}) (*${client.name}, error) {\n`;
    ctorText += prolog;
    ctorText += `${indent.get()}if err != nil {\n`;
    ctorText += `${indent.push().get()}return nil, err\n`;
    ctorText += `${indent.pop().get()}}\n`;

    const emitClientSideDefaults = function (param: go.ClientParameter): void {
      if (go.isClientSideDefault(param.style)) {
        let name: string;
        if (go.isAPIVersionParameter(param)) {
          name = "APIVersion";
        } else {
          name = naming.ensureNameCase(param.name);
        }
        ctorText += `${indent.get()}${param.name} := ${helpers.formatLiteralValue(param.style.defaultValue, false)}\n`;
        ctorText += `${indent.get()}if options.${name} != ${helpers.zeroValue(param)} {\n`;
        ctorText += `${indent.push().get()}${param.name} = options.${name}\n`;
        ctorText += `${indent.pop().get()}}\n`;
      }
    };

    // handle any client-side defaults in the client options
    if (clientOptions.kind === "clientOptions") {
      for (const param of clientOptions.parameters) {
        emitClientSideDefaults(param);
      }
    }

    // construct any remaining client-side default param values
    for (const param of client.parameters) {
      emitClientSideDefaults(param);
    }

    // construct the supplemental path and join it to the endpoint
    if (client.instance.endpoint?.supplemental) {
      // the endpoint param is always the first ctor param
      const endpointParam = client.instance.constructors[0].parameters[0];
      if (client.instance.endpoint.supplemental.parameters.length > 0) {
        imports.add("strings");
        ctorText += `${indent.get()}host := "${client.instance.endpoint.supplemental.path}"\n`;
        for (const param of client.instance.endpoint.supplemental.parameters) {
          ctorText += `${indent.get()}host = strings.ReplaceAll(host, "{${param.uriPathSegment}}", ${helpers.formatValue(param.name, param.type, imports)})\n`;
        }
        ctorText += `${indent.get()}${endpointParam.name} = runtime.JoinPaths(${endpointParam.name}, host)\n`;
      } else {
        // there are no params for the supplemental host, so just append it
        ctorText += `${indent.get()}${endpointParam.name} = runtime.JoinPaths(${endpointParam.name}, "${client.instance.endpoint.supplemental.path}")\n`;
      }
    }

    // construct client literal
    let clientVar = "client";
    // ensure clientVar doesn't collide with any params
    for (const param of consolidatedCtorParams) {
      if (param.name === clientVar) {
        clientVar = naming.ensureNameCase(client.name, true);
        break;
      }
    }

    ctorText += `${indent.get()}${clientVar} := &${client.name}{\n`;
    // NOTE: we don't enumerate consolidatedCtorParams here
    // as any supplemental endpoint params are ephemeral and
    // consumed during client construction.
    indent.push();
    for (const parameter of client.parameters) {
      if (go.isLiteralParameter(parameter.style)) {
        continue;
      }
      // each client field will have a matching parameter with the same name
      ctorText += `${indent.get()}${parameter.name}: ${parameter.name},\n`;
    }
    ctorText += `${indent.get()}internal: cl,\n`;
    indent.pop();
    ctorText += `${indent.get()}}\n`;
    ctorText += `${indent.get()}return ${clientVar}, nil\n`;
    ctorText += "}\n\n";
  }

  return ctorText;
}

/**
 * returns the zero value for the specified method.
 * note that the zero value will be different depending
 * on which API for the method is being called.
 *
 * @param method the method to determine the zero value
 * @returns the zero value
 */
function getZeroReturnValue(method: go.MethodType, forFetcher: boolean): string {
  // NOTE: we need more context when attempting to determine the zero value for pageable LROs:
  //  - in the fetcher, return the response envelope type
  //  - outside the fetcher return nil
  let returnType = `${method.returns.name}{}`;
  if (go.isLROMethod(method) && !forFetcher) {
    // the api returns a *Poller[T]
    // the operation returns an *http.Response
    returnType = "nil";
  }
  return returnType;
}

/**
 * Helper function to generate nil checks for a segmented path
 * e.g. page.Foo != nil && page.Foo.Bar != nil
 *
 * @param segments the field segments
 * @param varName optional variable name containing the fields
 * @param omitLastSegment when true, omits the last item in segments.
 *   note that this can cause the function to return the empty string when segments.length === 1
 * @returns the sequence of nil checks
 */
function generateNilChecks(
  segments: Array<go.ModelField>,
  varName: string = "page",
  omitLastSegment = false,
): string {
  const checks: string[] = [];

  let segmentCount = segments.length;
  if (omitLastSegment) {
    segmentCount -= 1;
  }

  for (let i = 0; i < segmentCount; i++) {
    const currentPath = [varName, ...segments.map((segment) => segment.name).slice(0, i + 1)].join(
      ".",
    );
    checks.push(`${currentPath} != nil`);
  }

  return checks.join(" && ");
}

/**
 * emits code that calls runtime.NewPager
 *
 * @param method the pageable method
 * @param options emitter options
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the complete call to runtime.NewPager(...)
 */
function emitPagerDefinition(
  method: go.LROPageableMethod | go.PageableMethod,
  options: go.Options,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  imports.add("context");
  // BEGIN runtime.NewPager
  let text = `runtime.NewPager(runtime.PagingHandler[${method.returns.name}]{\n`;

  // BEGIN More func
  text += `${indent.push().get()}More: func(page ${method.returns.name}) bool {\n`;
  indent.push();
  if (method.strategy) {
    const moreForNextLinkPath = function (strategy: go.PageableStrategyNextLink): void {
      const nilChecks = generateNilChecks(strategy.nextLinkPath);
      const nextLinkPath = helpers.buildNextLinkPath(strategy);
      text += `${indent.get()}return ${nilChecks} && len(*page.${nextLinkPath}) > 0\n`;
    };

    switch (method.strategy.kind) {
      case "continuationToken": {
        switch (method.strategy.responseToken.kind) {
          case "headerScalarResponse":
            const tokenRespField = method.strategy.responseToken.fieldName;
            text += `${indent.get()}return page.${tokenRespField} != nil && len(*page.${tokenRespField}) > 0\n`;
            break;
          case "nextLink":
            moreForNextLinkPath(method.strategy.responseToken);
            break;
          default:
            method.strategy.responseToken satisfies never;
        }
        break;
      }
      case "nextLink": {
        moreForNextLinkPath(method.strategy);
        break;
      }
      default:
        method.strategy satisfies never;
    }
  } else {
    // there is no advancer for single-page pagers
    text += `${indent.get()}return false\n`;
  }
  text += `${indent.pop().get()}},\n`;
  // END More func

  // BEGIN Fetcher func
  text += `${indent.get()}Fetcher: func(ctx context.Context, page *${method.returns.name}) (${method.returns.name}, error) {\n`;
  indent.push();
  if (options["generate-fakes"]) {
    text += `${indent.get()}ctx = context.WithValue(ctx, runtime.CtxAPINameKey{}, "${method.receiver.type.name}.${helpers.fixUpMethodName(method)}")\n`;
  }

  let nextLinkParam: string | undefined;
  let optionsParam: string | undefined;
  if (method.strategy) {
    switch (method.strategy.kind) {
      case "continuationToken": {
        const ms = method.strategy;
        const optionsCopy = "nextOpts";
        text += `${indent.get()}${optionsCopy} := ${method.optionalParamsGroup.groupName}{}\n`;
        text += `${indent.get()}${helpers.buildIfBlock(indent, {
          condition: `${method.optionalParamsGroup.name} != nil`,
          body: (indent) => `${indent.get()}${optionsCopy} = *${method.optionalParamsGroup.name}\n`,
        })}\n`;

        let respToken: string;
        let nestedNilChecks = "";
        switch (ms.responseToken.kind) {
          case "headerScalarResponse":
            respToken = ms.responseToken.fieldName;
            break;
          case "nextLink":
            respToken = helpers.buildNextLinkPath(ms.responseToken);
            if (ms.responseToken.nextLinkPath.length > 1) {
              // we don't need to check the last field for nil as we'll just
              // assign it to the corresponding field in the options param
              nestedNilChecks = ` && ${generateNilChecks(ms.responseToken.nextLinkPath, "page", true)}`;
            }
            break;
        }

        text += `${indent.get()}${helpers.buildIfBlock(indent, {
          condition: `page != nil${nestedNilChecks}`,
          body: (indent) =>
            `${indent.get()}${optionsCopy}.${ms.requestToken.name} = page.${respToken}\n`,
        })}\n`;

        optionsParam = `&${optionsCopy}`;
        break;
      }
      case "nextLink": {
        const nextLinkPath = helpers.buildNextLinkPath(method.strategy);
        if (method.kind === "pageableMethod") {
          text += `${indent.get()}nextLink := ""\n`;
          nextLinkParam = "nextLink";
          text += `${indent.get()}if page != nil {\n`;
          text += `${indent.push().get()}nextLink = *page.${nextLinkPath}\n`;
          text += `${indent.pop().get()}}\n`;
        } else {
          nextLinkParam = `*page.${nextLinkPath}`;
        }
      }
    }
  }

  const reqParams = helpers.getCreateRequestParameters(method, nextLinkParam, optionsParam);
  text += `${indent.get()}req, err := client.${method.naming.requestMethod}(${reqParams})\n`;
  text += `${indent.get()}${helpers.buildErrCheck(indent, "err", getZeroReturnValue(method, true))}\n`;

  text += `${indent.get()}resp, err := client.internal.Pipeline().Do(req)\n`;
  text += `${indent.get()}${helpers.buildErrCheck(indent, "err", getZeroReturnValue(method, true))}\n`;
  text += `${indent.get()}return client.${method.naming.responseMethod}(resp, ${helpers.formatStatusCodes(method.httpStatusCodes)})\n`;
  text += `${indent.pop().get()}},\n`;
  // END Fetcher func

  if (options["inject-spans"]) {
    text += `${indent.get()}Tracer: client.internal.Tracer(),\n`;
  }
  text += `${indent.pop().get()}})\n`;
  // END runtime.NewPager

  return text;
}

function genRespErrorDoc(method: go.MethodType): string {
  if (!(method.returns.result?.kind === "headAsBooleanResult") && !go.isPageableMethod(method)) {
    // when head-as-boolean is enabled, no error is returned for 4xx status codes.
    // pager constructors don't return an error
    return "// If the operation fails it returns an *azcore.ResponseError type.\n";
  }
  return "";
}

function generateOperation(
  method: go.MethodType,
  options: go.Options,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const params = getAPIParametersSig(method, imports);
  const returns = generateReturnsInfo(method, "op");
  let methodName = method.name;
  if (method.kind === "pageableMethod") {
    methodName = helpers.fixUpMethodName(method);
  }
  let text = "";
  const respErrDoc = genRespErrorDoc(method);
  if (method.docs.summary || method.docs.description) {
    text += helpers.formatDocCommentWithPrefix(methodName, method.docs);
  } else if (respErrDoc.length > 0) {
    // if the method has no doc comment but we're adding other
    // doc comments, add an empty method name comment. this preserves
    // existing behavior and makes the docs look better overall.
    text += `// ${methodName} -\n`;
  }
  text += respErrDoc;
  if (go.isLROMethod(method)) {
    methodName = method.naming.internalMethod;
  } else {
    for (const param of helpers.getMethodParameters(method)) {
      text += helpers.formatCommentAsBulletItem(param.name, param.docs);
    }
  }
  text += `func ${helpers.getClientReceiverDefinition(method.receiver)} ${methodName}(${params}) (${returns.join(", ")}) {\n`;
  if (method.kind === "pageableMethod") {
    text += `${indent.get()}return `;
    text += emitPagerDefinition(method, options, imports, indent);
    text += "}\n\n";
    return text;
  }
  text += `${indent.get()}var err error\n`;
  let operationName = `"${method.receiver.type.name}.${helpers.fixUpMethodName(method)}"`;
  if (options["generate-fakes"] && options["inject-spans"]) {
    text += `${indent.get()}const operationName = ${operationName}\n`;
    operationName = "operationName";
  }
  if (options["generate-fakes"]) {
    text += `${indent.get()}ctx = context.WithValue(ctx, runtime.CtxAPINameKey{}, ${operationName})\n`;
  }
  if (options["inject-spans"]) {
    text += `${indent.get()}ctx, endSpan := runtime.StartSpan(ctx, ${operationName}, client.internal.Tracer(), nil)\n`;
    text += `${indent.get()}defer func() { endSpan(err) }()\n`;
  }

  const reqParams = helpers.getCreateRequestParameters(
    method,
    method.kind === "lroPageableMethod" ? `""` : undefined,
  );
  text += `${indent.get()}req, err := client.${method.naming.requestMethod}(${reqParams})\n`;
  text += `${indent.get()}${helpers.buildErrCheck(indent, "err", getZeroReturnValue(method, false))}\n`;

  text += `${indent.get()}httpResp, err := client.internal.Pipeline().Do(req)\n`;
  text += `${indent.get()}${helpers.buildErrCheck(indent, "err", getZeroReturnValue(method, false))}\n`;

  // NOTE: for an LRO's op method we never invoke the response handler.
  // for vanilla LRO's we don't emit one, only for pageable LROs and in
  // that case the response handler is invoked by the fetcher.
  if (needsResponseHandler(method) && !go.isLROMethod(method)) {
    // methods that return a modeled type, headers, or both call the method's response handler
    text += `${indent.get()}return client.${method.naming.responseMethod}(httpResp, ${helpers.formatStatusCodes(method.httpStatusCodes)})\n`;
  } else {
    // no response handler so we emit the status code check here
    const zeroResp = getZeroReturnValue(method, false);
    text += `${indent.get()}${helpers.buildIfBlock(indent, {
      condition: `!runtime.HasStatusCode(httpResp, ${helpers.formatStatusCodes(method.httpStatusCodes)})`,
      body: (indent) => `${indent.get()}return ${zeroResp}, runtime.NewResponseError(httpResp)\n`,
    })}\n`;

    if (go.isLROMethod(method)) {
      text += `${indent.get()}return httpResp, nil\n`;
    } else if (method.returns.result) {
      switch (method.returns.result.kind) {
        case "binaryResult":
          text += `${indent.get()}return ${method.returns.name}{${method.returns.result.fieldName}: httpResp.Body}, nil\n`;
          break;
        case "headAsBooleanResult":
          text += `${indent.get()}return ${method.returns.name}{${method.returns.result.fieldName}: httpResp.StatusCode >= 200 && httpResp.StatusCode < 300}, nil\n`;
          break;
        default:
          // we should never get here as the remaining kinds are all modeled results
          // thus should have been handled by the needsResponseHandler check earlier
          throw new CodegenError(
            "InternalError",
            `unexpected method result kind ${method.returns.result.kind}`,
          );
      }
    } else {
      // no result type, just response envelope
      text += `${indent.get()}return ${zeroResp}, nil\n`;
    }
  }

  text += "}\n\n";
  return text;
}

// returns true if the method requires a response handler.
// this is used to unmarshal the response body, parse response headers, or both.
function needsResponseHandler(method: go.MethodType): boolean {
  switch (method.returns.result?.kind) {
    case "anyResult":
    case "modelResult":
    case "monomorphicResult":
    case "polymorphicResult":
      return true;
    default:
      return method.returns.headers.length > 0;
  }
}

/**
 * returns the parameters for the public API
 * e.g. "ctx context.Context, i int, s string"
 *
 * @param method the method for which to emit the parameters
 * @param imports the import manager currently in scope
 * @returns the text for the method parameters
 */
function getAPIParametersSig(
  method: go.ClientAccessor | go.MethodType,
  imports: ImportManager,
): string {
  const params = new Array<string>();
  if (method.kind === "clientAccessor") {
    // client accessor params don't have a concept
    // of optionality nor do they contain literals
    for (const param of method.parameters) {
      imports.addForType(param.type);
      params.push(`${param.name} ${go.getTypeDeclaration(param.type, method.receiver.type.pkg)}`);
    }
  } else {
    const methodParams = helpers.getMethodParameters(method);
    if (method.kind !== "pageableMethod") {
      imports.add("context");
      params.push("ctx context.Context");
    }
    for (const methodParam of methodParams) {
      if (methodParam.kind !== "paramGroup") {
        imports.addForType(methodParam.type);
      }
      params.push(
        `${methodParam.name} ${helpers.formatParameterTypeName(method.receiver.type.pkg, methodParam)}`,
      );
    }
  }
  return params.join(", ");
}

// returns the return signature where each entry is the type name
// e.g. [ '*string', 'error' ]
// apiType describes where the return sig is used.
//   api - for the API definition
//    op - for the operation
function generateReturnsInfo(method: go.MethodType, apiType: "api" | "op"): Array<string> {
  let returnType = method.returns.name;
  switch (method.kind) {
    case "lroMethod":
    case "lroPageableMethod":
      switch (apiType) {
        case "api":
          if (method.kind === "lroPageableMethod") {
            returnType = `*runtime.Poller[*runtime.Pager[${returnType}]]`;
          } else {
            returnType = `*runtime.Poller[${returnType}]`;
          }
          break;
        case "op":
          returnType = "*http.Response";
          break;
      }
      break;
    case "pageableMethod":
      // pager operations don't return an error
      return [`*runtime.Pager[${returnType}]`];
  }
  return [returnType, "error"];
}

function generateLROBeginMethod(
  method: go.LROMethod | go.LROPageableMethod,
  options: go.Options,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const params = getAPIParametersSig(method, imports);
  const returns = generateReturnsInfo(method, "api");
  imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime");
  let text = "";
  if (method.docs.summary || method.docs.description) {
    text += helpers.formatDocCommentWithPrefix(helpers.fixUpMethodName(method), method.docs);
    text += genRespErrorDoc(method);
  }
  const zeroResp = getZeroReturnValue(method, false);
  const methodParams = helpers.getMethodParameters(method);
  for (const param of methodParams) {
    text += helpers.formatCommentAsBulletItem(param.name, param.docs);
  }
  text += `func ${helpers.getClientReceiverDefinition(method.receiver)} ${helpers.fixUpMethodName(method)}(${params}) (${returns.join(", ")}) {\n`;
  let pollerType = "nil";
  let pollerTypeParam = `[${method.returns.name}]`;
  if (method.kind === "lroPageableMethod") {
    // for paged LROs, we construct a pager and pass it to the LRO ctor.
    pollerTypeParam = `[*runtime.Pager${pollerTypeParam}]`;
    pollerType = "&pager";
    text += `${indent.get()}pager := `;
    text += emitPagerDefinition(method, options, imports, indent);
  }

  text += `${indent.get()}if options == nil || options.ResumeToken == "" {\n`;
  indent.push();

  // creating the poller from response branch

  const opName = method.naming.internalMethod;
  text += `${indent.get()}resp, err := client.${opName}(${helpers.getCreateRequestParameters(method)})\n`;
  text += `${indent.get()}if err != nil {\n`;
  text += `${indent.push().get()}return ${zeroResp}, err\n`;
  text += `${indent.pop().get()}}\n`;

  let finalStateVia = "";
  // LRO operation might have a special configuration set in x-ms-long-running-operation-options
  // which indicates a specific url to perform the final Get operation on
  if (method.finalStateVia) {
    switch (method.finalStateVia) {
      case "azure-async-operation":
        finalStateVia = "runtime.FinalStateViaAzureAsyncOp";
        break;
      case "location":
        finalStateVia = "runtime.FinalStateViaLocation";
        break;
      case "original-uri":
        finalStateVia = "runtime.FinalStateViaOriginalURI";
        break;
      case "operation-location":
        finalStateVia = "runtime.FinalStateViaOpLocation";
        break;
      default:
        throw new CodegenError("InternalError", `unhandled final-state-via value ${finalStateVia}`);
    }
  }

  text += `${indent.get()}poller, err := runtime.NewPoller`;
  if (finalStateVia === "" && pollerType === "nil" && !options["inject-spans"]) {
    // the generic type param is redundant when it's also specified in the
    // options struct so we only include it when there's no options.
    text += pollerTypeParam;
  }
  text += "(resp, client.internal.Pipeline(), ";
  if (
    finalStateVia === "" &&
    pollerType === "nil" &&
    !options["inject-spans"] &&
    !method.operationLocationResultPath
  ) {
    // no options
    text += "nil)\n";
  } else {
    // at least one option
    indent.push();
    text += `&runtime.NewPollerOptions${pollerTypeParam}{\n`;
    if (finalStateVia !== "") {
      text += `${indent.get()}FinalStateVia: ${finalStateVia},\n`;
    }
    if (method.operationLocationResultPath) {
      text += `${indent.get()}OperationLocationResultPath: "${method.operationLocationResultPath}",\n`;
    }
    if (pollerType !== "nil") {
      text += `${indent.get()}Response: ${pollerType},\n`;
    }
    if (options["inject-spans"]) {
      text += `${indent.get()}Tracer: client.internal.Tracer(),\n`;
    }
    indent.pop();
    text += `${indent.get()}})\n`;
  }
  text += `${indent.get()}return poller, err\n`;
  indent.pop();
  text += `${indent.get()}} else {\n`;
  indent.push();

  // creating the poller from resume token branch

  text += `${indent.get()}return runtime.NewPollerFromResumeToken`;
  if (pollerType === "nil" && !options["inject-spans"]) {
    text += pollerTypeParam;
  }
  text += "(options.ResumeToken, client.internal.Pipeline(), ";
  if (pollerType === "nil" && !options["inject-spans"]) {
    text += "nil)\n";
  } else {
    indent.push();
    text += `&runtime.NewPollerFromResumeTokenOptions${pollerTypeParam}{\n`;
    if (pollerType !== "nil") {
      text += `${indent.get()}Response: ${pollerType},\n`;
    }
    if (options["inject-spans"]) {
      text += `${indent.get()}Tracer: client.internal.Tracer(),\n`;
    }
    indent.pop();
    text += `${indent.get()}})\n`;
  }
  indent.pop();
  text += `${indent.get()}}\n`;

  text += "}\n\n";
  return text;
}
