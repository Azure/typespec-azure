import { getRef } from "@azure-tools/typespec-autorest";
import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  getArmCommonTypeOpenAPIRef,
  getArmProviderNamespace,
  getExternalTypeRef,
  isArmCommonType,
} from "@azure-tools/typespec-azure-resource-manager";
import {
  createTCGCContext,
  getMarkAsLro,
  isInScope,
} from "@azure-tools/typespec-client-generator-core";
import {
  compilerAssert,
  createRule,
  getService,
  isNullType,
  listServices,
  type Operation,
  type Service,
  type Type,
} from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import {
  createMetadataInfo,
  getHttpService,
  Visibility,
  type HttpStatusCodeRange,
} from "@typespec/http";
import { getExtensions, shouldInline } from "@typespec/openapi";
import { getVersioningMutators } from "@typespec/versioning";

const standardErrorReference =
  /.*\/common-types\/resource-management\/v(([1-9]\d+)|[2-9])\/types.json#\/definitions\/ErrorResponse/;

export const lroErrorContentRule = createRule({
  name: "lro-error-content",
  description:
    "LRO error response references must use the ARM common-types v2 or later ErrorResponse.",
  severity: "warning",
  messages: {
    default:
      "Error response references of long running operations must use the common-types v2 or later ErrorResponse. Use `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error reference.",
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program, { canonicalVisibility: Visibility.Read });
    const tcgc = createTCGCContext(program, "@azure-tools/typespec-autorest", {
      mutateNamespace: false,
    });
    const reported = new Set<Operation["node"]>();

    function hasInvalidReference(type: Type, service: Service, version?: string): boolean {
      let reference = getRef(program, type) || getExternalTypeRef(program, type);
      if (
        !reference &&
        isArmCommonType(type) &&
        (type.kind === "Model" ||
          type.kind === "ModelProperty" ||
          type.kind === "Enum" ||
          type.kind === "Union")
      ) {
        reference = getArmCommonTypeOpenAPIRef(program, type, { service, version });
      }
      if (reference) {
        // ARM's default directory is interpolated by AutoRest before emitting the reference.
        return !standardErrorReference.test(
          reference.replaceAll("{arm-types-dir}", "/common-types/resource-management"),
        );
      }
      if (
        (type.kind === "Scalar" && program.checker.isStdType(type)) ||
        type.kind === "String" ||
        type.kind === "StringTemplate" ||
        type.kind === "Number" ||
        type.kind === "Boolean" ||
        (type.kind === "Intrinsic" && type.name === "unknown")
      ) {
        return false;
      }
      type = metadata.getEffectivePayloadType(type, Visibility.Read);
      if (!shouldInline(program, type)) {
        return true;
      }
      // Inline nullable/single-member unions can still emit their member's top-level $ref.
      if (type.kind === "Union") {
        const members = [...type.variants.values()]
          .map((variant) => variant.type)
          .filter((member) => !isNullType(member));
        return members.length === 1 && hasInvalidReference(members[0], service, version);
      }
      return false;
    }

    function checkService(service: Service, version?: string) {
      const [httpService] = getHttpService(program, service.type);
      for (const httpOperation of httpService.operations) {
        const operation = httpOperation.operation;
        if (!isInScope(tcgc, operation)) {
          continue;
        }
        const extensions = getExtensions(program, operation);
        const isLro = extensions.has("x-ms-long-running-operation")
          ? extensions.get("x-ms-long-running-operation") === true
          : (httpOperation.verb !== "get" && getLroMetadata(program, operation) !== undefined) ||
            getMarkAsLro(tcgc, operation);
        if (!isLro || reported.has(operation.node)) {
          continue;
        }
        for (const response of httpOperation.responses) {
          if (!isErrorResponse(response.statusCodes)) {
            continue;
          }
          // AutoRest selects the last body; different bodies for one status are an emitter error.
          const bodies = response.responses.flatMap((r) => (r.body ? [r.body] : []));
          const body = bodies.at(-1);
          if (
            !body ||
            body.bodyKind !== "single" ||
            (body.type.kind === "Scalar" &&
              body.type.name === "bytes" &&
              bodies
                .flatMap((b) => b.contentTypes)
                .every(
                  (contentType) =>
                    contentType !== "application/json" && contentType !== "text/plain",
                ))
          ) {
            continue;
          }
          if (hasInvalidReference(body.type, service, version)) {
            context.reportDiagnostic({ target: operation });
            reported.add(operation.node);
            break;
          }
        }
      }
    }

    return {
      root() {
        for (const service of listServices(program)) {
          // Lintdiff runs mixed ARM/data-plane rules; descendants are included by getHttpService.
          if (!getArmProviderNamespace(program, service.type)) {
            continue;
          }
          const versioning = getVersioningMutators(program, service.type);
          if (versioning === undefined) {
            checkService(service);
            continue;
          }
          const snapshots =
            versioning.kind === "versioned"
              ? versioning.snapshots
              : [{ mutator: versioning.mutator, version: undefined }];
          for (const snapshot of snapshots) {
            const projected = unsafe_mutateSubgraphWithNamespace(
              program,
              [snapshot.mutator],
              service.type,
            );
            compilerAssert(projected.type.kind === "Namespace", "Expected a service namespace.");
            checkService(
              getService(program, projected.type) ?? { type: projected.type },
              snapshot.version?.value,
            );
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
