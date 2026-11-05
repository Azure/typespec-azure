import type { MemberType, Namespace, Program, Type } from "@typespec/compiler";
import { unsafe_Realm as Realm } from "@typespec/compiler/experimental";
import { $, type Typekit } from "@typespec/compiler/typekit";
import { listHttpOperationsIn, type HttpOperation } from "@typespec/http";
import {
  CodecRegistry,
  getJsonCodecRegistry,
  HttpCanonicalizer,
  OperationHttpCanonicalization,
} from "@typespec/http-canonicalization";
import type { OperationIdentity } from "../types.js";
import { getOperationIdentity, identityKey } from "./operation-identity.js";

class ApiContractCodecRegistry extends CodecRegistry {
  private readonly jsonCodecs: CodecRegistry;

  constructor(tk: Typekit) {
    super(tk);
    this.jsonCodecs = getJsonCodecRegistry(tk);
  }

  override encode(sourceType: Type, referenceTypes: MemberType[]) {
    const encoding = this.jsonCodecs.encode(sourceType, referenceTypes);
    // JSON number coercion erases API constraints such as int32 versus float64.
    return encoding.codec.id === "coerce-to-float64"
      ? { ...encoding, wireType: encoding.languageType }
      : encoding;
  }
}

/**
 * A canonicalized operation with its wire identity.
 */
export interface CanonicalizedOperation {
  /** Version-independent wire identity. */
  identity: OperationIdentity;
  /** The canonicalized HTTP operation (request/response shapes with wire types). */
  canonical: OperationHttpCanonicalization;
  /** The original HTTP operation (for source location tracing). */
  httpOperation: HttpOperation;
}

/**
 * Map of canonicalized operations keyed by identity string.
 */
export interface CanonicalizationResult {
  /** Operations keyed by identity string ("GET /widgets/{}"). */
  operations: Map<string, CanonicalizedOperation>;
  /** The canonicalizer instance (for reuse if needed). */
  canonicalizer: HttpCanonicalizer;
}

/**
 * Canonicalize all HTTP operations in a versioned namespace.
 *
 * Creates an HttpCanonicalizer, resolves all HTTP operations from the namespace,
 * canonicalizes each one, and returns them keyed by wire identity.
 */
export function canonicalizeOperations(
  program: Program,
  namespace: Namespace,
): CanonicalizationResult {
  const tk = $(new Realm(program, "breaking change HTTP canonicalization"));
  const canonicalizer = new HttpCanonicalizer(tk, new ApiContractCodecRegistry(tk));

  const [httpOps, _diagnostics] = listHttpOperationsIn(program, namespace);
  const operations = new Map<string, CanonicalizedOperation>();

  for (const httpOp of httpOps) {
    const identity = getOperationIdentity(httpOp);
    const key = identityKey(identity);
    const canonical = canonicalizer.canonicalize(httpOp.operation) as OperationHttpCanonicalization;

    operations.set(key, { identity, canonical, httpOperation: httpOp });
  }

  return { operations, canonicalizer };
}
