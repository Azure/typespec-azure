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
  getServers,
  isHeader,
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
  SdkEnumType,
  SdkEnumValueType,
  SdkModelPropertyType,
  SdkModelPropertyTypeBase,
  SdkModelType,
  SdkOperationGroup,
  SdkTupleType,
  SdkType,
  SdkUnionType,
  UsageFlags,
  getKnownScalars,
  isSdkBuiltInKind,
} from "./interfaces.js";
import {
  createGeneratedName,
  getAnyType,
  getAvailableApiVersions,
  getDocHelper,
  getLocationOfOperation,
  getNonNullOptions,
  getNullOption,
  getSdkTypeBaseHelper,
  intOrFloat,
  isAzureCoreModel,
  isMultipartFormData,
  isMultipartOperation,
  isNeverOrVoidType,
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
import { TCGCContext } from "./internal-utils.js";

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
  const format = getFormat(context.program, type) ?? "";
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
    const docWrapper = getDocHelper(context, type);
    return diagnostics.wrap({
      ...getSdkTypeBaseHelper(context, type, kind),
      encode: getEncodeHelper(context, type, kind),
      description: docWrapper.description,
      details: docWrapper.details,
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
  return diagnostics.wrap(getAnyType());
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
          ...getSdkTypeBaseHelper(context, type, "dict"),
          keyType: diagnostics.pipe(
            getClientTypeWithDiagnostics(context, type.indexer.key, operation)
          ),
          valueType,
        });
      } else if (name === "integer") {
        // only array's index key name is integer
        return diagnostics.wrap({
          ...getSdkTypeBaseHelper(context, type, "array"),
          valueType,
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
  const nullOption = getNullOption(type);
  let retval: SdkType | undefined = undefined;

  if (nonNullOptions.length === 0) {
    diagnostics.add(createDiagnostic({ code: "union-null", target: type }));
    return diagnostics.wrap(getAnyType());
  }

  if (nonNullOptions.length === 1) {
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
      retval = getSdkUnionEnum(context, unionAsEnum, operation);
    }
  }

  // other cases
  if (retval === undefined) {
    retval = {
      ...getSdkTypeBaseHelper(context, type, "union"),
      name: getLibraryName(context, type) || getGeneratedName(context, type),
      isGeneratedName: !type.name,
      values: nonNullOptions.map((x) =>
        diagnostics.pipe(getClientTypeWithDiagnostics(context, x, operation))
      ),
    };
  }

  if (nullOption !== undefined) {
    retval = {
      ...getSdkTypeBaseHelper(context, type, "nullable"),
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
      const valueType = diagnostics.pipe(getSdkBuiltInTypeWithDiagnostics(context, type));
      return diagnostics.wrap({
        ...getSdkTypeBaseHelper(context, type, "constant"),
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
      discriminatorType = {
        kind: "string",
        encode: "string",
      };
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
      nameInClient: name,
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
    const generatedName = getGeneratedName(context, type);
    const name = getLibraryName(context, type) || generatedName;
    sdkType = {
      ...getSdkTypeBaseHelper(context, type, "model"),
      name: name,
      isGeneratedName: !type.name,
      description: docWrapper.description,
      details: docWrapper.details,
      properties: [],
      additionalProperties: undefined, // going to set additional properties in the next few lines when we look at base model
      access: "public",
      usage: UsageFlags.None, // dummy value since we need to update models map before we can set this
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
      apiVersions: getAvailableApiVersions(context, type, type.namespace),
      isFormDataType: isMultipartFormData(context, type, operation),
      isError: isErrorModel(context.program, type),
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

    updateModelsMap(context, type, sdkType, operation);
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
      isGeneratedName: false,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType: getSdkEnumValueType(context, type.members.values()),
      values: [],
      isFixed: true, // enums are always fixed after we switch to use union to represent extensible enum
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: "public", // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
      apiVersions: getAvailableApiVersions(context, type, type.namespace),
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
    });
  }
  return values;
}

export function getSdkUnionEnum(context: TCGCContext, type: UnionEnum, operation?: Operation) {
  const union = type.union;
  let sdkType = context.modelsMap?.get(union) as SdkEnumType | undefined;
  if (!sdkType) {
    const docWrapper = getDocHelper(context, union);
    const generatedName = getGeneratedName(context, union);
    const name = getLibraryName(context, type.union) || generatedName;
    sdkType = {
      ...getSdkTypeBaseHelper(context, type.union, "enum"),
      name,
      isGeneratedName: !type.union.name,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType:
        getUnionAsEnumValueType(context, type.union) ??
        getSdkEnumValueType(context, type.flattenedMembers.values()),
      values: [],
      isFixed: !type.open,
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: "public", // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, union),
      apiVersions: getAvailableApiVersions(context, type.union, type.union.namespace),
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
        isGeneratedName: false,
        description: docWrapper.description,
        details: docWrapper.details,
        valueType: getSdkEnumValueType(context, knownValues.members.values()),
        values: [],
        isFixed: false,
        isFlags: false,
        usage: UsageFlags.None, // We will add usage as we loop through the operations
        access: "public", // Dummy value until we update models map
        crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
        apiVersions: getAvailableApiVersions(context, type, type.namespace),
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
        const docWrapper = getDocHelper(context, type);
        retval.description = docWrapper.description;
        retval.details = docWrapper.details;
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
      retval = getAnyType();
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
): SdkCredentialType | SdkUnionType {
  const credentialTypes: SdkCredentialType[] = [];
  for (const option of authentication.options) {
    for (const scheme of option.schemes) {
      credentialTypes.push({
        __raw: client.service,
        kind: "credential",
        scheme: scheme,
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
    };
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
    nameInClient: name,
    name,
    isGeneratedName: true,
    description: "Credential used to authenticate requests to the service.",
    apiVersions: getAvailableApiVersions(context, client.service, client.type),
    onClient: true,
    optional: false,
    isApiVersionParam: false,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, client.service)}.credential`,
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
    propertyType = getSdkEnum(context, knownValues, operation);
  }
  const docWrapper = getDocHelper(context, type);
  const name = getPropertyNames(context, type)[0];
  return diagnostics.wrap({
    __raw: type,
    description: docWrapper.description,
    details: docWrapper.details,
    apiVersions,
    type: propertyType,
    nameInClient: name,
    name,
    isGeneratedName: false,
    optional: type.optional,
    ...updateWithApiVersionInformation(
      context,
      type,
      operation ? getLocationOfOperation(operation) : undefined
    ),
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, type),
  });
}

export function getSdkModelPropertyType(
  context: TCGCContext,
  type: ModelProperty,
  operation?: Operation
): [SdkModelPropertyType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const base = diagnostics.pipe(getSdkModelPropertyTypeBase(context, type, operation));

  if (isSdkHttpParameter(context, type)) return getSdkHttpParameter(context, type, operation!);
  // I'm a body model property
  let operationIsMultipart = false;
  if (operation) {
    const httpOperation = getHttpOperationWithCache(context, operation);
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

interface ModelUsageOptions {
  seenModelNames?: Set<SdkType>;
  propagation?: boolean;
  // this is used to prevent propagation usage from subtype to base type's other subtypes
  ignoreSubTypeStack?: boolean[];
}

function updateUsageOfModel(
  context: TCGCContext,
  usage: UsageFlags,
  type?: SdkType,
  options?: ModelUsageOptions
): void {
  options = options ?? {};
  options.propagation = options?.propagation ?? true;
  options.ignoreSubTypeStack = options.ignoreSubTypeStack ?? [];
  // if (!type || !["model", "enum", "array", "dict", "union", "enumvalue"].includes(type.kind))
  //   return;
  if (!type) return;
  if (options?.seenModelNames === undefined) {
    options.seenModelNames = new Set<SdkType>();
  }
  if (type.kind === "model" && options.seenModelNames.has(type)) return; // avoid circular references
  if (type.kind === "array" || type.kind === "dict") {
    return updateUsageOfModel(context, usage, type.valueType, options);
  }
  if (type.kind === "union") {
    for (const unionType of type.values) {
      updateUsageOfModel(context, usage, unionType, options);
    }
    return;
  }
  if (type.kind === "enumvalue") {
    updateUsageOfModel(context, usage, type.enumType, options);
    return;
  }
  if (type.kind === "nullable") {
    updateUsageOfModel(context, usage, type.type, options);
    return;
  }
  if (type.kind !== "model" && type.kind !== "enum") return;
  options.seenModelNames.add(type);

  const usageOverride = getUsageOverride(context, type.__raw as any);
  if (usageOverride) {
    type.usage |= usageOverride | usage;
  } else {
    type.usage |= usage;
  }

  if (type.kind === "enum") return;
  if (!options.propagation) return;
  if (type.baseModel) {
    options.ignoreSubTypeStack.push(true);
    updateUsageOfModel(context, usage, type.baseModel, options);
    options.ignoreSubTypeStack.pop();
  }
  if (
    type.discriminatedSubtypes &&
    (options.ignoreSubTypeStack.length === 0 || !options.ignoreSubTypeStack.at(-1))
  ) {
    for (const discriminatedSubtype of Object.values(type.discriminatedSubtypes)) {
      options.ignoreSubTypeStack.push(false);
      updateUsageOfModel(context, usage, discriminatedSubtype, options);
      options.ignoreSubTypeStack.pop();
    }
  }
  if (type.additionalProperties) {
    options.ignoreSubTypeStack.push(false);
    updateUsageOfModel(context, usage, type.additionalProperties, options);
    options.ignoreSubTypeStack.pop();
  }
  for (const property of type.properties) {
    options.ignoreSubTypeStack.push(false);
    if (property.kind === "property" && isReadOnly(property) && usage === UsageFlags.Input) {
      continue;
    }
    updateUsageOfModel(context, usage, property.type, options);
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
  for (const param of operation.parameters.properties.values()) {
    if (isNeverOrVoidType(param.type)) continue;
    const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, param.type, operation));
    if (generateConvenient) {
      updateUsageOfModel(context, UsageFlags.Input, sdkType);
    }
  }
  for (const param of httpOperation.parameters.parameters) {
    if (isNeverOrVoidType(param.param.type)) continue;
    const sdkType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, param.param.type, operation)
    );
    if (generateConvenient) {
      updateUsageOfModel(context, UsageFlags.Input, sdkType);
    }
  }
  const httpBody = httpOperation.parameters.body;
  if (httpBody && !isNeverOrVoidType(httpBody.type)) {
    const sdkType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, httpBody.type, operation)
    );
    if (generateConvenient) {
      // spread body model should be none usage
      if (sdkType.kind !== "model" || !sdkType.isGeneratedName) {
        updateUsageOfModel(context, UsageFlags.Input, sdkType);
      }
      if (httpBody.contentTypes.includes("application/merge-patch+json")) {
        updateUsageOfModel(context, UsageFlags.JsonMergePatch, sdkType);
      }
    }
    if (isMultipartFormData(context, httpBody.type, operation)) {
      updateUsageOfModel(context, UsageFlags.MultipartFormData, sdkType, {
        propagation: false,
      });
    }
  }
  for (const response of httpOperation.responses) {
    for (const innerResponse of response.responses) {
      if (innerResponse.body?.type && !isNeverOrVoidType(innerResponse.body.type)) {
        const sdkType = diagnostics.pipe(
          getClientTypeWithDiagnostics(context, innerResponse.body.type, operation)
        );
        if (generateConvenient) {
          updateUsageOfModel(context, UsageFlags.Output, sdkType);
        }
      }
      if (innerResponse.headers) {
        for (const header of Object.values(innerResponse.headers)) {
          if (isNeverOrVoidType(header.type)) continue;
          const sdkType = diagnostics.pipe(
            getClientTypeWithDiagnostics(context, header.type, operation)
          );
          if (generateConvenient) {
            updateUsageOfModel(context, UsageFlags.Output, sdkType);
          }
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
      updateUsageOfModel(context, UsageFlags.Output, sdkType);

      if (!context.arm) {
        // TODO: currently skipping adding of envelopeResult due to arm error
        // https://github.com/Azure/typespec-azure/issues/311
        const sdkType = diagnostics.pipe(
          getClientTypeWithDiagnostics(context, lroMetaData.envelopeResult, operation)
        );
        updateUsageOfModel(context, UsageFlags.Output, sdkType);
      }
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

function handleServiceOrphanType(context: TCGCContext, type: Model | Enum | Union) {
  const diagnostics = createDiagnosticCollector();
  // eslint-disable-next-line deprecation/deprecation
  if (type.kind === "Model" && isInclude(context, type)) {
    const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type));
    updateUsageOfModel(context, UsageFlags.Input | UsageFlags.Output, sdkType);
  }
  if (getAccessOverride(context, type) !== undefined) {
    const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type));
    updateUsageOfModel(context, UsageFlags.None, sdkType);
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
    // orphan unions
    for (const unionType of client.service.unions.values()) {
      handleServiceOrphanType(context, unionType);
    }
    // server parameters
    const servers = getServers(context.program, client.service);
    if (servers !== undefined && servers[0].parameters !== undefined) {
      for (const param of servers[0].parameters.values()) {
        const sdkType = diagnostics.pipe(getClientTypeWithDiagnostics(context, param));
        updateUsageOfModel(context, UsageFlags.Input, sdkType);
      }
    }
    // versioned enums
    const [_, versionMap] = getVersions(context.program, client.service);
    if (versionMap && versionMap.getVersions()[0]) {
      // create sdk enum for versions enum
      const sdkVersionsEnum = getSdkEnum(context, versionMap.getVersions()[0].enumMember.enum);
      if (
        context.apiVersion !== undefined &&
        context.apiVersion !== "latest" &&
        context.apiVersion !== "all"
      ) {
        const index = sdkVersionsEnum.values.findIndex((v) => v.value === context.apiVersion);
        if (index >= 0) {
          sdkVersionsEnum.values = sdkVersionsEnum.values.slice(0, index + 1);
        }
      }
      updateUsageOfModel(context, UsageFlags.ApiVersionEnum, sdkVersionsEnum);
    }
  }
  // update access
  updateAccessOfModel(context);
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
  diagnostics.pipe(modelChecks(context));
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
