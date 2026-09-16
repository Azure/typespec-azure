import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  getArmCommonTypeOpenAPIRef,
  getArmProviderNamespace,
  getExternalTypeRef,
  isArmCommonType,
} from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
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

const standardErrorReference =
  /.*\/common-types\/resource-management\/v(([1-9]\d+)|[2-9])\/types.json#\/definitions\/ErrorResponse/;

export const lroErrorContentRule = createRule({
  name: "lro-error-content",
  description: "Native ARM LRO error payloads must use the common-types v2 or later ErrorResponse.",
  severity: "warning",
  messages: {
    default:
      "Error payloads of long running operations must use the common-types v2 or later ErrorResponse. Use `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error payload.",
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
      // A nullable standard error still describes the standard error payload.
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
          // Lintdiff runs mixed ARM/data-plane rules; remove this isolation on ARM promotion.
          if (!getArmProviderNamespace(program, service.type)) {
            continue;
          }
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
