import { getFeature } from "@azure-tools/typespec-azure-resource-manager";
import {
  compilerAssert,
  Program,
  type ModelProperty,
  type Operation,
  type Service,
  type SourceFile,
  type Type,
} from "@typespec/compiler";
import { TwoLevelMap } from "@typespec/compiler/utils";
import { HttpOperation, Visibility } from "@typespec/http";
import { AdditionalInfo } from "@typespec/openapi";
import type {
  OpenAPI2Document,
  OpenAPI2Operation,
  OpenAPI2Parameter,
  OpenAPI2Schema,
  OpenAPI2SecurityScheme,
  Refable,
} from "./openapi2-document.js";

/**
 * A record containing the the OpenAPI 3 documents corresponding to
 * a particular service definition.
 */
export type AutorestServiceRecord =
  | AutorestUnversionedServiceRecord
  | AutorestVersionedServiceRecord;

export interface AutorestUnversionedServiceRecord extends AutorestEmitterResult {
  /** The service that generated this OpenAPI document */
  readonly service: Service;

  /** Whether the service is versioned */
  readonly versioned: false;
}

export interface AutorestVersionedServiceRecord {
  /** The service that generated this OpenAPI document */
  readonly service: Service;

  /** Whether the service is versioned */
  readonly versioned: true;

  /** The OpenAPI 3 document records for each version of this service */
  readonly versions: AutorestVersionedDocumentRecord[];
}

/**
 * A record containing an unversioned OpenAPI document and associated metadata.
 */
export interface AutorestVersionedDocumentRecord extends AutorestEmitterResult {
  /** The service that generated this OpenAPI document. */
  readonly service: Service;

  /** The version of the service. Absent if the service is unversioned. */
  readonly version: string;
}

export interface OperationExamples {
  readonly operationId: string;
  readonly examples: LoadedExample[];
}

export interface AutorestEmitterResult {
  /** The OpenAPI document*/
  readonly document: OpenAPI2Document;

  /** The examples */
  readonly operationExamples: OperationExamples[];

  /** Output file used */
  readonly outputFile: string;

  /** The feature associated with this file, if any */
  readonly feature?: string;
}

export interface LoadedExample {
  readonly relativePath: string;
  readonly file: SourceFile;
  readonly data: any;
}

/**
 * Represents a node that will hold a JSON reference. The value is computed
 * at the end so that we can defer decisions about the name that is
 * referenced.
 */
export class LateBoundReference {
  isLocal?: boolean;
  file?: string;
  value?: string;
  useFeatures: boolean = false;
  getFileContext: () => string | undefined = () => undefined;
  setLocalValue(program: Program, inValue: string, type?: Type): void {
    if (type) {
      switch (type.kind) {
        case "Model":
        case "ModelProperty":
          this.file = this.useFeatures ? getFeature(program, type)?.fileName : undefined;
          break;
        default:
          this.file = this.useFeatures ? "common" : undefined;
      }
    }
    this.isLocal = true;
    this.value = inValue;
  }
  setRemoteValue(inValue: string): void {
    this.isLocal = false;
    this.value = inValue;
  }
  toJSON() {
    compilerAssert(this.value, "Reference value never set.");
    const referencingFile = this.getFileContext();
    if (!this.isLocal) return this.value;
    if (referencingFile === undefined || this.file === undefined || referencingFile === this.file)
      return `#/definitions/${this.value}`;
    return `${this.file}/definitions/${this.value}`;
  }
}

/**
 * Represents a non-inlined schema that will be emitted as a definition.
 * Computation of the OpenAPI schema object is deferred.
 */
export interface PendingSchema {
  /** The TYPESPEC type for the schema */
  type: Type;

  /** The visibility to apply when computing the schema */
  visibility: Visibility;

  /**
   * The JSON reference to use to point to this schema.
   *
   * Note that its value will not be computed until all schemas have been
   * computed as we will add a suffix to the name if more than one schema
   * must be emitted for the type for different visibilities.
   */
  ref: LateBoundReference;

  /**
   * Determines the schema name if an override has been set
   * @param name The default name of the schema
   * @param visibility The visibility in which the schema is used
   * @returns The name of the given schema in the given visibility context
   */
  getSchemaNameOverride?: (name: string, visibility: Visibility) => string;
}

/**
 * Represents a schema that is ready to emit as its OpenAPI representation
 * has been produced.
 */
export interface ProcessedSchema extends PendingSchema {
  schema: OpenAPI2Schema | undefined;
}

/** Abstracts away methods to create a OpenAPI 2.0 document ragardless of layout. */
export interface OpenApi2DocumentProxy {
  deleteSecurityDefinitions(): void;
  getSecurityDefinitions(): any;
  deleteSecurity(): void;
  getSecurity(): any;
  deleteXmsPaths(): void;
  getXMsPaths(): any;
  deleteConsumes(): void;
  setConsumes(arg0: string[]): void;
  deleteProduces(): void;
  setProduces(arg0: string[]): void;
  definitions: any;
  processedSchemas: any;
  getParameterMap(): Record<string, OpenAPI2Parameter>;
  setParameter(key: string, property: ModelProperty, param: OpenAPI2Parameter): void;
  addAdditionalInfo(info?: AdditionalInfo): void;
  addSecuritySchemes(schemes: Record<string, OpenAPI2SecurityScheme>): void;
  addSecurityRequirements(requirements: Record<string, string[]>[]): void;
  addHostInfo(
    hostData: Pick<OpenAPI2Document, "host" | "x-ms-parameterized-host" | "schemes">,
  ): void;
  /**
   * Resolve the logical OpenAPI document into a set of emitter results
   */
  resolveDocuments(): Promise<AutorestEmitterResult[]>;
  /**
   * Get the parameters for an operation
   * @param op The operation to get parameters for
   */
  getParameters(op?: Operation): Map<ModelProperty, OpenAPI2Parameter>;
  /** Add a tag to an operation
   * @param op The operation to add a tag to
   * @param tag The tag to add
   */
  addTag(tag: string[], op?: Operation): void;
  /**
   * Add a produces MIME type to an operation
   * @param op The operation to add the produces MIME type to
   * @param produces The MIME type to add
   */
  addProduces(produces: string[], op?: Operation): void;

  /**
   * Add a consumes MIME type to an operation
   * @param op The operation to add the consumes MIME type to
   * @param consumes The MIME type to add
   */
  addConsumes(consumes: string[], op?: Operation): void;

  /**
   * Add examples to an operation
   * @param op The operation to add examples to
   * @param examples The examples to add
   */
  addExamples(examples: Map<string, Record<string, LoadedExample>>): void;

  /**
   * get the tags for an operation
   * @param op The operation to get tags for
   */
  getTags(op?: Operation): Set<string>;

  /**
   * Get the consumes MIME types for an operation
   * @param op The operation to get consumes MIME types for
   */
  getConsumes(op?: Operation): Set<string>;

  /**
   * Get the produces MIME types for an operation
   * @param op The operation to get produces MIME types for
   */
  getProduces(op?: Operation): Set<string>;

  /**
   * Get or add the path associated with the given operation
   * @param op The operation to get or add the path for
   */
  createOrGetEndpoint(op: HttpOperation): OpenAPI2Operation;

  /**
   * Get the file name for a given type
   * @param type The type to get the file name for
   */
  getFile(type: Type): string | undefined;

  /**
   * Get or add a parameter placeholder for a given property
   * @param property The property to get or add the parameter placeholder for
   */
  getOrAddParamPlaceholder(property: ModelProperty): Refable<OpenAPI2Parameter>;

  /** The schemas that are not yet resolved */
  pendingSchemas: TwoLevelMap<Type, Visibility, PendingSchema>;

  /** references included in schemas */
  refs: TwoLevelMap<Type, Visibility, LateBoundReference>;
}
