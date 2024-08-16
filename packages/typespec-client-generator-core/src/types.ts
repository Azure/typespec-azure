import { UnionEnum, getLroMetadata, getUnionAsEnum } from "@azure-tools/typespec-azure-core";
import {
  BooleanLiteral,
  BytesKnownEncoding,
  DateTimeKnownEncoding,
  Diagnostic,
  DurationKnownEncoding,
  EncodeData,
  Enum,
  EnumMember,
  IntrinsicScalarName,
  IntrinsicType,
  Model,
  ModelProperty,
  NumericLiteral,
  Operation,
  Scalar,
  StringLiteral,
  Tuple,
  Type,
  Union,
  createDiagnosticCollector,
  getDiscriminator,
  getEncode,
  getFormat,
  getKnownValues,
  getVisibility,
  ignoreDiagnostics,
  isErrorModel,
  isNeverType,
} from "@typespec/compiler";
import {
  Authentication,
  HttpOperationPart,
  Visibility,
  getAuthentication,
  getHttpPart,
  getServers,
  isHeader,
  isOrExtendsHttpFile,
  isStatusCode,
} from "@typespec/http";
import {
  getAccessOverride,
  getOverriddenClientMethod,
  getUsageOverride,
  isExclude,
  isInclude,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldFlattenProperty,
  shouldGenerateConvenient,
} from "./decorators.js";
import {
  AccessFlags,
  SdkArrayType,
  SdkBodyModelPropertyType,
  SdkBuiltInKinds,
  SdkBuiltInType,
  SdkClient,
  SdkConstantType,
  SdkCredentialParameter,
  SdkCredentialType,
  SdkDateTimeType,
  SdkDictionaryType,
  SdkDurationType,
  SdkEnumType,
  SdkEnumValueType,
  SdkModelPropertyType,
  SdkModelPropertyTypeBase,
  SdkModelType,
  SdkOperationGroup,
  SdkTupleType,
  SdkType,
  SdkUnionType,
  TCGCContext,
  UsageFlags,
  getKnownScalars,
  isSdkBuiltInKind,
  isSdkIntKind,
} from "./interfaces.js";
import {
  createGeneratedName,
  filterApiVersionsInEnum,
  getAvailableApiVersions,
  getDocHelper,
  getHttpOperationResponseHeaders,
  getLocationOfOperation,
  getNonNullOptions,
  getNullOption,
  getSdkTypeBaseHelper,
  getTypeDecorators,
  intOrFloat,
  isAzureCoreModel,
  isJsonContentType,
  isMultipartOperation,
  isNeverOrVoidType,
  isXmlContentType,
  updateWithApiVersionInformation,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import {
  getCrossLanguageDefinitionId,
  getEffectivePayloadType,
  getGeneratedName,
  getHttpOperationWithCache,
  getLibraryName,
  getPropertyNames,
} from "./public-utils.js";

import { getVersions } from "@typespec/versioning";
import { UnionEnumVariant } from "../../typespec-azure-core/dist/src/helpers/union-enums.js";
import { getSdkHttpParameter, isSdkHttpParameter } from "./http.js";

export function getTypeSpecBuiltInType(
  context: TCGCContext,
  kind: IntrinsicScalarName
): SdkBuiltInType {
  const global = context.program.getGlobalNamespaceType();
  const typeSpecNamespace = global.namespaces!.get("TypeSpec");
  const type = typeSpecNamespace!.scalars.get(kind)!;

  return getSdkBuiltInType(context, type) as SdkBuiltInType;
}

function getAnyType(context: TCGCContext, type: Type): [SdkBuiltInType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const anyType: SdkBuiltInType = {
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "any")),
    name: getLibraryName(context, type),
    encode: getEncodeHelper(context, type, "any"),
    crossLanguageDefinitionId: "",
  };
  return diagnostics.wrap(anyType);
}

function getEncodeHelper(context: TCGCContext, type: Type, kind: string): string {
  if (type.kind === "ModelProperty" || type.kind === "Scalar") {
    return getEncode(context.program, type)?.encoding || kind;
  }
  return kind;
}

/**
 * Add format info onto an sdk type. Since the format decorator
 * decorates the ModelProperty, we add the format info onto the property's internal
 * type.
 * @param context sdk context
 * @param type the original typespec type. Used to grab the format decorator off of
 * @param propertyType the type of the property, i.e. the internal type that we add the format info onto
 */
export function addFormatInfo(
  context: TCGCContext,
  type: ModelProperty | Scalar,
  propertyType: SdkType
): void {
  const innerType = propertyType.kind === "nullable" ? propertyType.type : propertyType;
  let format = getFormat(context.program, type) ?? "";

  // special case: we treat format: uri the same as format: url
  if (format === "uri") format = "url";

  if (isSdkBuiltInKind(format)) innerType.kind = format;
}

/**
 * Add encoding info onto an sdk type. Since the encoding decorator
 * decorates the ModelProperty, we add the encoding info onto the property's internal
 * type.
 * @param context sdk context
 * @param type the original typespec type. Used to grab the encoding decorator off of
 * @param propertyType the type of the property, i.e. the internal type that we add the encoding info onto
 */
export function addEncodeInfo(
  context: TCGCContext,
  type: ModelProperty | Scalar,
  propertyType: SdkType,
  defaultContentType?: string
): [void, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const innerType = propertyType.kind === "nullable" ? propertyType.type : propertyType;
  const encodeData = getEncode(context.program, type);
  if (innerType.kind === "duration") {
    if (!encodeData) return diagnostics.wrap(undefined);
    innerType.encode = encodeData.encoding as DurationKnownEncoding;
    innerType.wireType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, encodeData.type)
    ) as SdkBuiltInType;
  }
  if (innerType.kind === "utcDateTime" || innerType.kind === "offsetDateTime") {
    if (encodeData) {
      innerType.encode = encodeData.encoding as DateTimeKnownEncoding;
      innerType.wireType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, encodeData.type)
      ) as SdkBuiltInType;
    } else if (type.kind === "ModelProperty" && isHeader(context.program, type)) {
      innerType.encode = "rfc7231";
    }
  }
  if (innerType.kind === "bytes") {
    if (encodeData) {
      innerType.encode = encodeData.encoding as BytesKnownEncoding;
    } else if (!defaultContentType || defaultContentType === "application/json") {
      innerType.encode = "base64";
    } else {
      innerType.encode = "bytes";
    }
  }
  if (isSdkIntKind(innerType.kind)) {
    // only integer type is allowed to be encoded as string
    if (encodeData && "encode" in innerType) {
      const encode = getEncode(context.program, type);
      if (encode?.encoding) {
        innerType.encode = encode.encoding;
      }
      if (encode?.type) {
        // if we specify the encoding type in the decorator, we set the `.encode` string
        // to the kind of the encoding type
        innerType.encode = getSdkBuiltInType(context, encode.type).kind;
      }
    }
  }
  return diagnostics.wrap(undefined);
}

/**
 * Mapping of typespec scalar kinds to the built in kinds exposed in the SDK
 * @param context the TCGC context
 * @param scalar the original typespec scalar
 * @returns the corresponding sdk built in kind
 */
function getScalarKind(context: TCGCContext, scalar: Scalar): IntrinsicScalarName | "any" {
  if (context.program.checker.isStdType(scalar)) {
    return scalar.name;
  }

  // for those scalar defined as `scalar newThing;`,
  // the best we could do here is return as a `any` type with a name and namespace and let the generator figure what this is
  if (scalar.baseScalar === undefined) {
    return "any";
  }

  return getScalarKind(context, scalar.baseScalar);
}

/**
 * This function converts a Scalar into SdkBuiltInType.
 * @param context
 * @param type
 * @param kind
 * @returns
 */
function getSdkBuiltInTypeWithDiagnostics(
  context: TCGCContext,
  type: Scalar,
  kind: SdkBuiltInKinds
): [SdkBuiltInType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const docWrapper = getDocHelper(context, type);
  const stdType = {
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, kind)),
    name: getLibraryName(context, type),
    encode: getEncodeHelper(context, type, kind),
    description: docWrapper.description,
    details: docWrapper.details,
    baseType:
      type.baseScalar && !context.program.checker.isStdType(type) // we only calculate the base type when this type has a base type and this type is not a std type because for std types there is no point of calculating its base type.
        ? diagnostics.pipe(getSdkBuiltInTypeWithDiagnostics(context, type.baseScalar, kind))
        : undefined,
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
  };
  addEncodeInfo(context, type, stdType);
  addFormatInfo(context, type, stdType);
  return diagnostics.wrap(stdType);
}

/**
 * This function calculates the encode and wireType for a datetime or duration type.
 * We always first try to get the `@encode` decorator on this type and returns it if any.
 * If we did not get anything from the encode, we try to get the baseType's encode and wireType.
 * @param context
 * @param encodeData
 * @param baseType
 * @returns
 */
function getEncodeInfoForDateTimeOrDuration(
  context: TCGCContext,
  encodeData: EncodeData | undefined,
  baseType: SdkDateTimeType | SdkDurationType | undefined
): [string | undefined, SdkBuiltInType | undefined] {
  const encode = encodeData?.encoding;
  const wireType = encodeData?.type
    ? (getClientType(context, encodeData.type) as SdkBuiltInType)
    : undefined;

  // if we get something from the encode
  if (encode || wireType) {
    return [encode, wireType];
  }

  // if we did not get anything from the encode, try the baseType
  return [baseType?.encode, baseType?.wireType];
}

/**
 * This function converts a Scalar into SdkDateTimeType.
 * @param context
 * @param type
 * @param kind
 * @returns
 */
function getSdkDateTimeType(
  context: TCGCContext,
  type: Scalar,
  kind: "utcDateTime" | "offsetDateTime"
): [SdkDateTimeType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const docWrapper = getDocHelper(context, type);
  const baseType =
    type.baseScalar && !context.program.checker.isStdType(type) // we only calculate the base type when this type has a base type and this type is not a std type because for std types there is no point of calculating its base type.
      ? diagnostics.pipe(getSdkDateTimeType(context, type.baseScalar, kind))
      : undefined;
  const [encode, wireType] = getEncodeInfoForDateTimeOrDuration(
    context,
    getEncode(context.program, type),
    baseType
  );
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, kind)),
    name: getLibraryName(context, type),
    encode: (encode ?? "rfc3339") as DateTimeKnownEncoding,
    wireType: wireType ?? getTypeSpecBuiltInType(context, "string"),
    baseType: baseType,
    description: docWrapper.description,
    details: docWrapper.details,
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
  });
}

function getSdkDateTimeOrDurationOrBuiltInType(
  context: TCGCContext,
  type: Scalar
): [SdkDateTimeType | SdkDurationType | SdkBuiltInType, readonly Diagnostic[]] {
  // follow the extends hierarchy to determine the final kind of this type
  const kind = getScalarKind(context, type);

  if (kind === "utcDateTime" || kind === "offsetDateTime") {
    return getSdkDateTimeType(context, type, kind);
  }
  if (kind === "duration") {
    return getSdkDurationTypeWithDiagnostics(context, type, kind);
  }
  // handle the std types of typespec
  return getSdkBuiltInTypeWithDiagnostics(context, type, kind);
}

function getSdkTypeForLiteral(
  context: TCGCContext,
  type: NumericLiteral | StringLiteral | BooleanLiteral
): SdkBuiltInType {
  let kind: SdkBuiltInKinds;

  if (type.kind === "String") {
    kind = "string";
  } else if (type.kind === "Boolean") {
    kind = "boolean";
  } else {
    kind = intOrFloat(type.value);
  }
  return getTypeSpecBuiltInType(context, kind);
}

function getSdkTypeForIntrinsic(context: TCGCContext, type: IntrinsicType): SdkBuiltInType {
  const kind = "any";
  const diagnostics = createDiagnosticCollector();
  return {
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, kind)),
    name: getLibraryName(context, type),
    crossLanguageDefinitionId: "",
    encode: kind,
  };
}

export function getSdkBuiltInType(
  context: TCGCContext,
  type: Scalar | IntrinsicType | NumericLiteral | StringLiteral | BooleanLiteral
): SdkDateTimeType | SdkDurationType | SdkBuiltInType {
  switch (type.kind) {
    case "Scalar":
      return ignoreDiagnostics(getSdkDateTimeOrDurationOrBuiltInType(context, type));
    case "Intrinsic":
      return getSdkTypeForIntrinsic(context, type);
    case "String":
    case "Number":
    case "Boolean":
      return getSdkTypeForLiteral(context, type);
  }
}

export function getSdkDurationType(context: TCGCContext, type: Scalar): SdkDurationType {
  return ignoreDiagnostics(getSdkDurationTypeWithDiagnostics(context, type, "duration"));
}

/**
 * This function converts a Scalar into SdkDurationType.
 * @param context
 * @param type
 * @param kind
 * @returns
 */
function getSdkDurationTypeWithDiagnostics(
  context: TCGCContext,
  type: Scalar,
  kind: "duration"
): [SdkDurationType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const docWrapper = getDocHelper(context, type);
  const baseType =
    type.baseScalar && !context.program.checker.isStdType(type) // we only calculate the base type when this type has a base type and this type is not a std type because for std types there is no point of calculating its base type.
      ? diagnostics.pipe(getSdkDurationTypeWithDiagnostics(context, type.baseScalar, kind))
      : undefined;
  const [encode, wireType] = getEncodeInfoForDateTimeOrDuration(
    context,
    getEncode(context.program, type),
    baseType
  );
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, kind)),
    name: getLibraryName(context, type),
    encode: (encode ?? "ISO8601") as DurationKnownEncoding,
    wireType: wireType ?? getTypeSpecBuiltInType(context, "string"),
    baseType: baseType,
    description: docWrapper.description,
    details: docWrapper.details,
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
  });
}

export function getSdkArrayOrDict(
  context: TCGCContext,
  type: Model,
  operation?: Operation
): (SdkDictionaryType | SdkArrayType) | undefined {
  return ignoreDiagnostics(getSdkArrayOrDictWithDiagnostics(context, type, operation));
}

export function getSdkArrayOrDictWithDiagnostics(
  context: TCGCContext,
  type: Model,
  operation?: Operation
): [(SdkDictionaryType | SdkArrayType) | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  // if model with both indexer and properties or name should be a model with additional properties
  if (type.indexer !== undefined && type.properties.size === 0) {
    if (!isNeverType(type.indexer.key)) {
      const valueType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.indexer.value!, operation)
      );
      const name = type.indexer.key.name;
      if (name === "string" && type.name === "Record") {
        // model MyModel is Record<> {} should be model with additional properties
        if (type.sourceModel?.kind === "Model" && type.sourceModel?.name === "Record") {
          return diagnostics.wrap(undefined);
        }
        // other cases are dict
        return diagnostics.wrap({
          ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "dict")),
          keyType: diagnostics.pipe(
            getClientTypeWithDiagnostics(context, type.indexer.key, operation)
          ),
          valueType: valueType,
        });
      } else if (name === "integer") {
        // only array's index key name is integer
        return diagnostics.wrap({
          ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "array")),
          name: getLibraryName(context, type),
          valueType: valueType,
          crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type, operation),
        });
      }
    }
  }
  return diagnostics.wrap(undefined);
}

export function getSdkTuple(
  context: TCGCContext,
  type: Tuple,
  operation?: Operation
): SdkTupleType {
  return ignoreDiagnostics(getSdkTupleWithDiagnostics(context, type, operation));
}

export function getSdkTupleWithDiagnostics(
  context: TCGCContext,
  type: Tuple,
  operation?: Operation
): [SdkTupleType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "tuple")),
    values: type.values.map((x) =>
      diagnostics.pipe(getClientTypeWithDiagnostics(context, x, operation))
    ),
  });
}

export function getSdkUnion(context: TCGCContext, type: Union, operation?: Operation): SdkType {
  return ignoreDiagnostics(getSdkUnionWithDiagnostics(context, type, operation));
}

export function getSdkUnionWithDiagnostics(
  context: TCGCContext,
  type: Union,
  operation?: Operation
): [SdkType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const nonNullOptions = getNonNullOptions(type);
  const nullOption = getNullOption(type);
  let retval: SdkType | undefined = undefined;

  if (nonNullOptions.length === 0) {
    diagnostics.add(createDiagnostic({ code: "union-null", target: type }));
    return diagnostics.wrap(diagnostics.pipe(getAnyType(context, type)));
  }

  // if a union is `type | null`, then we will return a nullable wrapper type of the type
  if (nonNullOptions.length === 1 && nullOption !== undefined) {
    retval = diagnostics.pipe(getClientTypeWithDiagnostics(context, nonNullOptions[0], operation));
  } else if (
    // judge if the union can be converted to enum
    // if language does not need flatten union as enum
    // filter the case that union is composed of union or enum
    context.flattenUnionAsEnum ||
    ![...type.variants.values()].some((variant) => {
      return variant.type.kind === "Union" || variant.type.kind === "Enum";
    })
  ) {
    const unionAsEnum = diagnostics.pipe(getUnionAsEnum(type));
    if (unionAsEnum) {
      retval = diagnostics.pipe(getSdkUnionEnumWithDiagnostics(context, unionAsEnum, operation));
    }
  }

  // other cases
  if (retval === undefined) {
    retval = {
      ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "union")),
      name: getLibraryName(context, type) || getGeneratedName(context, type, operation),
      isGeneratedName: !type.name,
      values: nonNullOptions.map((x) =>
        diagnostics.pipe(getClientTypeWithDiagnostics(context, x, operation))
      ),
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type, operation),
    };
  }

  if (nullOption !== undefined) {
    retval = {
      ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "nullable")),
      type: retval,
    };
  }

  return diagnostics.wrap(retval);
}

function getSdkConstantWithDiagnostics(
  context: TCGCContext,
  type: StringLiteral | NumericLiteral | BooleanLiteral,
  operation?: Operation
): [SdkConstantType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  switch (type.kind) {
    case "Number":
    case "String":
    case "Boolean":
      const valueType = getSdkTypeForLiteral(context, type);
      return diagnostics.wrap({
        ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "constant")),
        value: type.value,
        valueType,
        name: getGeneratedName(context, type, operation),
        isGeneratedName: true,
      });
  }
}

export function getSdkConstant(
  context: TCGCContext,
  type: StringLiteral | NumericLiteral | BooleanLiteral,
  operation?: Operation
): SdkConstantType {
  return ignoreDiagnostics(getSdkConstantWithDiagnostics(context, type, operation));
}

function addDiscriminatorToModelType(
  context: TCGCContext,
  type: Model,
  model: SdkModelType
): [undefined, readonly Diagnostic[]] {
  const discriminator = getDiscriminator(context.program, type);
  const diagnostics = createDiagnosticCollector();
  if (discriminator) {
    let discriminatorType: SdkType | undefined = undefined;
    for (let i = 0; i < model.properties.length; i++) {
      const property = model.properties[i];
      if (property.kind === "property" && property.__raw?.name === discriminator.propertyName) {
        discriminatorType = property.type;
      }
    }

    let discriminatorProperty;
    for (const childModel of type.derivedModels) {
      const childModelSdkType = diagnostics.pipe(getSdkModelWithDiagnostics(context, childModel));
      for (const property of childModelSdkType.properties) {
        if (property.kind === "property") {
          if (property.__raw?.name === discriminator?.propertyName) {
            if (property.type.kind !== "constant" && property.type.kind !== "enumvalue") {
              diagnostics.add(
                createDiagnostic({
                  code: "discriminator-not-constant",
                  target: type,
                  format: { discriminator: property.name },
                })
              );
            } else if (typeof property.type.value !== "string") {
              diagnostics.add(
                createDiagnostic({
                  code: "discriminator-not-string",
                  target: type,
                  format: {
                    discriminator: property.name,
                    discriminatorValue: String(property.type.value),
                  },
                })
              );
            } else {
              // map string value type to enum value type
              if (property.type.kind === "constant" && discriminatorType?.kind === "enum") {
                for (const value of discriminatorType.values) {
                  if (value.value === property.type.value) {
                    property.type = value;
                  }
                }
              }
              childModelSdkType.discriminatorValue = property.type.value as string;
              property.discriminator = true;
              if (model.discriminatedSubtypes === undefined) {
                model.discriminatedSubtypes = {};
              }
              model.discriminatedSubtypes[property.type.value as string] = childModelSdkType;
              discriminatorProperty = property;
            }
          }
        }
      }
    }
    for (let i = 0; i < model.properties.length; i++) {
      const property = model.properties[i];
      if (property.kind === "property" && property.__raw?.name === discriminator.propertyName) {
        property.discriminator = true;
        model.discriminatorProperty = property;
        return diagnostics.wrap(undefined);
      }
    }

    if (discriminatorProperty) {
      if (discriminatorProperty.type.kind === "constant") {
        discriminatorType = { ...discriminatorProperty.type.valueType };
      } else if (discriminatorProperty.type.kind === "enumvalue") {
        discriminatorType = discriminatorProperty.type.enumType;
      }
    } else {
      discriminatorType = getTypeSpecBuiltInType(context, "string");
    }
    const name = discriminatorProperty ? discriminatorProperty.name : discriminator.propertyName;
    model.properties.splice(0, 0, {
      kind: "property",
      description: `Discriminator property for ${model.name}.`,
      optional: false,
      discriminator: true,
      serializedName: discriminatorProperty
        ? discriminatorProperty.serializedName
        : discriminator.propertyName,
      type: discriminatorType!,
      name,
      isGeneratedName: false,
      onClient: false,
      apiVersions: discriminatorProperty
        ? getAvailableApiVersions(context, discriminatorProperty.__raw!, type)
        : getAvailableApiVersions(context, type, type),
      isApiVersionParam: false,
      isMultipartFileInput: false, // discriminator property cannot be a file
      flatten: false, // discriminator properties can not be flattened
      crossLanguageDefinitionId: `${model.crossLanguageDefinitionId}.${name}`,
      decorators: [],
    });
    model.discriminatorProperty = model.properties[0];
  }
  return diagnostics.wrap(undefined);
}

export function getSdkModel(
  context: TCGCContext,
  type: Model,
  operation?: Operation
): SdkModelType {
  return ignoreDiagnostics(getSdkModelWithDiagnostics(context, type, operation));
}

export function getSdkModelWithDiagnostics(
  context: TCGCContext,
  type: Model,
  operation?: Operation
): [SdkModelType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let sdkType = context.modelsMap?.get(type) as SdkModelType | undefined;

  if (sdkType) {
    updateModelsMap(context, type, sdkType);
  } else {
    const docWrapper = getDocHelper(context, type);
    const name = getLibraryName(context, type) || getGeneratedName(context, type, operation);
    const usage = isErrorModel(context.program, type) ? UsageFlags.Error : UsageFlags.None; // initial usage we can tell just by looking at the model
    sdkType = {
      ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "model")),
      name: name,
      isGeneratedName: !type.name,
      description: docWrapper.description,
      details: docWrapper.details,
      properties: [],
      additionalProperties: undefined, // going to set additional properties in the next few lines when we look at base model
      access: "public",
      usage,
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type, operation),
      apiVersions: getAvailableApiVersions(context, type, type.namespace),
    };
    updateModelsMap(context, type, sdkType);

    // model MyModel is Record<> {} should be model with additional properties
    if (type.sourceModel?.kind === "Model" && type.sourceModel?.name === "Record") {
      sdkType.additionalProperties = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.sourceModel!.indexer!.value!, operation)
      );
    }
    // model MyModel { ...Record<>} should be model with additional properties
    if (type.indexer) {
      sdkType.additionalProperties = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.indexer.value, operation)
      );
    }
    // propreties should be generated first since base model'sdiscriminator handling is depend on derived model's properties
    diagnostics.pipe(addPropertiesToModelType(context, type, sdkType, operation));
    if (type.baseModel) {
      sdkType.baseModel = context.modelsMap?.get(type.baseModel) as SdkModelType | undefined;
      if (sdkType.baseModel === undefined) {
        const baseModel = diagnostics.pipe(
          getClientTypeWithDiagnostics(context, type.baseModel, operation)
        ) as SdkDictionaryType | SdkModelType;
        if (baseModel.kind === "dict") {
          // model MyModel extends Record<> {} should be model with additional properties
          sdkType.additionalProperties = baseModel.valueType;
        } else {
          sdkType.baseModel = baseModel;
        }
      }
    }
    diagnostics.pipe(addDiscriminatorToModelType(context, type, sdkType));

    updateModelsMap(context, type, sdkType);
  }
  return diagnostics.wrap(sdkType);
}

function getSdkEnumValueType(
  context: TCGCContext,
  values:
    | IterableIterator<EnumMember>
    | IterableIterator<UnionEnumVariant<string>>
    | IterableIterator<UnionEnumVariant<number>>
): [SdkBuiltInType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let kind: "string" | "int32" | "float32" = "string";
  for (const value of values) {
    if (typeof value.value === "number") {
      kind = intOrFloat(value.value);
      if (kind === "float32") {
        break;
      }
    } else if (typeof value.value === "string") {
      kind = "string";
      break;
    }
  }

  return diagnostics.wrap(getTypeSpecBuiltInType(context, kind!));
}

function getUnionAsEnumValueType(
  context: TCGCContext,
  union: Union
): [SdkBuiltInType | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const nonNullOptions = getNonNullOptions(union);
  for (const option of nonNullOptions) {
    if (option.kind === "Union") {
      const ret = diagnostics.pipe(getUnionAsEnumValueType(context, option));
      if (ret) return diagnostics.wrap(ret);
    } else if (option.kind === "Scalar") {
      const ret = diagnostics.pipe(getClientTypeWithDiagnostics(context, option)) as SdkBuiltInType;
      return diagnostics.wrap(ret);
    }
  }

  return diagnostics.wrap(undefined);
}

export function getSdkEnumValue(
  context: TCGCContext,
  enumType: SdkEnumType,
  type: EnumMember
): SdkEnumValueType {
  return ignoreDiagnostics(getSdkEnumValueWithDiagnostics(context, enumType, type));
}

function getSdkEnumValueWithDiagnostics(
  context: TCGCContext,
  enumType: SdkEnumType,
  type: EnumMember
): [SdkEnumValueType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const docWrapper = getDocHelper(context, type);
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "enumvalue")),
    name: getLibraryName(context, type),
    value: type.value ?? type.name,
    description: docWrapper.description,
    details: docWrapper.details,
    enumType,
    valueType: enumType.valueType,
  });
}

export function getSdkEnum(context: TCGCContext, type: Enum, operation?: Operation): SdkEnumType {
  return ignoreDiagnostics(getSdkEnumWithDiagnostics(context, type, operation));
}

function getSdkEnumWithDiagnostics(
  context: TCGCContext,
  type: Enum,
  operation?: Operation
): [SdkEnumType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let sdkType = context.modelsMap?.get(type) as SdkEnumType | undefined;
  if (!sdkType) {
    const docWrapper = getDocHelper(context, type);
    sdkType = {
      ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "enum")),
      name: getLibraryName(context, type),
      isGeneratedName: false,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType: diagnostics.pipe(getSdkEnumValueType(context, type.members.values())),
      values: [],
      isFixed: true, // enums are always fixed after we switch to use union to represent extensible enum
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: "public", // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type, operation),
      apiVersions: getAvailableApiVersions(context, type, type.namespace),
      isUnionAsEnum: false,
    };
    for (const member of type.members.values()) {
      sdkType.values.push(
        diagnostics.pipe(getSdkEnumValueWithDiagnostics(context, sdkType, member))
      );
    }
  }
  updateModelsMap(context, type, sdkType);
  return diagnostics.wrap(sdkType);
}

function getSdkUnionEnumValues(
  context: TCGCContext,
  type: UnionEnum,
  enumType: SdkEnumType
): [SdkEnumValueType[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const values: SdkEnumValueType[] = [];
  for (const member of type.flattenedMembers.values()) {
    const docWrapper = getDocHelper(context, member.type);
    const name = getLibraryName(context, member.type);
    values.push({
      ...diagnostics.pipe(getSdkTypeBaseHelper(context, member.type, "enumvalue")),
      name: name ? name : `${member.value}`,
      description: docWrapper.description,
      details: docWrapper.details,
      value: member.value,
      valueType: enumType.valueType,
      enumType,
    });
  }
  return diagnostics.wrap(values);
}

export function getSdkUnionEnum(context: TCGCContext, type: UnionEnum, operation?: Operation) {
  return ignoreDiagnostics(getSdkUnionEnumWithDiagnostics(context, type, operation));
}

export function getSdkUnionEnumWithDiagnostics(
  context: TCGCContext,
  type: UnionEnum,
  operation?: Operation
): [SdkEnumType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const union = type.union;
  let sdkType = context.modelsMap?.get(union) as SdkEnumType | undefined;
  if (!sdkType) {
    const docWrapper = getDocHelper(context, union);
    const name = getLibraryName(context, type.union) || getGeneratedName(context, union, operation);
    sdkType = {
      ...diagnostics.pipe(getSdkTypeBaseHelper(context, type.union, "enum")),
      name,
      isGeneratedName: !type.union.name,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType:
        diagnostics.pipe(getUnionAsEnumValueType(context, type.union)) ??
        diagnostics.pipe(getSdkEnumValueType(context, type.flattenedMembers.values())),
      values: [],
      isFixed: !type.open,
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: "public", // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, union, operation),
      apiVersions: getAvailableApiVersions(context, type.union, type.union.namespace),
      isUnionAsEnum: true,
    };
    sdkType.values = diagnostics.pipe(getSdkUnionEnumValues(context, type, sdkType));
  }
  updateModelsMap(context, type.union, sdkType);
  return diagnostics.wrap(sdkType);
}

function getKnownValuesEnum(
  context: TCGCContext,
  type: Scalar | ModelProperty,
  operation?: Operation
): [SdkEnumType | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const knownValues = getKnownValues(context.program, type);
  if (!knownValues) {
    return diagnostics.wrap(undefined);
  }
  if (type.kind === "ModelProperty") {
    const sdkType = diagnostics.pipe(getSdkEnumWithDiagnostics(context, knownValues, operation));
    return diagnostics.wrap(sdkType);
  } else {
    let sdkType = context.modelsMap?.get(type) as SdkEnumType | undefined;
    if (!sdkType) {
      const docWrapper = getDocHelper(context, type);
      sdkType = {
        ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "enum")),
        name: getLibraryName(context, type),
        isGeneratedName: false,
        description: docWrapper.description,
        details: docWrapper.details,
        valueType: diagnostics.pipe(getSdkEnumValueType(context, knownValues.members.values())),
        values: [],
        isFixed: false,
        isFlags: false,
        usage: UsageFlags.None, // We will add usage as we loop through the operations
        access: "public", // Dummy value until we update models map
        crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type, operation),
        apiVersions: getAvailableApiVersions(context, type, type.namespace),
        isUnionAsEnum: false,
      };
      for (const member of knownValues.members.values()) {
        sdkType.values.push(
          diagnostics.pipe(getSdkEnumValueWithDiagnostics(context, sdkType, member))
        );
      }
    }
    updateModelsMap(context, type, sdkType);
    return diagnostics.wrap(sdkType);
  }
}

export function getClientTypeWithDiagnostics(
  context: TCGCContext,
  type: Type,
  operation?: Operation
): [SdkType, readonly Diagnostic[]] {
  if (!context.knownScalars) {
    context.knownScalars = getKnownScalars();
  }
  const diagnostics = createDiagnosticCollector();
  let retval: SdkType | undefined = undefined;
  switch (type.kind) {
    case "String":
    case "Number":
    case "Boolean":
      retval = diagnostics.pipe(getSdkConstantWithDiagnostics(context, type));
      break;
    case "Tuple":
      retval = diagnostics.pipe(getSdkTupleWithDiagnostics(context, type, operation));
      break;
    case "Model":
      retval = diagnostics.pipe(getSdkArrayOrDictWithDiagnostics(context, type, operation));
      if (retval === undefined) {
        const httpPart = getHttpPart(context.program, type);
        if (httpPart === undefined) {
          retval = diagnostics.pipe(getSdkModelWithDiagnostics(context, type, operation));
        } else {
          retval = diagnostics.pipe(
            getClientTypeWithDiagnostics(context, httpPart.type, operation)
          );
        }
      }
      break;
    case "Intrinsic":
      retval = getSdkTypeForIntrinsic(context, type);
      break;
    case "Scalar":
      retval = diagnostics.pipe(getKnownValuesEnum(context, type, operation));
      if (retval) {
        break;
      }
      retval = diagnostics.pipe(getSdkDateTimeOrDurationOrBuiltInType(context, type));
      break;
    case "Enum":
      retval = diagnostics.pipe(getSdkEnumWithDiagnostics(context, type, operation));
      break;
    case "Union":
      retval = diagnostics.pipe(getSdkUnionWithDiagnostics(context, type, operation));
      break;
    case "ModelProperty":
      const innerType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.type, operation)
      );
      diagnostics.pipe(addEncodeInfo(context, type, innerType));
      addFormatInfo(context, type, innerType);
      retval = diagnostics.pipe(getKnownValuesEnum(context, type, operation)) ?? innerType;
      break;
    case "UnionVariant":
      const unionType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.union, operation)
      );
      if (unionType.kind === "enum") {
        retval = unionType.values.find((x) => x.name === getLibraryName(context, type))!;
      } else {
        retval = diagnostics.pipe(getClientTypeWithDiagnostics(context, type.type, operation));
      }
      break;
    case "EnumMember":
      const enumType = diagnostics.pipe(getSdkEnumWithDiagnostics(context, type.enum, operation));
      retval = diagnostics.pipe(getSdkEnumValueWithDiagnostics(context, enumType, type));
      break;
    default:
      retval = diagnostics.pipe(getAnyType(context, type));
      diagnostics.add(
        createDiagnostic({ code: "unsupported-kind", target: type, format: { kind: type.kind } })
      );
  }
  return diagnostics.wrap(retval);
}

export function getClientType(context: TCGCContext, type: Type, operation?: Operation): SdkType {
  return ignoreDiagnostics(getClientTypeWithDiagnostics(context, type, operation));
}

export function isReadOnly(property: SdkBodyModelPropertyType) {
  if (
    property.visibility &&
    property.visibility.includes(Visibility.Read) &&
    property.visibility.length === 1
  ) {
    return true;
  }
  return false;
}

function getSdkVisibility(context: TCGCContext, type: ModelProperty): Visibility[] | undefined {
  const visibility = getVisibility(context.program, type);
  if (visibility) {
    const result: Visibility[] = [];
    if (visibility.includes("read")) {
      result.push(Visibility.Read);
    }
    if (visibility.includes("create")) {
      result.push(Visibility.Create);
    }
    if (visibility.includes("update")) {
      result.push(Visibility.Update);
    }
    if (visibility.includes("delete")) {
      result.push(Visibility.Delete);
    }
    if (visibility.includes("query")) {
      result.push(Visibility.Query);
    }
    return result;
  }
  return undefined;
}

function getSdkCredentialType(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
  authentication: Authentication
): SdkCredentialType | SdkUnionType<SdkCredentialType> {
  const credentialTypes: SdkCredentialType[] = [];
  for (const option of authentication.options) {
    for (const scheme of option.schemes) {
      credentialTypes.push({
        __raw: client.service,
        kind: "credential",
        scheme: scheme,
        decorators: [],
      });
    }
  }
  if (credentialTypes.length > 1) {
    return {
      __raw: client.service,
      kind: "union",
      values: credentialTypes,
      name: createGeneratedName(context, client.service, "CredentialUnion"),
      isGeneratedName: true,
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, client.service),
      decorators: [],
    } as SdkUnionType<SdkCredentialType>;
  }
  return credentialTypes[0];
}

export function getSdkCredentialParameter(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup
): SdkCredentialParameter | undefined {
  const auth = getAuthentication(context.program, client.service);
  if (!auth) return undefined;
  const name = "credential";
  return {
    type: getSdkCredentialType(context, client, auth),
    kind: "credential",
    name,
    isGeneratedName: true,
    description: "Credential used to authenticate requests to the service.",
    apiVersions: getAvailableApiVersions(context, client.service, client.type),
    onClient: true,
    optional: false,
    isApiVersionParam: false,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, client.service)}.credential`,
    decorators: [],
  };
}

export function getSdkModelPropertyTypeBase(
  context: TCGCContext,
  type: ModelProperty,
  operation?: Operation
): [SdkModelPropertyTypeBase, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  // get api version info so we can cache info about its api versions before we get to property type level
  const apiVersions = getAvailableApiVersions(context, type, operation || type.model);
  let propertyType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type.type, operation));
  diagnostics.pipe(addEncodeInfo(context, type, propertyType));
  addFormatInfo(context, type, propertyType);
  const knownValues = getKnownValues(context.program, type);
  if (knownValues) {
    propertyType = diagnostics.pipe(getSdkEnumWithDiagnostics(context, knownValues, operation));
  }
  const docWrapper = getDocHelper(context, type);
  const name = getPropertyNames(context, type)[0];
  return diagnostics.wrap({
    __raw: type,
    description: docWrapper.description,
    details: docWrapper.details,
    apiVersions,
    type: propertyType,
    name,
    isGeneratedName: false,
    optional: type.optional,
    ...updateWithApiVersionInformation(
      context,
      type,
      operation ? getLocationOfOperation(operation) : undefined
    ),
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type, operation),
    decorators: diagnostics.pipe(getTypeDecorators(context, type)),
  });
}

function isFilePart(context: TCGCContext, type: SdkType): boolean {
  if (type.kind === "array") {
    // HttpFile<T>[]
    return isFilePart(context, type.valueType);
  } else if (type.kind === "bytes") {
    // Http<bytes>
    return true;
  } else if (type.kind === "model") {
    if (type.__raw && isOrExtendsHttpFile(context.program, type.__raw)) {
      // Http<File>
      return true;
    }
    // HttpPart<{@body body: bytes}> or HttpPart<{@body body: File}>
    const body = type.properties.find((x) => x.kind === "body");
    if (body) {
      return isFilePart(context, body.type);
    }
  }
  return false;
}

function getHttpOperationParts(context: TCGCContext, operation: Operation): HttpOperationPart[] {
  const body = getHttpOperationWithCache(context, operation).parameters.body;
  if (body?.bodyKind === "multipart") {
    return body.parts;
  }
  return [];
}

function hasHttpPart(context: TCGCContext, type: Type): boolean {
  if (type.kind === "Model") {
    if (type.indexer) {
      // HttpPart<T>[]
      return (
        type.indexer.key.name === "integer" &&
        getHttpPart(context.program, type.indexer.value) !== undefined
      );
    } else {
      // HttpPart<T>
      return getHttpPart(context.program, type) !== undefined;
    }
  }
  return false;
}

function getHttpOperationPart(
  context: TCGCContext,
  type: ModelProperty,
  operation: Operation
): HttpOperationPart | undefined {
  if (hasHttpPart(context, type.type)) {
    const httpOperationParts = getHttpOperationParts(context, operation);
    if (
      type.model &&
      httpOperationParts.length > 0 &&
      httpOperationParts.length === type.model.properties.size
    ) {
      const index = Array.from(type.model.properties.values()).findIndex((p) => p === type);
      if (index !== -1) {
        return httpOperationParts[index];
      }
    }
  }
  return undefined;
}

function updateMultiPartInfo(
  context: TCGCContext,
  type: ModelProperty,
  base: SdkBodyModelPropertyType,
  operation: Operation
): [void, readonly Diagnostic[]] {
  const httpOperationPart = getHttpOperationPart(context, type, operation);
  const diagnostics = createDiagnosticCollector();
  if (httpOperationPart) {
    // body decorated with @multipartBody
    base.multipartOptions = {
      isFilePart: isFilePart(context, base.type),
      isMulti: httpOperationPart.multi,
      filename: httpOperationPart.filename
        ? diagnostics.pipe(getSdkModelPropertyType(context, httpOperationPart.filename, operation))
        : undefined,
      contentType: httpOperationPart.body.contentTypeProperty
        ? diagnostics.pipe(
            getSdkModelPropertyType(context, httpOperationPart.body.contentTypeProperty, operation)
          )
        : undefined,
      defaultContentTypes: httpOperationPart.body.contentTypes,
    };
    // after https://github.com/microsoft/typespec/issues/3779 fixed, could use httpOperationPart.name directly
    const httpPart = getHttpPart(context.program, type.type);
    if (httpPart?.options?.name) {
      base.serializedName = httpPart?.options?.name;
    }
  } else {
    // common body
    const httpOperation = getHttpOperationWithCache(context, operation);
    const operationIsMultipart = Boolean(
      httpOperation && httpOperation.parameters.body?.contentTypes.includes("multipart/form-data")
    );
    if (operationIsMultipart) {
      const isBytesInput =
        base.type.kind === "bytes" ||
        (base.type.kind === "array" && base.type.valueType.kind === "bytes");
      // Currently we only recognize bytes and list of bytes as potential file inputs
      if (isBytesInput && getEncode(context.program, type)) {
        diagnostics.add(
          createDiagnostic({
            code: "encoding-multipart-bytes",
            target: type,
          })
        );
      }
      base.multipartOptions = {
        isFilePart: isBytesInput,
        isMulti: base.type.kind === "array",
        defaultContentTypes: [],
      };
    }
  }
  if (base.multipartOptions !== undefined) {
    base.isMultipartFileInput = base.multipartOptions.isFilePart;
  }

  return diagnostics.wrap(undefined);
}

export function getSdkModelPropertyType(
  context: TCGCContext,
  type: ModelProperty,
  operation?: Operation
): [SdkModelPropertyType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const base = diagnostics.pipe(getSdkModelPropertyTypeBase(context, type, operation));

  if (isSdkHttpParameter(context, type)) return getSdkHttpParameter(context, type, operation!);
  const result: SdkBodyModelPropertyType = {
    ...base,
    kind: "property",
    optional: type.optional,
    visibility: getSdkVisibility(context, type),
    discriminator: false,
    serializedName: getPropertyNames(context, type)[1],
    isMultipartFileInput: false,
    flatten: shouldFlattenProperty(context, type),
  };
  if (operation) {
    const httpOperation = getHttpOperationWithCache(context, operation);
    if (
      type.model &&
      httpOperation.parameters.body &&
      httpOperation.parameters.body.type === type.model
    ) {
      // only add multipartOptions for property of multipart body
      diagnostics.pipe(updateMultiPartInfo(context, type, result, operation));
    }
  }
  return diagnostics.wrap(result);
}

function addPropertiesToModelType(
  context: TCGCContext,
  type: Model,
  sdkType: SdkType,
  operation?: Operation
): [void, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  for (const property of type.properties.values()) {
    if (
      isStatusCode(context.program, property) ||
      isNeverOrVoidType(property.type) ||
      sdkType.kind !== "model"
    ) {
      continue;
    }
    const clientProperty = diagnostics.pipe(getSdkModelPropertyType(context, property, operation));
    if (sdkType.properties) {
      sdkType.properties.push(clientProperty);
    } else {
      sdkType.properties = [clientProperty];
    }
  }
  return diagnostics.wrap(undefined);
}

function updateModelsMap(context: TCGCContext, type: Type, sdkType: SdkType) {
  if (sdkType.kind !== "model" && sdkType.kind !== "enum") {
    return;
  }

  if (context.modelsMap === undefined) {
    context.modelsMap = new Map<Type, SdkModelType | SdkEnumType>();
  }
  const value = context.modelsMap.get(type);
  if (value) {
    sdkType = value;
  } else {
    context.modelsMap.set(type, sdkType);
  }
}

interface ModelUsageOptions {
  seenModelNames?: Set<SdkType>;
  propagation?: boolean;
  // this is used to prevent propagation usage from subtype to base type's other subtypes
  ignoreSubTypeStack?: boolean[];
  isOverride?: boolean;
}

function updateUsageOrAccessOfModel(
  context: TCGCContext,
  value: UsageFlags | AccessFlags,
  type?: SdkType,
  options?: ModelUsageOptions
): void {
  options = options ?? {};
  options.propagation = options?.propagation ?? true;
  options.ignoreSubTypeStack = options.ignoreSubTypeStack ?? [];
  if (!type) return;
  if (options?.seenModelNames === undefined) {
    options.seenModelNames = new Set<SdkType>();
  }
  if (type.kind === "model" && options.seenModelNames.has(type)) return; // avoid circular references
  if (type.kind === "array" || type.kind === "dict") {
    return updateUsageOrAccessOfModel(context, value, type.valueType, options);
  }
  if (type.kind === "union") {
    for (const unionType of type.values) {
      updateUsageOrAccessOfModel(context, value, unionType, options);
    }
    return;
  }
  if (type.kind === "enumvalue") {
    updateUsageOrAccessOfModel(context, value, type.enumType, options);
    return;
  }
  if (type.kind === "nullable") {
    updateUsageOrAccessOfModel(context, value, type.type, options);
    return;
  }
  if (type.kind !== "model" && type.kind !== "enum") return;
  options.seenModelNames.add(type);

  if (typeof value === "number") {
    // usage set
    const usageOverride = getUsageOverride(context, type.__raw as any);
    if (usageOverride) {
      type.usage |= usageOverride | value;
    } else {
      type.usage |= value;
    }
  } else {
    // access set
    if (!type.__accessSet || type.access !== "public") {
      type.access = value;
      type.__accessSet = true;
    }
    if (options.isOverride) {
      type.__accessSet = true;
    }
  }

  if (type.kind === "enum") return;
  if (!options.propagation) return;
  if (type.baseModel) {
    options.ignoreSubTypeStack.push(true);
    updateUsageOrAccessOfModel(context, value, type.baseModel, options);
    options.ignoreSubTypeStack.pop();
  }
  if (
    type.discriminatedSubtypes &&
    (options.ignoreSubTypeStack.length === 0 || !options.ignoreSubTypeStack.at(-1))
  ) {
    for (const discriminatedSubtype of Object.values(type.discriminatedSubtypes)) {
      options.ignoreSubTypeStack.push(false);
      updateUsageOrAccessOfModel(context, value, discriminatedSubtype, options);
      options.ignoreSubTypeStack.pop();
    }
  }
  if (type.additionalProperties) {
    options.ignoreSubTypeStack.push(false);
    updateUsageOrAccessOfModel(context, value, type.additionalProperties, options);
    options.ignoreSubTypeStack.pop();
  }
  for (const property of type.properties) {
    options.ignoreSubTypeStack.push(false);
    if (property.kind === "property" && isReadOnly(property) && value === UsageFlags.Input) {
      continue;
    }
    updateUsageOrAccessOfModel(context, value, property.type, options);
    options.ignoreSubTypeStack.pop();
  }
}

function updateTypesFromOperation(
  context: TCGCContext,
  operation: Operation
): [void, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const program = context.program;
  const httpOperation = getHttpOperationWithCache(context, operation);
  const generateConvenient = shouldGenerateConvenient(context, operation);
  const overriddenClientMethod = getOverriddenClientMethod(context, operation);
  for (const param of (overriddenClientMethod ?? operation).parameters.properties.values()) {
    if (isNeverOrVoidType(param.type)) continue;
    // if it is a body model, skip
    if (httpOperation.parameters.body?.property === param) continue;
    const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, param.type, operation));
    if (generateConvenient) {
      updateUsageOrAccessOfModel(context, UsageFlags.Input, sdkType);
    }
    const access = getAccessOverride(context, operation) ?? "public";
    updateUsageOrAccessOfModel(context, access, sdkType);
  }
  for (const param of httpOperation.parameters.parameters) {
    if (isNeverOrVoidType(param.param.type)) continue;
    const sdkType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, param.param.type, operation)
    );
    if (generateConvenient) {
      updateUsageOrAccessOfModel(context, UsageFlags.Input, sdkType);
    }
    const access = getAccessOverride(context, operation) ?? "public";
    updateUsageOrAccessOfModel(context, access, sdkType);
  }
  const httpBody = httpOperation.parameters.body;
  if (httpBody && !isNeverOrVoidType(httpBody.type)) {
    const sdkType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, httpBody.type, operation)
    );
    const multipartOperation = isMultipartOperation(context, operation);
    // this part should be put before setting current body's usage because it is based on the previous usage
    if (
      sdkType.kind === "model" &&
      ((!multipartOperation && (sdkType.usage & UsageFlags.MultipartFormData) > 0) ||
        (multipartOperation &&
          (sdkType.usage & UsageFlags.Input) > 0 &&
          (sdkType.usage & UsageFlags.Input & UsageFlags.MultipartFormData) === 0))
    ) {
      // This means we have a model that is used both for formdata input and for regular body input
      diagnostics.add(
        createDiagnostic({
          code: "conflicting-multipart-model-usage",
          target: httpBody.type,
          format: {
            modelName: sdkType.name,
          },
        })
      );
    }
    if (generateConvenient) {
      // Special logic for spread body model:
      // If body is from spread, then it should be an anonymous model.
      // Also all model properties should be
      // either equal to one of operation parameters (for case spread from model without property with metadata decorator)
      // or its source property equal to one of operation parameters (for case spread from model with property with metadata decorator)
      if (
        httpBody.type.kind === "Model" &&
        httpBody.type.name === "" &&
        [...httpBody.type.properties.keys()].every(
          (k) =>
            operation.parameters.properties.has(k) &&
            (operation.parameters.properties.get(k) ===
              (httpBody.type as Model).properties.get(k) ||
              operation.parameters.properties.get(k) ===
                (httpBody.type as Model).properties.get(k)?.sourceProperty)
        )
      ) {
        if (!context.spreadModels?.has(httpBody.type)) {
          context.spreadModels?.set(httpBody.type as Model, sdkType as SdkModelType);
        }
      }
      updateUsageOrAccessOfModel(context, UsageFlags.Input, sdkType);
      if (httpBody.contentTypes.some((x) => isJsonContentType(x))) {
        updateUsageOrAccessOfModel(context, UsageFlags.Json, sdkType);
      }
      if (httpBody.contentTypes.some((x) => isXmlContentType(x))) {
        updateUsageOrAccessOfModel(context, UsageFlags.Xml, sdkType);
      }
      if (httpBody.contentTypes.includes("application/merge-patch+json")) {
        // will also have Json type
        updateUsageOrAccessOfModel(context, UsageFlags.JsonMergePatch, sdkType);
      }
    }
    if (multipartOperation) {
      updateUsageOrAccessOfModel(context, UsageFlags.MultipartFormData, sdkType, {
        propagation: false,
      });
    }
    const access = getAccessOverride(context, operation) ?? "public";
    updateUsageOrAccessOfModel(context, access, sdkType);
  }
  for (const response of httpOperation.responses) {
    for (const innerResponse of response.responses) {
      if (innerResponse.body?.type && !isNeverOrVoidType(innerResponse.body.type)) {
        const body =
          innerResponse.body.type.kind === "Model"
            ? getEffectivePayloadType(context, innerResponse.body.type)
            : innerResponse.body.type;
        const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, body, operation));
        if (generateConvenient) {
          updateUsageOrAccessOfModel(context, UsageFlags.Output, sdkType);
        }
        if (innerResponse.body.contentTypes.some((x) => isJsonContentType(x))) {
          updateUsageOrAccessOfModel(context, UsageFlags.Json, sdkType);
        }
        const access = getAccessOverride(context, operation) ?? "public";
        updateUsageOrAccessOfModel(context, access, sdkType);
      }
      const headers = getHttpOperationResponseHeaders(innerResponse);
      if (headers) {
        for (const header of Object.values(headers)) {
          if (isNeverOrVoidType(header.type)) continue;
          const sdkType = diagnostics.pipe(
            getClientTypeWithDiagnostics(context, header.type, operation)
          );
          if (generateConvenient) {
            updateUsageOrAccessOfModel(context, UsageFlags.Output, sdkType);
          }
          const access = getAccessOverride(context, operation) ?? "public";
          updateUsageOrAccessOfModel(context, access, sdkType);
        }
      }
    }
  }
  const lroMetaData = getLroMetadata(program, operation);
  if (lroMetaData && generateConvenient) {
    if (lroMetaData.finalResult !== undefined && lroMetaData.finalResult !== "void") {
      const sdkType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, lroMetaData.finalResult, operation)
      );
      updateUsageOrAccessOfModel(context, UsageFlags.Output, sdkType);
      const access = getAccessOverride(context, operation) ?? "public";
      updateUsageOrAccessOfModel(context, access, sdkType);

      if (!context.arm) {
        // TODO: currently skipping adding of envelopeResult due to arm error
        // https://github.com/Azure/typespec-azure/issues/311
        const sdkType = diagnostics.pipe(
          getClientTypeWithDiagnostics(context, lroMetaData.envelopeResult, operation)
        );
        updateUsageOrAccessOfModel(context, UsageFlags.Output, sdkType);
        const access = getAccessOverride(context, operation) ?? "public";
        updateUsageOrAccessOfModel(context, access, sdkType);
      }
    }
  }
  return diagnostics.wrap(undefined);
}

function updateAccessOverrideOfModel(context: TCGCContext): void {
  for (const sdkType of context.modelsMap?.values() ?? []) {
    const accessOverride = getAccessOverride(context, sdkType.__raw as any);
    if (accessOverride) {
      updateUsageOrAccessOfModel(context, accessOverride, sdkType, { isOverride: true });
    }
  }
  for (const sdkType of context.modelsMap?.values() ?? []) {
    if (sdkType.access === undefined) {
      sdkType.access = "public";
    }
  }
}

function updateSpreadModelUsageAndAccess(context: TCGCContext): void {
  for (const sdkType of context.spreadModels?.values() ?? []) {
    // if a type has spread usage, then it must be internal
    sdkType.access = "internal";
    sdkType.usage = (sdkType.usage & ~UsageFlags.Input) | UsageFlags.Spread;
  }
}

interface GetAllModelsOptions {
  input?: boolean;
  output?: boolean;
}

function handleServiceOrphanType(context: TCGCContext, type: Model | Enum | Union) {
  const diagnostics = createDiagnosticCollector();
  // eslint-disable-next-line deprecation/deprecation
  if (type.kind === "Model" && isInclude(context, type)) {
    const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type));
    updateUsageOrAccessOfModel(context, UsageFlags.Input | UsageFlags.Output, sdkType);
  }
  const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type));
  updateUsageOrAccessOfModel(context, UsageFlags.None, sdkType);
}

function filterOutModels(context: TCGCContext) {
  for (const [type, sdkType] of context.modelsMap?.entries() ?? []) {
    if (type.kind === "Model") {
      if (isExclude(context, type)) sdkType.usage = UsageFlags.None; // eslint-disable-line deprecation/deprecation
    }
    if (type.kind === "Enum" || type.kind === "Model" || type.kind === "Union") {
      if (context.filterOutCoreModels && isAzureCoreModel(type)) {
        sdkType.usage = UsageFlags.None;
      }
    }
  }
}

export function getAllModelsWithDiagnostics(
  context: TCGCContext,
  options: GetAllModelsOptions = {}
): [(SdkModelType | SdkEnumType)[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const defaultOptions = {
    input: true,
    output: true,
  };
  options = { ...defaultOptions, ...options };
  if (context.modelsMap === undefined) {
    context.modelsMap = new Map<Type, SdkModelType | SdkEnumType>();
  }
  if (context.unionsMap === undefined) {
    context.unionsMap = new Map<Union, SdkUnionType>();
  }
  if (context.spreadModels === undefined) {
    context.spreadModels = new Map<Model, SdkModelType>();
  }
  for (const client of listClients(context)) {
    for (const operation of listOperationsInOperationGroup(context, client)) {
      // operations on a client
      diagnostics.pipe(updateTypesFromOperation(context, operation));
    }
    const ogs = listOperationGroups(context, client);
    while (ogs.length) {
      const operationGroup = ogs.pop();
      for (const operation of listOperationsInOperationGroup(context, operationGroup!)) {
        // operations on operation groups
        diagnostics.pipe(updateTypesFromOperation(context, operation));
      }
      if (operationGroup?.subOperationGroups) {
        ogs.push(...operationGroup.subOperationGroups);
      }
    }
    // orphan models
    for (const model of client.service.models.values()) {
      handleServiceOrphanType(context, model);
    }
    // orphan enums
    for (const enumType of client.service.enums.values()) {
      handleServiceOrphanType(context, enumType);
    }
    // orphan unions
    for (const unionType of client.service.unions.values()) {
      handleServiceOrphanType(context, unionType);
    }
    // server parameters
    const servers = getServers(context.program, client.service);
    if (servers !== undefined && servers[0].parameters !== undefined) {
      for (const param of servers[0].parameters.values()) {
        const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, param));
        updateUsageOrAccessOfModel(context, UsageFlags.Input, sdkType);
      }
    }
    // versioned enums
    const [_, versionMap] = getVersions(context.program, client.service);
    if (versionMap && versionMap.getVersions()[0]) {
      // create sdk enum for versions enum
      const sdkVersionsEnum = diagnostics.pipe(
        getSdkEnumWithDiagnostics(context, versionMap.getVersions()[0].enumMember.enum)
      );
      filterApiVersionsInEnum(context, client, sdkVersionsEnum);
      updateUsageOrAccessOfModel(context, UsageFlags.ApiVersionEnum, sdkVersionsEnum);
    }
  }
  // update access
  updateAccessOverrideOfModel(context);
  // update spread model
  updateSpreadModelUsageAndAccess(context);
  // filter out models
  filterOutModels(context);
  let filter = 0;
  if (options.input && options.output) {
    filter = Number.MAX_SAFE_INTEGER;
  } else if (options.input) {
    filter += UsageFlags.Input;
  } else if (options.output) {
    filter += UsageFlags.Output;
  }
  return diagnostics.wrap(
    [...new Set(context.modelsMap.values())].filter((t) => (t.usage & filter) > 0)
  );
}

export function getAllModels(
  context: TCGCContext,
  options: GetAllModelsOptions = {}
): (SdkModelType | SdkEnumType)[] {
  // we currently don't return diagnostics even though we keep track of them
  // when we move to the new sdk type ecosystem completely, we'll expose
  // diagnostics as a separate property on the TCGCContext
  return ignoreDiagnostics(getAllModelsWithDiagnostics(context, options));
}
