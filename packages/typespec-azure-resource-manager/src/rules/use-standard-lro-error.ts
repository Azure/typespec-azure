import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createRule,
  fileRef,
  isNullType,
  listServices,
  type Operation,
  type Service,
  type Type,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpService,
  Visibility,
  type HttpStatusCodeRange,
} from "@typespec/http";
import {
  getArmCommonTypeOpenAPIRef,
  getExternalTypeRef,
  isArmCommonType,
} from "../common-types.js";

const standardErrorReference =
  /.*\/common-types\/resource-management\/v(([1-9]\d+)|[2-9])\/types.json#\/definitions\/ErrorResponse/;

export const useStandardLroErrorRule = createRule({
  name: "use-standard-lro-error",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-lro-error.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-lro-error",
  description:
    "Long-running operation error payloads must use the common-types v2 or later ErrorResponse.",
  severity: "warning",
  messages: {
    default:
      "Error payloads of long-running operations must use the common-types v2 or later ErrorResponse. Use `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error payload.",
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program, { canonicalVisibility: Visibility.Read });
    const reported = new Set<Operation | Operation["node"]>();

    function isStandardError(type: Type, service: Service): boolean {
      let reference = getExternalTypeRef(program, type);
      if (
        !reference &&
        isArmCommonType(type) &&
        (type.kind === "Model" ||
          type.kind === "ModelProperty" ||
          type.kind === "Enum" ||
          type.kind === "Union")
      ) {
        reference = getArmCommonTypeOpenAPIRef(program, type, { service });
      }
      if (reference) {
        return standardErrorReference.test(
          reference.replaceAll("{arm-types-dir}", "/common-types/resource-management"),
        );
      }
      if (type.kind === "Union") {
        const members = [...type.variants.values()]
          .map((variant) => variant.type)
          .filter((member) => !isNullType(member));
        return members.length === 1 && isStandardError(members[0], service);
      }
      return false;
    }

    return {
      root() {
        for (const service of listServices(program)) {
          const [httpService] = getHttpService(program, service.type);
          for (const httpOperation of httpService.operations) {
            const operation = httpOperation.operation;
            const source = operation.node ?? operation;
            if (
              reported.has(source) ||
              httpOperation.verb === "get" ||
              getLroMetadata(program, operation) === undefined
            ) {
              continue;
            }

            const invalidBody = httpOperation.responses.some(
              (response) =>
                isErrorResponse(response.statusCodes) &&
                response.responses.some(
                  ({ body }) =>
                    body !== undefined &&
                    (body.bodyKind !== "single" ||
                      !isStandardError(
                        metadata.getEffectivePayloadType(body.type, Visibility.Read),
                        service,
                      )),
                ),
            );
            if (invalidBody) {
              context.reportDiagnostic({ target: operation });
              reported.add(source);
            }
          }
        }
      },
    };
  },
});

function isErrorResponse(status: number | "*" | HttpStatusCodeRange): boolean {
  return (
    status === "*" ||
    (typeof status === "number"
      ? status >= 400 && status < 600
      : status.start < 600 && status.end >= 400)
  );
}
