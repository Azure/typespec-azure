import type { Children } from "@alloy-js/core";
import { code } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import * as ts from "@alloy-js/typescript";
import type { Program } from "@typespec/compiler";
import { Output } from "@typespec/emitter-framework";
import * as ef from "@typespec/emitter-framework/typescript";
import { beforeAll, describe, expect, it } from "vitest";
import { buildServerModel } from "../src/build-model.js";
import type { ServerModel } from "../src/model.js";
import {
  contextRefkey,
  operationParametersRefkey,
  operationResponseRefkey,
} from "../src/render/refkeys.js";
import { ServiceHandlerInterface } from "../src/render/render-handlers.js";
import { renderModels } from "../src/render/render-models.js";
import {
  OperationTypeBindingExpression,
  renderOperations,
} from "../src/render/render-operations.js";
import {
  DeserializeRequest,
  HasGeneratedSerialization,
  SerializeResponse,
  XmlModelMetadata,
} from "../src/render/render-serialization.js";
import { ApiTester } from "./tester.js";

let testProgram: Program;

beforeAll(async () => {
  const { program } = await ApiTester.compile({
    "main.tsp": `
      import "@typespec/http";
      using Http;

      @service
      namespace RenderTest;

      @doc("Queue metadata.")
      model QueueMetadata {
        @doc("A description.")
        description?: string;
        publicAccess?: boolean;
      }

      model QueueMessage {
        messageId: string;
        tags?: string[];
      }

      @route("/{queueName}")
      interface Queue {
        @doc("Creates a queue.")
        @put
        op CreateQueue(@path queueName: string, @body body: string): {
          @statusCode statusCode: 201;
          @header("x-ms-request-id") requestId: string;
        };

        @delete
        op DeleteQueue(@path queueName: string): {
          @statusCode statusCode: 204;
          @header("x-ms-request-id") requestId: string;
          @body body: QueueMessage;
        };

        @get
        @route("/metadata")
        op GetMetadata(@path queueName: string): {
          @statusCode statusCode: 200;
          @body body: QueueMetadata;
        };
      }
    `,
  });
  testProgram = program;
  attachDeclarationTypes(sampleServerModel, buildServerModel(program));
});

function Wrapper(props: { children: Children }) {
  return <Output program={testProgram}>{props.children}</Output>;
}

function SourceFile(props: { children: Children }) {
  return (
    <Wrapper>
      <ts.SourceFile path="test.ts">{props.children}</ts.SourceFile>
    </Wrapper>
  );
}

const sampleServerModel: ServerModel = {
  serviceName: "QueuePilot",
  models: [
    {
      name: "QueueMetadata",
      wireName: "QueueMetadata",
      doc: "Queue metadata.",
      properties: [
        {
          name: "description",
          wireName: "Description",
          type: { kind: "string" },
          optional: true,
          xmlAttribute: false,
          xmlUnwrapped: false,
          doc: "A description.",
        },
        {
          name: "publicAccess",
          wireName: "PublicAccess",
          type: { kind: "boolean" },
          optional: true,
          xmlAttribute: false,
          xmlUnwrapped: false,
        },
      ],
    },
    {
      name: "QueueMessage",
      wireName: "QueueMessage",
      properties: [
        {
          name: "messageId",
          wireName: "MessageId",
          type: { kind: "string" },
          optional: false,
          xmlAttribute: false,
          xmlUnwrapped: false,
        },
        {
          name: "tags",
          wireName: "Tags",
          type: { kind: "array", element: { kind: "string" } },
          optional: true,
          xmlAttribute: false,
          xmlUnwrapped: false,
        },
      ],
    },
  ],
  operations: [
    {
      name: "CreateQueue",
      verb: "put",
      rawPath: "/{queueName}",
      path: "/{queueName}",
      literalQueryParameters: [],
      doc: "Creates a queue.",
      interfaceName: "Queue",
      parameters: [
        {
          name: "queueName",
          wireName: "queueName",
          location: "path",
          type: { kind: "string" },
          optional: false,
        },
      ],
      requestBody: {
        type: { kind: "string" },
        contentTypes: ["application/json"],
        parameterPath: "body",
      },
      responses: [
        {
          statusCode: 201,
          headers: [
            {
              name: "requestId",
              wireName: "x-ms-request-id",
              type: { kind: "string" },
              optional: false,
            },
          ],
        },
      ],
    },
    {
      name: "DeleteQueue",
      verb: "delete",
      rawPath: "/{queueName}",
      path: "/{queueName}",
      literalQueryParameters: [],
      interfaceName: "Queue",
      parameters: [
        {
          name: "queueName",
          wireName: "queueName",
          location: "path",
          type: { kind: "string" },
          optional: false,
        },
      ],
      responses: [
        {
          statusCode: 204,
          headers: [
            {
              name: "requestId",
              wireName: "x-ms-request-id",
              type: { kind: "string" },
              optional: false,
            },
          ],
        },
      ],
    },
  ],
  skippedOperations: [],
};

function attachDeclarationTypes(target: ServerModel, source: ServerModel) {
  for (const targetModel of target.models) {
    const sourceModel = source.models.find((model) => model.name === targetModel.name);
    if (sourceModel?.declarationModel) {
      Object.defineProperty(targetModel, "declarationModel", {
        value: sourceModel.declarationModel,
        enumerable: false,
      });
    }
  }

  for (const targetOperation of target.operations) {
    const sourceOperation = source.operations.find(
      (operation) => operation.name === targetOperation.name,
    );
    if (!sourceOperation) continue;
    for (const targetParameter of targetOperation.parameters) {
      const sourceParameter = sourceOperation.parameters.find(
        (parameter) => parameter.name === targetParameter.name,
      );
      if (sourceParameter?.declarationType) {
        Object.defineProperty(targetParameter, "declarationType", {
          value: sourceParameter.declarationType,
          enumerable: false,
        });
      }
    }
    if (targetOperation.requestBody && sourceOperation.requestBody?.declarationType) {
      Object.defineProperty(targetOperation.requestBody, "declarationType", {
        value: sourceOperation.requestBody.declarationType,
        enumerable: false,
      });
    }
    for (const targetResponse of targetOperation.responses) {
      const sourceResponse = sourceOperation.responses.find(
        (response) => response.statusCode === targetResponse.statusCode,
      );
      if (!sourceResponse) continue;
      for (const targetHeader of targetResponse.headers) {
        const sourceHeader = sourceResponse.headers.find(
          (header) => header.name === targetHeader.name,
        );
        if (sourceHeader?.declarationType) {
          Object.defineProperty(targetHeader, "declarationType", {
            value: sourceHeader.declarationType,
            enumerable: false,
          });
        }
      }
      if (targetResponse.body && sourceResponse.body?.declarationType) {
        Object.defineProperty(targetResponse.body, "declarationType", {
          value: sourceResponse.body.declarationType,
          enumerable: false,
        });
      }
    }
  }
}

const supportedOperations = sampleServerModel.operations;

describe("renderModels", () => {
  it("renders TypeScript interfaces for server data models", () => {
    expect(<Wrapper>{renderModels(sampleServerModel)}</Wrapper>).toRenderTo(`
      // This file was automatically generated by @azure-tools/typespec-azurite-emitter.
      // Do not edit this file manually; re-run \`tsp compile\` to regenerate it.
      /**
       * Queue metadata.
       */
      export interface QueueMetadata {
        /**
         * A description.
         */
        description?: string;
        publicAccess?: boolean;
      }
      export interface QueueMessage {
        messageId: string;
        tags?: Array<string>;
      }
    `);
  });
});

describe("renderOperations", () => {
  it("renders operation declarations and metadata", () => {
    expect(<Wrapper>{renderOperations(sampleServerModel)}</Wrapper>).toRenderTo(`
      // This file was automatically generated by @azure-tools/typespec-azurite-emitter.
      // Do not edit this file manually; re-run \`tsp compile\` to regenerate it.
      /**
       * Creates a queue.
       */
      export interface CreateQueueParameters {
        queueName: string;
        body: string;

      }
      export type CreateQueueResponse =
      | {
          statusCode: 201;
          headers: {
            requestId: string;
          };
        };

      export interface DeleteQueueParameters {
        queueName: string;

      }
      export type DeleteQueueResponse =
      | {
          statusCode: 204;
          headers: {
            requestId: string;
          };
        };
      export type OperationTypeBinding =
      | {
          readonly kind: "string" | "number" | "boolean" | "datetime" | "record" | "unknown";

        }
        | {
          readonly kind: "model";
          readonly name: string;

        }
        | {
          readonly kind: "literal";
          readonly value: string | number | boolean;

        }
        | {
          readonly kind: "array";
          readonly element: OperationTypeBinding;

        };
      export interface OperationParameterBinding {
        readonly name: string;
        readonly wireName: string;
        readonly location: "path" | "query" | "header";
        readonly required: boolean;
        readonly type: OperationTypeBinding;

      }
      export interface OperationResponseHeaderBinding {
        readonly name: string;
        readonly wireName: string;
        readonly type: OperationTypeBinding;

      }
      export interface OperationResponseMetadata {
        readonly statusCode: number | "*";
        readonly headers: readonly OperationResponseHeaderBinding[];
        readonly body?: {
          readonly type: OperationTypeBinding;

        };

      }
      export interface OperationLiteralQueryParameter {
        readonly name: string;
        readonly value: string;

      }
      export interface OperationMetadata {
        readonly name: string;
        readonly verb: string;
        readonly rawPath: string;
        readonly path: string;
        readonly literalQueryParameters: readonly OperationLiteralQueryParameter[];
        readonly requiredQueryParameters: readonly string[];
        readonly requiredHeaderParameters: readonly string[];
        readonly parameters: readonly OperationParameterBinding[];
        readonly hasRequestBody: boolean;
        readonly requestBodyContentTypes: readonly string[];
        readonly requestBodyParameterPath?: string | readonly string[];
        readonly requestBodyType?: OperationTypeBinding;
        readonly responses: readonly OperationResponseMetadata[];
        readonly interfaceName?: string;

      }
      export const operations: readonly OperationMetadata[] = [
        {
          name: "CreateQueue",
          verb: "put",
          rawPath: "/{queueName}",
          path: "/{queueName}",
          literalQueryParameters: [],
          requiredQueryParameters: [],
          requiredHeaderParameters: [],
          parameters: [
            {
              name: "queueName",
              wireName: "queueName",
              location: "path",
              required: true,
              type: {
                kind: "string",
              }
            }
          ],
          hasRequestBody: true,
          requestBodyContentTypes: ["application/json"],
          requestBodyParameterPath: "body",
          requestBodyType: {
            kind: "string",
          },
          responses: [
            {
              statusCode: 201,
              headers: [
                {
                  name: "requestId",
                  wireName: "x-ms-request-id",
                  type: {
                    kind: "string",
                  }
                }
              ]
            }
          ],
          interfaceName: "Queue"
        },
        {
          name: "DeleteQueue",
          verb: "delete",
          rawPath: "/{queueName}",
          path: "/{queueName}",
          literalQueryParameters: [],
          requiredQueryParameters: [],
          requiredHeaderParameters: [],
          parameters: [
            {
              name: "queueName",
              wireName: "queueName",
              location: "path",
              required: true,
              type: {
                kind: "string",
              }
            }
          ],
          hasRequestBody: false,
          requestBodyContentTypes: [],
          responses: [
            {
              statusCode: 204,
              headers: [
                {
                  name: "requestId",
                  wireName: "x-ms-request-id",
                  type: {
                    kind: "string",
                  }
                }
              ]
            }
          ],
          interfaceName: "Queue"
        }
      ]
    `);
  });

  it("renders operation type binding object literals", () => {
    expect(
      <SourceFile>
        <OperationTypeBindingExpression
          type={{ kind: "array", element: { kind: "model", name: "QueueMessage" } }}
        />
      </SourceFile>,
    ).toRenderTo(`
      {
        kind: "array",
        element: {
          kind: "model",
          name: "QueueMessage",
        }
      }
    `);
  });
});

describe("ServiceHandlerInterface", () => {
  it("renders handler methods with automatic cross-file imports from refkeys", () => {
    expect(
      <Wrapper>
        <ts.SourceFile path="operations.ts">
          <ts.InterfaceDeclaration
            export
            name="CreateQueueParameters"
            refkey={operationParametersRefkey(sampleServerModel.operations[0])}
          />
          <ts.TypeDeclaration
            export
            name="CreateQueueResponse"
            refkey={operationResponseRefkey(sampleServerModel.operations[0])}
          >
            {code`{ statusCode: 201 }`}
          </ts.TypeDeclaration>
          <ts.InterfaceDeclaration
            export
            name="DeleteQueueParameters"
            refkey={operationParametersRefkey(sampleServerModel.operations[1])}
          />
          <ts.TypeDeclaration
            export
            name="DeleteQueueResponse"
            refkey={operationResponseRefkey(sampleServerModel.operations[1])}
          >
            {code`{ statusCode: 204 }`}
          </ts.TypeDeclaration>
        </ts.SourceFile>
        <ts.SourceFile path="handlers.ts">
          <ef.InterfaceDeclaration export name="Context" refkey={contextRefkey}>
            <ts.InterfaceMember readonly name="contextId" type={code`string`} />
            {code`;`}
          </ef.InterfaceDeclaration>
          <hbr />
          <ServiceHandlerInterface serverModel={sampleServerModel} />
        </ts.SourceFile>
      </Wrapper>,
    ).toRenderTo({
      "operations.ts": d`
              export interface CreateQueueParameters {

              }export type CreateQueueResponse = { statusCode: 201 };export interface DeleteQueueParameters {

              }export type DeleteQueueResponse = { statusCode: 204 };
            `,
      "handlers.ts": d`
              import type {
                CreateQueueParameters,
                CreateQueueResponse,
                DeleteQueueParameters,
                DeleteQueueResponse,
              } from "./operations.js";

              export interface Context {
                readonly contextId: string;
              }
              export interface IServiceHandler {
                /**
                 * Creates a queue.
                 *
                 * @param {CreateQueueParameters} params
                 * @param {Context} context
                 */
                createQueue(
                  params: CreateQueueParameters,
                  context: Context,
                ): Promise<CreateQueueResponse>;
                deleteQueue(
                  params: DeleteQueueParameters,
                  context: Context,
                ): Promise<DeleteQueueResponse>;
              }
            `,
    });
  });
});

describe("renderSerialization components", () => {
  it("renders XML model metadata from Alloy object/value components", () => {
    expect(
      <SourceFile>
        <XmlModelMetadata models={sampleServerModel.models} />
      </SourceFile>,
    ).toRenderTo(`
      interface XmlPropertyMetadata {
        readonly name: string;
        readonly wireName: string;
        readonly type: OperationTypeBinding;
        readonly attribute: boolean;
        readonly unwrapped: boolean;
        readonly itemName?: string;
      }

      interface XmlModelMetadata {
        readonly name: string;
        readonly wireName: string;
        readonly properties: readonly XmlPropertyMetadata[];
      }

      const xmlModels: Record<string, XmlModelMetadata> ={
        QueueMetadata: {
          name: "QueueMetadata",
          wireName: "QueueMetadata",
          properties: [
            {
              name: "description",
              wireName: "Description",
              type: {
                kind: "string",
              },
              attribute: false,
              unwrapped: false
            },
            {
              name: "publicAccess",
              wireName: "PublicAccess",
              type: {
                kind: "boolean",
              },
              attribute: false,
              unwrapped: false
            }
          ]
        },
        QueueMessage: {
          name: "QueueMessage",
          wireName: "QueueMessage",
          properties: [
            {
              name: "messageId",
              wireName: "MessageId",
              type: {
                kind: "string",
              },
              attribute: false,
              unwrapped: false
            },
            {
              name: "tags",
              wireName: "Tags",
              type: {
                kind: "array",
                element: {
                  kind: "string",
                }
              },
              attribute: false,
              unwrapped: false,
              itemName: "Tags"
            }
          ]
        }
      };
    `);
  });

  it("renders serialization entrypoint declarations with operation switch cases", () => {
    expect(
      <SourceFile>
        <DeserializeRequest operations={supportedOperations} />
        <hbr />
        <SerializeResponse operations={supportedOperations} />
        <hbr />
        <HasGeneratedSerialization operations={supportedOperations} />
      </SourceFile>,
    ).toRenderTo(`
      export async function deserializeRequest(
        name: string,
        req: IRequest,
      ): Promise<IHandlerParameters | undefined> {
        switch (name) {
          case "CreateQueue":
            return deserializeMetadataRequest(getGeneratedOperation(name), req);
          case "DeleteQueue":
            return deserializeMetadataRequest(getGeneratedOperation(name), req);
          default:
            return undefined;
        }
      }
      export function serializeResponse(
        name: string,
        res: IResponse,
        handlerResponse: any,
      ): boolean {
        switch (name) {
          case "CreateQueue":
            serializeMetadataResponse(getGeneratedOperation(name), res, handlerResponse);
            return true;
          case "DeleteQueue":
            serializeMetadataResponse(getGeneratedOperation(name), res, handlerResponse);
            return true;
          default:
            return false;
        }
      }
      export function hasGeneratedSerialization(name: string): boolean {
        switch (name) {
          case "CreateQueue":
            return true;
          case "DeleteQueue":
            return true;
          default:
            return false;
        }
      }
    `);
  });
});
