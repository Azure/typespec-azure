import { UnionEnum, getLroMetadata, getUnionAsEnum } from "@azure-tools/typespec-azure-core";
import {
  BooleanLiteral,
  BytesKnownEncoding,
  DateTimeKnownEncoding,
  Diagnostic,
  DurationKnownEncoding,
  Enum,
  EnumMember,
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
  UnionVariant,
  createDiagnosticCollector,
  getDiscriminator,
  getEncode,
  getFormat,
  getKnownValues,
  getNamespaceFullName,
  getVisibility,
  ignoreDiagnostics,
  isErrorModel,
  isNeverType,
} from "@typespec/compiler";
import {
  Authentication,
  Visibility,
  getAuthentication,
  getHeaderFieldName,
  getHeaderFieldOptions,
  getPathParamName,
  getQueryParamName,
  getQueryParamOptions,
  getServers,
  isBody,
  isHeader,
  isPathParam,
  isQueryParam,
  isStatusCode,
} from "@typespec/http";
import {
  getAccessOverride,
  getUsageOverride,
  isExclude,
  isInclude,
  isInternal,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldFlattenProperty,
  shouldGenerateConvenient,
} from "./decorators.js";
import {
  CollectionFormat,
  SdkArrayType,
  SdkBodyModelPropertyType,
  SdkBuiltInKinds,
  SdkBuiltInType,
  SdkClient,
  SdkConstantType,
  SdkCredentialParameter,
  SdkCredentialType,
  SdkDatetimeType,
  SdkDictionaryType,
  SdkDurationType,
  SdkEndpointParameter,
  SdkEndpointType,
  SdkEnumType,
  SdkEnumValueType,
  SdkModelPropertyType,
  SdkModelType,
  SdkPathParameter,
  SdkTupleType,
  SdkType,
  SdkUnionType,
  UsageFlags,
  getKnownScalars,
  isSdkBuiltInKind,
} from "./interfaces.js";
import {
  createGeneratedName,
  getAvailableApiVersions,
  getDocHelper,
  getNonNullOptions,
  getSdkTypeBaseHelper,
  intOrFloat,
  isAzureCoreModel,
  isMultipartFormData,
  isMultipartOperation,
  isNullable,
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
import { TCGCContext } from "./internal-utils.js";

function getAnyType(context: TCGCContext, type: Type): SdkBuiltInType {
  return {
    ...getSdkTypeBaseHelper(context, type, "any"),
    encode: getEncodeHelper(context, type, "any"),
  };
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
  const format = getFormat(context.program, type) ?? "";
  if (isSdkBuiltInKind(format)) propertyType.kind = format;
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
  const encodeData = getEncode(context.program, type);
  if (propertyType.kind === "duration") {
    if (!encodeData) return diagnostics.wrap(undefined);
    propertyType.encode = encodeData.encoding as DurationKnownEncoding;
    propertyType.wireType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, encodeData.type)
    ) as SdkBuiltInType;
  }
  if (propertyType.kind === "utcDateTime" || propertyType.kind === "offsetDateTime") {
    if (encodeData) {
      propertyType.encode = encodeData.encoding as DateTimeKnownEncoding;
      propertyType.wireType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, encodeData.type)
      ) as SdkBuiltInType;
    } else if (type.kind === "ModelProperty" && isHeader(context.program, type)) {
      propertyType.encode = "rfc7231";
    }
  }
  if (propertyType.kind === "bytes") {
    if (encodeData) {
      propertyType.encode = encodeData.encoding as BytesKnownEncoding;
    } else if (!defaultContentType || defaultContentType === "application/json") {
      propertyType.encode = "base64";
    } else {
      propertyType.encode = "bytes";
    }
  }
  return diagnostics.wrap(undefined);
}

/**
 * Mapping of typespec scalar kinds to the built in kinds exposed in the SDK
 * @param scalar the original typespec scalar
 * @returns the corresponding sdk built in kind
 */
function getScalarKind(scalar: Scalar): SdkBuiltInKinds {
  if (isSdkBuiltInKind(scalar.name)) {
    return scalar.name;
  }
  throw Error(`Unknown scalar kind ${scalar.name}`);
}

/**
 * Get the sdk built in type for a given typespec type
 * @param context the sdk context
 * @param type the typespec type
 * @returns the corresponding sdk type
 */
function getSdkBuiltInTypeWithDiagnostics(
  context: TCGCContext,
  type: Scalar | IntrinsicType | NumericLiteral | StringLiteral | BooleanLiteral
): [SdkBuiltInType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (context.program.checker.isStdType(type) || type.kind === "Intrinsic") {
    let kind: SdkBuiltInKinds = "any";
    if (type.kind === "Scalar") {
      if (isSdkBuiltInKind(type.name)) {
        kind = getScalarKind(type);
      }
    }
    return diagnostics.wrap({
      ...getSdkTypeBaseHelper(context, type, kind),
      encode: getEncodeHelper(context, type, kind),
    });
  } else if (type.kind === "String" || type.kind === "Boolean" || type.kind === "Number") {
    let kind: SdkBuiltInKinds;

    if (type.kind === "String") {
      kind = "string";
    } else if (type.kind === "Boolean") {
      kind = "boolean";
    } else {
      kind = intOrFloat(type.value);
    }
    return diagnostics.wrap({
      ...getSdkTypeBaseHelper(context, type, kind),
      encode: getEncodeHelper(context, type, kind),
    });
  }
  diagnostics.add(
    createDiagnostic({ code: "unsupported-kind", target: type, format: { kind: type.kind } })
  );
  return diagnostics.wrap(getAnyType(context, type));
}

export function getSdkBuiltInType(
  context: TCGCContext,
  type: Scalar | IntrinsicType | NumericLiteral | StringLiteral | BooleanLiteral
): SdkBuiltInType {
  return ignoreDiagnostics(getSdkBuiltInTypeWithDiagnostics(context, type));
}

export function getSdkDurationType(context: TCGCContext, type: Scalar): SdkDurationType {
  // we don't get encode info until we get to the property / parameter level
  // so we insert the default. Later in properties, we will check
  // for encoding info and override accordingly
  return {
    ...getSdkTypeBaseHelper(context, type, "duration"),
    encode: "ISO8601",
    wireType: { ...getSdkTypeBaseHelper(context, type, "string"), encode: "string" },
  };
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
  if (type.indexer !== undefined) {
    if (!isNeverType(type.indexer.key)) {
      const valueType = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.indexer.value!, operation)
      );
      const name = type.indexer.key.name;
      if (name === "string") {
        // model MyModel is Record<> {} should be model with additional properties
        if (type.sourceModel?.kind === "Model" && type.sourceModel?.name === "Record") {
          return diagnostics.wrap(undefined);
        }
        return diagnostics.wrap({
          ...getSdkTypeBaseHelper(context, type, "dict"),
          keyType: diagnostics.pipe(
            getClientTypeWithDiagnostics(context, type.indexer.key, operation)
          ),
          valueType,
          nullableValues: isNullable(type.indexer.value!),
        });
      } else if (name === "integer") {
        return diagnostics.wrap({
          ...getSdkTypeBaseHelper(context, type, "array"),
          valueType,
          nullableValues: isNullable(type.indexer.value!),
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
    ...getSdkTypeBaseHelper(context, type, "tuple"),
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
  if (nonNullOptions.length === 0) {
    diagnostics.add(createDiagnostic({ code: "union-null", target: type }));
    return diagnostics.wrap(getAnyType(context, type));
  }

  // change to a simple logic: only convert to normal type if the union is type | null, otherwise, return all the union types
  if (nonNullOptions.length === 1) {
    const clientType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, nonNullOptions[0], operation)
    );
    // eslint-disable-next-line deprecation/deprecation
    clientType.nullable = isNullable(type);
    clientType.__raw = type;
    return diagnostics.wrap(clientType);
  }

  // judge if the union can be converted to enum
  // if language does not need flatten union as enum
  // need to filter the case that union is composed of union or enum
  if (
    context.flattenUnionAsEnum ||
    ![...type.variants.values()].some((variant) => {
      return variant.type.kind === "Union" || variant.type.kind === "Enum";
    })
  ) {
    const unionAsEnum = diagnostics.pipe(getUnionAsEnum(type));
    if (unionAsEnum) {
      return diagnostics.wrap(getSdkUnionEnum(context, unionAsEnum, operation));
    }
  }

  return diagnostics.wrap({
    ...getSdkTypeBaseHelper(context, type, "union"),
    name: getLibraryName(context, type) || getGeneratedName(context, type),
    generatedName: !type.name,
    values: nonNullOptions.map((x) =>
      diagnostics.pipe(getClientTypeWithDiagnostics(context, x, operation))
    ),
    nullable: isNullable(type),
  });
}

function getSdkConstantWithDiagnostics(
  context: TCGCContext,
  type: StringLiteral | NumericLiteral | BooleanLiteral
): [SdkConstantType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  switch (type.kind) {
    case "Number":
    case "String":
    case "Boolean":
      const valueType = diagnostics.pipe(getSdkBuiltInTypeWithDiagnostics(context, type));
      return diagnostics.wrap({
        ...getSdkTypeBaseHelper(context, type, "constant"),
        value: type.value,
        valueType,
      });
  }
}

export function getSdkConstant(
  context: TCGCContext,
  type: StringLiteral | NumericLiteral | BooleanLiteral
): SdkConstantType {
  return ignoreDiagnostics(getSdkConstantWithDiagnostics(context, type));
}

function addDiscriminatorToModelType(
  context: TCGCContext,
  type: Model,
  model: SdkModelType,
  operation?: Operation
): [undefined, readonly Diagnostic[]] {
  const discriminator = getDiscriminator(context.program, type);
  const diagnostics = createDiagnosticCollector();
  if (discriminator) {
    let discriminatorProperty;
    for (const childModel of type.derivedModels) {
      const childModelSdkType = diagnostics.pipe(
        getSdkModelWithDiagnostics(context, childModel, operation)
      );
      updateModelsMap(context, childModel, childModelSdkType, operation);
      for (const property of childModelSdkType.properties) {
        if (property.kind === "property") {
          if (property.serializedName === discriminator?.propertyName) {
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
              childModelSdkType.discriminatorValue = property.type.value;
              property.discriminator = true;
              if (model.discriminatedSubtypes === undefined) {
                model.discriminatedSubtypes = {};
              }
              model.discriminatedSubtypes[property.type.value] = childModelSdkType;
              discriminatorProperty = property;
            }
          }
        }
      }
    }
    for (let i = 0; i < model.properties.length; i++) {
      const property = model.properties[i];
      if (property.kind === "property" && property.serializedName === discriminator.propertyName) {
        property.discriminator = true;
        model.discriminatorProperty = property;
        return diagnostics.wrap(undefined);
      }
    }
    let discriminatorType: SdkType;
    if (discriminatorProperty) {
      if (discriminatorProperty.type.kind === "constant") {
        discriminatorType = { ...discriminatorProperty.type.valueType };
      } else if (discriminatorProperty.type.kind === "enumvalue") {
        discriminatorType = discriminatorProperty.type.enumType;
      }
    } else {
      discriminatorType = {
        nullable: false,
        kind: "string",
        encode: "string",
      };
    }
    const name = discriminator.propertyName;
    model.properties.splice(0, 0, {
      kind: "property",
      optional: false,
      discriminator: true,
      serializedName: discriminator.propertyName,
      type: discriminatorType!,
      nameInClient: name,
      name,
      onClient: false,
      apiVersions: getAvailableApiVersions(context, type),
      isApiVersionParam: false,
      isMultipartFileInput: false, // discriminator property cannot be a file
      flatten: false, // discriminator properties can not be flattened
      nullable: false,
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
  type = getEffectivePayloadType(context, type);
  let sdkType = context.modelsMap?.get(type) as SdkModelType | undefined;

  if (sdkType) {
    updateModelsMap(context, type, sdkType, operation);
  } else {
    const docWrapper = getDocHelper(context, type);
    sdkType = {
      ...getSdkTypeBaseHelper(context, type, "model"),
      name: getLibraryName(context, type) || getGeneratedName(context, type),
      generatedName: !type.name,
      description: docWrapper.description,
      details: docWrapper.details,
      properties: [],
      additionalProperties: undefined, // going to set additional properties in the next few lines when we look at base model
      access: undefined, // dummy value since we need to update models map before we can set this
      usage: UsageFlags.None, // dummy value since we need to update models map before we can set this
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(type),
      apiVersions: getAvailableApiVersions(context, type),
      isFormDataType: isMultipartFormData(context, type, operation),
      isError: isErrorModel(context.program, type),
    };
    updateModelsMap(context, type, sdkType, operation);

    // model MyModel is Record<> {} should be model with additional properties
    if (type.sourceModel?.kind === "Model" && type.sourceModel?.name === "Record") {
      sdkType.additionalProperties = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, type.sourceModel!.indexer!.value!, operation)
      );
    }
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
          updateModelsMap(context, type.baseModel, sdkType.baseModel, operation);
        }
      }
    }
    diagnostics.pipe(addPropertiesToModelType(context, type, sdkType, operation));
    diagnostics.pipe(addDiscriminatorToModelType(context, type, sdkType, operation));
  }
  return diagnostics.wrap(sdkType);
}

function getSdkEnumValueType(
  context: TCGCContext,
  values:
    | IterableIterator<EnumMember>
    | IterableIterator<UnionEnumVariant<string>>
    | IterableIterator<UnionEnumVariant<number>>
): SdkBuiltInType {
  let kind: "string" | "int32" | "float32" = "string";
  let type: EnumMember | UnionVariant;
  for (const value of values) {
    if ((value as EnumMember).kind) {
      type = value as EnumMember;
    } else {
      type = (value as UnionEnumVariant<string> | UnionEnumVariant<number>).type;
    }

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

  return {
    ...getSdkTypeBaseHelper(context, type!, kind!),
    encode: kind!,
  };
}

function getUnionAsEnumValueType(context: TCGCContext, union: Union): SdkBuiltInType | undefined {
  const nonNullOptions = getNonNullOptions(union);
  for (const option of nonNullOptions) {
    if (option.kind === "Union") {
      const ret = getUnionAsEnumValueType(context, option);
      if (ret) return ret;
    } else if (option.kind === "Scalar") {
      return getClientType(context, option) as SdkBuiltInType;
    }
  }

  return undefined;
}

export function getSdkEnumValue(
  context: TCGCContext,
  enumType: SdkEnumType,
  type: EnumMember
): SdkEnumValueType {
  const docWrapper = getDocHelper(context, type);
  return {
    ...getSdkTypeBaseHelper(context, type, "enumvalue"),
    name: getLibraryName(context, type),
    value: type.value ?? type.name,
    description: docWrapper.description,
    details: docWrapper.details,
    enumType,
    valueType: enumType.valueType,
  };
}

export function getSdkEnum(context: TCGCContext, type: Enum, operation?: Operation): SdkEnumType {
  let sdkType = context.modelsMap?.get(type) as SdkEnumType | undefined;
  if (!sdkType) {
    const docWrapper = getDocHelper(context, type);
    sdkType = {
      ...getSdkTypeBaseHelper(context, type, "enum"),
      name: getLibraryName(context, type),
      generatedName: false,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType: getSdkEnumValueType(context, type.members.values()),
      values: [],
      isFixed: true, // enums are always fixed after we switch to use union to represent extensible enum
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: undefined, // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(type),
      apiVersions: getAvailableApiVersions(context, type),
      isUnionAsEnum: false,
    };
    for (const member of type.members.values()) {
      sdkType.values.push(getSdkEnumValue(context, sdkType, member));
    }
  }
  updateModelsMap(context, type, sdkType, operation);
  return sdkType;
}

function getSdkUnionEnumValues(
  context: TCGCContext,
  type: UnionEnum,
  enumType: SdkEnumType
): SdkEnumValueType[] {
  const values: SdkEnumValueType[] = [];
  for (const member of type.flattenedMembers.values()) {
    const docWrapper = getDocHelper(context, member.type);
    const name = getLibraryName(context, member.type);
    values.push({
      kind: "enumvalue",
      name: name ? name : `${member.value}`,
      description: docWrapper.description,
      details: docWrapper.details,
      value: member.value,
      valueType: enumType.valueType,
      enumType,
      nullable: false,
    });
  }
  return values;
}

function getSdkUnionEnum(context: TCGCContext, type: UnionEnum, operation?: Operation) {
  let sdkType = context.modelsMap?.get(type.union) as SdkEnumType | undefined;
  if (!sdkType) {
    const union = type.union as Union & { name: string };
    const docWrapper = getDocHelper(context, union);
    sdkType = {
      ...getSdkTypeBaseHelper(context, type.union, "enum"),
      name: getLibraryName(context, type.union) || getGeneratedName(context, type.union),
      generatedName: !type.union.name,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType:
        getUnionAsEnumValueType(context, type.union) ??
        getSdkEnumValueType(context, type.flattenedMembers.values()),
      values: [],
      nullable: type.nullable,
      isFixed: !type.open,
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: undefined, // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(union),
      apiVersions: getAvailableApiVersions(context, type.union),
      isUnionAsEnum: true,
    };
    sdkType.values = getSdkUnionEnumValues(context, type, sdkType);
  }
  updateModelsMap(context, type.union, sdkType, operation);
  return sdkType;
}

function getKnownValuesEnum(
  context: TCGCContext,
  type: Scalar | ModelProperty,
  operation?: Operation
): SdkEnumType | undefined {
  const knownValues = getKnownValues(context.program, type);
  if (!knownValues) {
    return;
  }
  if (type.kind === "ModelProperty") {
    const sdkType = getSdkEnum(context, knownValues, operation);
    return sdkType;
  } else {
    let sdkType = context.modelsMap?.get(type) as SdkEnumType | undefined;
    if (!sdkType) {
      const docWrapper = getDocHelper(context, type);
      sdkType = {
        ...getSdkTypeBaseHelper(context, type, "enum"),
        name: getLibraryName(context, type),
        generatedName: false,
        description: docWrapper.description,
        details: docWrapper.details,
        valueType: getSdkEnumValueType(context, knownValues.members.values()),
        values: [],
        isFixed: false,
        isFlags: false,
        usage: UsageFlags.None, // We will add usage as we loop through the operations
        access: undefined, // Dummy value until we update models map
        crossLanguageDefinitionId: getCrossLanguageDefinitionId(type),
        apiVersions: getAvailableApiVersions(context, type),
        isUnionAsEnum: false,
      };
      for (const member of knownValues.members.values()) {
        sdkType.values.push(getSdkEnumValue(context, sdkType, member));
      }
    }
    updateModelsMap(context, type, sdkType, operation);
    return sdkType;
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
        retval = diagnostics.pipe(getSdkModelWithDiagnostics(context, type, operation));
      }
      break;
    case "Intrinsic":
      retval = diagnostics.pipe(getSdkBuiltInTypeWithDiagnostics(context, type));
      break;
    case "Scalar":
      if (!context.program.checker.isStdType(type) && type.kind === "Scalar" && type.baseScalar) {
        const baseType = diagnostics.pipe(
          getClientTypeWithDiagnostics(context, type.baseScalar, operation)
        );
        addEncodeInfo(context, type, baseType);
        addFormatInfo(context, type, baseType);
        retval = getKnownValuesEnum(context, type, operation) ?? baseType;
        const namespace = type.namespace ? getNamespaceFullName(type.namespace) : "";
        retval.kind = context.knownScalars[`${namespace}.${type.name}`] ?? retval.kind;
        break;
      }
      if (type.name === "utcDateTime" || type.name === "offsetDateTime") {
        retval = {
          ...getSdkTypeBaseHelper(context, type, type.name),
          encode: "rfc3339",
          wireType: { ...getSdkTypeBaseHelper(context, type, "string"), encode: "string" },
        } as SdkDatetimeType;
        break;
      }
      if (type.name === "duration") {
        retval = getSdkDurationType(context, type);
        break;
      }
      const scalarType = diagnostics.pipe(getSdkBuiltInTypeWithDiagnostics(context, type));
      // just add default encode, normally encode is on extended scalar and model property
      addEncodeInfo(context, type, scalarType);
      retval = scalarType;
      break;
    case "Enum":
      retval = getSdkEnum(context, type, operation);
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
      retval = getKnownValuesEnum(context, type, operation) ?? innerType;
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
      const enumType = getSdkEnum(context, type.enum, operation);
      retval = getSdkEnumValue(context, enumType, type);
      break;
    default:
      retval = getAnyType(context, type);
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

function getCollectionFormat(
  context: TCGCContext,
  type: ModelProperty
): CollectionFormat | undefined {
  const program = context.program;
  const tspCollectionFormat = (
    isQueryParam(program, type)
      ? getQueryParamOptions(program, type)
      : isHeader(program, type)
        ? getHeaderFieldOptions(program, type)
        : undefined
  )?.format;
  if (tspCollectionFormat === "form" || tspCollectionFormat === "simple") {
    return undefined;
  }
  return tspCollectionFormat;
}

function getSdkCredentialType(
  client: SdkClient,
  authentication: Authentication
): SdkCredentialType | SdkUnionType {
  const credentialTypes: SdkCredentialType[] = [];
  for (const option of authentication.options) {
    for (const scheme of option.schemes) {
      credentialTypes.push({
        __raw: client.service,
        kind: "credential",
        scheme: scheme,
        nullable: false,
      });
    }
  }
  if (credentialTypes.length > 1) {
    return {
      __raw: client.service,
      kind: "union",
      values: credentialTypes,
      nullable: false,
      name: createGeneratedName(client.service, "CredentialUnion"),
      generatedName: false,
    };
  }
  return credentialTypes[0];
}

export function getSdkCredentialParameter(
  context: TCGCContext,
  client: SdkClient
): SdkCredentialParameter | undefined {
  const auth = getAuthentication(context.program, client.service);
  if (!auth) return undefined;
  const name = "credential";
  return {
    type: getSdkCredentialType(client, auth),
    kind: "credential",
    nameInClient: name,
    name,
    description: "Credential used to authenticate requests to the service.",
    apiVersions: getAvailableApiVersions(context, client.service),
    onClient: true,
    optional: false,
    isApiVersionParam: false,
    nullable: false,
  };
}

interface GetSdkModelPropertyTypeOptions {
  isEndpointParam?: boolean;
  operation?: Operation;
  isMethodParameter?: boolean;
  defaultContentType?: string;
}

export function getSdkModelPropertyType(
  context: TCGCContext,
  type: ModelProperty,
  options: GetSdkModelPropertyTypeOptions = {}
): [SdkModelPropertyType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let propertyType = diagnostics.pipe(
    getClientTypeWithDiagnostics(context, type.type, options.operation)
  );
  diagnostics.pipe(addEncodeInfo(context, type, propertyType, options.defaultContentType));
  addFormatInfo(context, type, propertyType);
  const knownValues = getKnownValues(context.program, type);
  if (knownValues) {
    propertyType = getSdkEnum(context, knownValues, options.operation);
  }
  const docWrapper = getDocHelper(context, type);
  const name = getPropertyNames(context, type)[0];
  const base = {
    __raw: type,
    description: docWrapper.description,
    details: docWrapper.details,
    apiVersions: getAvailableApiVersions(context, type),
    type: propertyType,
    nameInClient: name,
    name,
    onClient: false,
    optional: type.optional,
    nullable: isNullable(type.type),
  };
  const program = context.program;
  const headerQueryOptions = {
    ...base,
    optional: type.optional,
    collectionFormat: getCollectionFormat(context, type),
  };
  if (options.isMethodParameter) {
    return diagnostics.wrap({
      ...base,
      kind: "method",
      ...updateWithApiVersionInformation(context, type),
      optional: type.optional,
    });
  } else if (isPathParam(program, type) || options.isEndpointParam) {
    // we don't url encode if the type can be assigned to url
    const urlEncode = !ignoreDiagnostics(
      program.checker.isTypeAssignableTo(
        type.type.projectionBase ?? type.type,
        program.checker.getStdType("url"),
        type.type
      )
    );
    return diagnostics.wrap({
      ...base,
      kind: "path",
      urlEncode,
      serializedName: getPathParamName(program, type),
      ...updateWithApiVersionInformation(context, type),
      optional: false,
    });
  } else if (isHeader(program, type)) {
    return diagnostics.wrap({
      ...headerQueryOptions,
      kind: "header",
      serializedName: getHeaderFieldName(program, type),
      ...updateWithApiVersionInformation(context, type),
    });
  } else if (isQueryParam(program, type)) {
    return diagnostics.wrap({
      ...headerQueryOptions,
      kind: "query",
      serializedName: getQueryParamName(program, type),
      ...updateWithApiVersionInformation(context, type),
    });
  } else if (isBody(program, type)) {
    return diagnostics.wrap({
      ...base,
      kind: "body",
      contentTypes: ["application/json"], // will update when we get to the operation level
      defaultContentType: "application/json", // will update when we get to the operation level
      ...updateWithApiVersionInformation(context, type),
      optional: type.optional,
    });
  } else {
    // I'm a body model property
    let operationIsMultipart = false;
    if (options.operation) {
      const httpOperation = getHttpOperationWithCache(context, options.operation);
      operationIsMultipart = Boolean(
        httpOperation && httpOperation.parameters.body?.contentTypes.includes("multipart/form-data")
      );
    }
    // Currently we only recognize bytes and list of bytes as potential file inputs
    const isBytesInput =
      base.type.kind === "bytes" ||
      (base.type.kind === "array" && base.type.valueType.kind === "bytes");
    if (isBytesInput && operationIsMultipart && getEncode(context.program, type)) {
      diagnostics.add(
        createDiagnostic({
          code: "encoding-multipart-bytes",
          target: type,
        })
      );
    }
    return diagnostics.wrap({
      ...base,
      kind: "property",
      optional: type.optional,
      visibility: getSdkVisibility(context, type),
      discriminator: false,
      serializedName: getPropertyNames(context, type)[1],
      isMultipartFileInput: isBytesInput && operationIsMultipart,
      flatten: shouldFlattenProperty(context, type),
      ...updateWithApiVersionInformation(context, type),
    });
  }
}

export function getSdkEndpointParameter(
  context: TCGCContext,
  client: SdkClient
): [SdkEndpointParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const servers = getServers(context.program, client.service);
  let type: SdkEndpointType;
  let optional: boolean = false;
  if (servers === undefined || servers.length > 1) {
    // if there is no defined server url, or if there are more than one
    // we will return a mandatory endpoint parameter in initialization
    type = {
      kind: "endpoint",
      nullable: false,
      templateArguments: [],
    };
  } else {
    // this means we have one server
    const templateArguments: SdkPathParameter[] = [];
    type = {
      kind: "endpoint",
      nullable: false,
      serverUrl: servers[0].url,
      templateArguments,
    };
    for (const param of servers[0].parameters.values()) {
      const sdkParam = diagnostics.pipe(
        getSdkModelPropertyType(context, param, { isEndpointParam: true })
      );
      if (sdkParam.kind === "path") {
        templateArguments.push(sdkParam);
        sdkParam.description = sdkParam.description ?? servers[0].description;
        sdkParam.onClient = true;
      } else {
        diagnostics.add(
          createDiagnostic({
            code: "server-param-not-path",
            target: param,
            format: {
              templateArgumentName: sdkParam.name,
              templateArgumentType: sdkParam.kind,
            },
          })
        );
      }
    }
    optional = !!servers[0].url.length && templateArguments.every((param) => param.optional);
  }
  return diagnostics.wrap({
    kind: "endpoint",
    type,
    nameInClient: "endpoint",
    name: "endpoint",
    description: "Service host",
    onClient: true,
    urlEncode: false,
    apiVersions: getAvailableApiVersions(context, client.service),
    optional,
    isApiVersionParam: false,
    nullable: false,
  });
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
      isNeverType(property.type) ||
      sdkType.kind !== "model"
    ) {
      continue;
    }
    const clientProperty = diagnostics.pipe(
      getSdkModelPropertyType(context, property, { operation: operation })
    );
    if (sdkType.properties) {
      sdkType.properties.push(clientProperty);
    } else {
      sdkType.properties = [clientProperty];
    }
  }
  return diagnostics.wrap(undefined);
}

function updateModelsMap(
  context: TCGCContext,
  type: Type,
  sdkType: SdkType,
  operation?: Operation
) {
  if (sdkType.kind !== "model" && sdkType.kind !== "enum") {
    return;
  }

  if (context.modelsMap === undefined) {
    context.modelsMap = new Map<Type, SdkModelType | SdkEnumType>();
  }
  if (context.operationModelsMap === undefined) {
    context.operationModelsMap = new Map<Operation, Map<Type, SdkModelType | SdkEnumType>>();
  }
  const value = context.modelsMap.get(type);
  if (value) {
    sdkType = value;
  } else {
    context.modelsMap.set(type, sdkType);
  }
  if (operation) {
    if (context.operationModelsMap.has(operation)) {
      if (context.operationModelsMap.get(operation)?.has(type)) {
        return;
      }
      context.operationModelsMap.get(operation)?.set(type, sdkType);
    } else {
      context.operationModelsMap.set(operation, new Map([[type, sdkType]]));
    }
    // TODO: it seems duplicate calculation, need to optimize later
    if (sdkType.kind === "model") {
      for (const prop of sdkType.properties) {
        if (prop.type.kind === "model" || prop.type.kind === "enum") {
          updateModelsMap(context, prop.type.__raw as any, prop.type, operation);
        }
        if (prop.type.kind === "array" || prop.type.kind === "dict") {
          updateModelsMap(
            context,
            prop.type.valueType.__raw as any,
            prop.type.valueType,
            operation
          );
        }
        if (prop.type.kind === "union") {
          for (const unionType of prop.type.values) {
            updateModelsMap(context, unionType.__raw as any, unionType, operation);
          }
        }
      }
      if (sdkType.baseModel) {
        updateModelsMap(context, sdkType.baseModel.__raw as any, sdkType.baseModel, operation);
      }
      if (sdkType.additionalProperties) {
        updateModelsMap(
          context,
          sdkType.additionalProperties.__raw as any,
          sdkType.additionalProperties,
          operation
        );
      }
      if (sdkType.discriminatedSubtypes) {
        for (const subtype of Object.values(sdkType.discriminatedSubtypes)) {
          updateModelsMap(context, subtype.__raw as any, subtype, operation);
        }
      }
    }
  }
}

function checkAndGetClientType(
  context: TCGCContext,
  type: Type,
  operation?: Operation
): [SdkType[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: SdkType[] = [];
  if (type.kind === "Model") {
    if (isExclude(context, type)) return diagnostics.wrap([]); // eslint-disable-line deprecation/deprecation
    const effectivePayloadType = getEffectivePayloadType(context, type);
    if (context.filterOutCoreModels && isAzureCoreModel(effectivePayloadType)) {
      if (effectivePayloadType.templateMapper && effectivePayloadType.name) {
        effectivePayloadType.templateMapper.args
          .filter((arg) => arg.kind === "Model" && arg.name)
          .forEach((arg) => {
            retval.push(...diagnostics.pipe(checkAndGetClientType(context, arg, operation)));
          });
        return diagnostics.wrap(retval);
      } else {
        return diagnostics.wrap([]);
      }
    }
  }
  const clientType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type, operation));
  return diagnostics.wrap([clientType]);
}

function updateUsageOfModel(
  context: TCGCContext,
  usage: UsageFlags,
  type?: SdkType,
  seenModelNames?: Set<SdkType>
): void {
  if (!type || !["model", "enum", "array", "dict", "union"].includes(type.kind)) return undefined;
  if (seenModelNames === undefined) {
    seenModelNames = new Set<SdkType>();
  }
  if (type.kind === "model" && seenModelNames.has(type)) return; // avoid circular references
  if (type.kind === "array" || type.kind === "dict") {
    return updateUsageOfModel(context, usage, type.valueType, seenModelNames);
  }
  if (type.kind === "union") {
    for (const unionType of type.values) {
      updateUsageOfModel(context, usage, unionType, seenModelNames);
    }
    return;
  }
  if (type.kind !== "model" && type.kind !== "enum") return;
  seenModelNames.add(type);

  const usageOverride = getUsageOverride(context, type.__raw as any);
  if (usageOverride) {
    type.usage |= usageOverride | usage;
  } else {
    type.usage |= usage;
  }

  if (type.kind === "enum") return;
  if (type.baseModel && (type.baseModel.usage & usage) === 0) {
    // if it has a base model and the base model doesn't currently have that usage
    type.baseModel.usage |= usage;
  }
  if (type.baseModel) {
    updateUsageOfModel(context, usage, type.baseModel, seenModelNames);
  }
  if (type.discriminatedSubtypes) {
    for (const discriminatedSubtype of Object.values(type.discriminatedSubtypes)) {
      updateUsageOfModel(context, usage, discriminatedSubtype, seenModelNames);
    }
  }
  if (type.additionalProperties) {
    updateUsageOfModel(context, usage, type.additionalProperties, seenModelNames);
  }
  for (const property of type.properties) {
    updateUsageOfModel(context, usage, property.type, seenModelNames);
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
  for (const param of operation.parameters.properties.values()) {
    const paramTypes = diagnostics.pipe(checkAndGetClientType(context, param.type, operation));
    if (generateConvenient) {
      paramTypes.forEach((paramType) => {
        updateUsageOfModel(context, UsageFlags.Input, paramType);
      });
    }
  }
  for (const param of httpOperation.parameters.parameters) {
    const paramTypes = diagnostics.pipe(
      checkAndGetClientType(context, param.param.type, operation)
    );
    if (generateConvenient) {
      paramTypes.forEach((paramType) => {
        updateUsageOfModel(context, UsageFlags.Input, paramType);
      });
    }
  }
  const httpBody = httpOperation.parameters.body;
  if (httpBody) {
    const bodies = diagnostics.pipe(checkAndGetClientType(context, httpBody.type, operation));
    if (generateConvenient) {
      bodies.forEach((body) => {
        updateUsageOfModel(context, UsageFlags.Input, body);
      });
      if (httpBody.contentTypes.includes("application/merge-patch+json")) {
        bodies.forEach((body) => {
          updateUsageOfModel(context, UsageFlags.JsonMergePatch, body);
        });
      }
    }
    if (isMultipartFormData(context, httpBody.type, operation)) {
      bodies.forEach((body) => {
        updateUsageOfModel(context, UsageFlags.MultipartFormData, body);
      });
    }
  }
  for (const response of httpOperation.responses) {
    for (const innerResponse of response.responses) {
      if (innerResponse.body?.type) {
        const responseBodies = diagnostics.pipe(
          checkAndGetClientType(context, innerResponse.body.type, operation)
        );
        if (generateConvenient) {
          responseBodies.forEach((responseBody) => {
            updateUsageOfModel(context, UsageFlags.Output, responseBody);
          });
        }
      }
    }
  }
  const lroMetaData = getLroMetadata(program, operation);
  if (lroMetaData && generateConvenient) {
    const logicalResults = diagnostics.pipe(
      checkAndGetClientType(context, lroMetaData.logicalResult, operation)
    );
    logicalResults.forEach((logicalResult) => {
      updateUsageOfModel(context, UsageFlags.Output, logicalResult);
    });

    if (!context.arm) {
      // TODO: currently skipping adding of envelopeResult due to arm error
      // https://github.com/Azure/typespec-azure/issues/311
      const envelopeResults = diagnostics.pipe(
        checkAndGetClientType(context, lroMetaData.envelopeResult, operation)
      );
      envelopeResults.forEach((envelopeResult) => {
        updateUsageOfModel(context, UsageFlags.Output, envelopeResult);
      });
    }
  }
  return diagnostics.wrap(undefined);
}

function updateAccessOfModel(context: TCGCContext): void {
  for (const [type, sdkType] of context.modelsMap?.entries() ?? []) {
    const internal = isInternal(context, type as any); // eslint-disable-line deprecation/deprecation
    if (internal) {
      sdkType.access = "internal";
      continue;
    }

    const accessOverride = getAccessOverride(context, sdkType.__raw as any);
    if (accessOverride) {
      sdkType.access = accessOverride;
      continue;
    }

    let referredByInternal = false;
    let referredByPublic = false;
    let referredByUndefined = false;
    for (const [operation, modelMap] of context.operationModelsMap!) {
      const access = getAccessOverride(context, operation);
      if (access === "internal" && modelMap.get(type)) {
        referredByInternal = true;
      } else if (access === "public" && modelMap.get(type)) {
        referredByPublic = true;
        break;
      } else if (access === undefined && modelMap.get(type)) {
        referredByUndefined = true;
      }
    }
    if (referredByPublic) {
      sdkType.access = "public";
    } else if (referredByInternal && !referredByUndefined) {
      sdkType.access = "internal";
    }
  }
}

interface GetAllModelsOptions {
  input?: boolean;
  output?: boolean;
}

function handleServiceOrphanType(context: TCGCContext, type: Model | Enum) {
  const diagnostics = createDiagnosticCollector();
  // eslint-disable-next-line deprecation/deprecation
  if (type.kind === "Model" && isInclude(context, type)) {
    const sdkModels = diagnostics.pipe(checkAndGetClientType(context, type));
    sdkModels.forEach((sdkModel) => {
      updateUsageOfModel(context, UsageFlags.Input | UsageFlags.Output, sdkModel);
    });
  }
  if (getAccessOverride(context, type) !== undefined) {
    const sdkModels = diagnostics.pipe(checkAndGetClientType(context, type));
    sdkModels
      .filter((sdkModel) => ["model", "enum", "array", "dict", "union"].includes(sdkModel.kind))
      .forEach((sdkModel) => {
        updateUsageOfModel(context, UsageFlags.None, sdkModel);
      });
  }
}

function verifyNoConflictingMultipartModelUsage(
  context: TCGCContext
): [void, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  for (const [operation, modelMap] of context.operationModelsMap!) {
    for (const [type, sdkType] of modelMap.entries()) {
      const isMultipartFormData = (sdkType.usage & UsageFlags.MultipartFormData) > 0;
      if (
        sdkType.kind === "model" &&
        isMultipartFormData !== isMultipartOperation(context, operation)
      ) {
        // This means we have a model that is used both for formdata input and for regular body input
        diagnostics.add(
          createDiagnostic({
            code: "conflicting-multipart-model-usage",
            target: type,
            format: {
              modelName: sdkType.name,
            },
          })
        );
      }
    }
  }
  return diagnostics.wrap(undefined);
}

function modelChecks(context: TCGCContext): [void, readonly Diagnostic[]] {
  return verifyNoConflictingMultipartModelUsage(context);
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
  if (context.operationModelsMap === undefined) {
    context.operationModelsMap = new Map<Operation, Map<Type, SdkModelType | SdkEnumType>>();
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
    // server parameters
    const servers = getServers(context.program, client.service);
    if (servers !== undefined && servers[0].parameters !== undefined) {
      for (const param of servers[0].parameters.values()) {
        const sdkModels = diagnostics.pipe(checkAndGetClientType(context, param));
        sdkModels.forEach((sdkModel) => {
          updateUsageOfModel(context, UsageFlags.Input, sdkModel);
        });
      }
    }
    // versioned enums
    const [_, versionMap] = getVersions(context.program, client.service);
    if (versionMap && versionMap.getVersions()[0]) {
      // create sdk enum for versions enum
      const sdkVersionsEnum = getSdkEnum(context, versionMap.getVersions()[0].enumMember.enum);
      updateUsageOfModel(context, UsageFlags.ApiVersionEnum, sdkVersionsEnum);
    }
  }
  // update access
  updateAccessOfModel(context);
  let filter = 0;
  if (options.input && options.output) {
    filter = Number.MAX_SAFE_INTEGER;
  } else if (options.input) {
    filter += UsageFlags.Input;
  } else if (options.output) {
    filter += UsageFlags.Output;
  }
  diagnostics.pipe(modelChecks(context));
  return diagnostics.wrap([...context.modelsMap.values()].filter((t) => (t.usage & filter) > 0));
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
