import { getLroMetadata, isFixed } from "@azure-tools/typespec-azure-core";
import {
  BooleanLiteral,
  BytesKnownEncoding,
  DateTimeKnownEncoding,
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
  UsageFlags,
  getDiscriminator,
  getEncode,
  getFormat,
  getKnownValues,
  getVisibility,
  ignoreDiagnostics,
  isNeverType,
  isNullType,
} from "@typespec/compiler";
import {
  ServiceAuthentication,
  Visibility,
  getAuthentication,
  getHeaderFieldName,
  getHeaderFieldOptions,
  getHttpOperation,
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
  SdkContext,
  SdkCredentialParameter,
  SdkCredentialType,
  SdkDatetimeType,
  SdkDictionaryType,
  SdkDurationType,
  SdkEnumType,
  SdkEnumValueType,
  SdkHttpOperation,
  SdkModelPropertyType,
  SdkModelType,
  SdkServiceOperation,
  SdkTupleType,
  SdkType,
  SdkUnionType,
} from "./interfaces.js";
import {
  getAvailableApiVersions,
  getDocHelper,
  getSdkTypeBaseHelper,
  intOrFloat,
  isAzureCoreModel,
  updateWithApiVersionInformation,
} from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";
import {
  getCrossLanguageDefinitionId,
  getEffectivePayloadType,
  getGeneratedName,
  getLibraryName,
  getPropertyNames,
} from "./public-utils.js";

function getEncodeHelper<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Type,
  kind: string
): string {
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
export function addFormatInfo<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: ModelProperty | Scalar,
  propertyType: SdkType
): void {
  const format = getFormat(context.program, type)?.toLocaleLowerCase();
  if (format) {
    switch (format) {
      case "guid":
      case "uuid":
      case "password":
      case "etag":
        propertyType.kind = format;
        break;
      case "url":
      case "uri":
        propertyType.kind = "url";
        break;
      case "armid":
        propertyType.kind = "armId";
        break;
      case "ipaddress":
        propertyType.kind = "ipAddress";
        break;
      case "azurelocation":
        propertyType.kind = "azureLocation";
        break;
      default:
        throw Error(`Unknown format ${format}`);
    }
  }
}

/**
 * Add encoding info onto an sdk type. Since the encoding decorator
 * decorates the ModelProperty, we add the encoding info onto the property's internal
 * type.
 * @param context sdk context
 * @param type the original typespec type. Used to grab the encoding decorator off of
 * @param propertyType the type of the property, i.e. the internal type that we add the encoding info onto
 */
export function addEncodeInfo<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: ModelProperty | Scalar,
  propertyType: SdkType,
  defaultContentType?: string
): void {
  const encodeData = getEncode(context.program, type);
  if (propertyType.kind === "duration") {
    if (!encodeData) return;
    propertyType.encode = encodeData.encoding as DurationKnownEncoding;
    propertyType.wireType = getClientType(context, encodeData.type) as SdkBuiltInType;
  }
  if (propertyType.kind === "datetime") {
    if (encodeData) {
      propertyType.encode = encodeData.encoding as DateTimeKnownEncoding;
      propertyType.wireType = getClientType(context, encodeData.type) as SdkBuiltInType;
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
}

/**
 * Mapping of typespec scalar kinds to the built in kinds exposed in the SDK
 * @param scalar the original typespec scalar
 * @returns the corresponding sdk built in kind
 */
function getScalarKind(scalar: Scalar): SdkBuiltInKinds {
  switch (scalar.name) {
    case "int8":
    case "int16":
    case "int32":
    case "uint8":
    case "uint16":
    case "uint32":
    case "numeric":
    case "integer":
      return "int32";
    case "safeint":
    case "uint64":
    case "int64":
      return "int64";
    case "plainDate":
      return "date";
    case "plainTime":
      return "time";
    case "float":
      return "float32";
    case "decimal128":
      return "decimal128";
    case "bytes":
    case "float32":
    case "float64":
    case "boolean":
    case "string":
    case "url":
    case "decimal":
      return scalar.name;
    default:
      throw Error(`Unknown scalar kind ${scalar.name}`);
  }
}

/**
 * Get the sdk built in type for a given typespec type
 * @param context the sdk context
 * @param type the typespec type
 * @returns the corresponding sdk type
 */
export function getSdkBuiltInType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Scalar | IntrinsicType | NumericLiteral | StringLiteral | BooleanLiteral
): SdkBuiltInType {
  if (context.program.checker.isStdType(type) || type.kind === "Intrinsic") {
    let kind: SdkBuiltInKinds = "any";
    if (type.kind === "Scalar") {
      kind = getScalarKind(type);
    }
    return {
      ...getSdkTypeBaseHelper(context, type, kind),
      encode: getEncodeHelper(context, type, kind),
    };
  } else if (type.kind === "String" || type.kind === "Boolean" || type.kind === "Number") {
    let kind: SdkBuiltInKinds;

    if (type.kind === "String") {
      kind = "string";
    } else if (type.kind === "Boolean") {
      kind = "boolean";
    } else {
      kind = intOrFloat(type.value);
    }
    return {
      ...getSdkTypeBaseHelper(context, type, kind),
      encode: getEncodeHelper(context, type, kind),
    };
  }
  throw Error(`Unknown kind ${type.kind}`);
}

export function getSdkDatetimeType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Scalar
): SdkDatetimeType {
  // we don't get encode info until we get to the property / parameter level
  // so we insert the default. Later in properties, we will check
  // for encoding info and override accordingly
  return {
    ...getSdkTypeBaseHelper(context, type, "datetime"),
    encode: "rfc3339",
    wireType: { ...getSdkTypeBaseHelper(context, type, "string"), encode: "string" },
  };
}

export function getSdkDurationType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Scalar
): SdkDurationType {
  // we don't get encode info until we get to the property / parameter level
  // so we insert the default. Later in properties, we will check
  // for encoding info and override accordingly
  return {
    ...getSdkTypeBaseHelper(context, type, "duration"),
    encode: "ISO8601",
    wireType: { ...getSdkTypeBaseHelper(context, type, "string"), encode: "string" },
  };
}

export function getSdkArrayOrDict<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Model,
  operation?: Operation
): (SdkDictionaryType | SdkArrayType) | undefined {
  if (type.indexer !== undefined) {
    if (!isNeverType(type.indexer.key)) {
      const valueType = getClientType(context, type.indexer.value!, operation);
      const name = type.indexer.key.name;
      if (name === "string") {
        // model MyModel is Record<> {} should be model with additional properties
        if (type.sourceModel?.kind === "Model" && type.sourceModel?.name === "Record") {
          return undefined;
        }
        return {
          ...getSdkTypeBaseHelper(context, type, "dict"),
          keyType: getClientType(context, type.indexer.key, operation),
          valueType,
        };
      } else if (name === "integer") {
        return {
          ...getSdkTypeBaseHelper(context, type, "array"),
          valueType,
        };
      }
    }
  }
  return undefined;
}

export function getSdkTuple<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Tuple,
  operation?: Operation
): SdkTupleType {
  return {
    ...getSdkTypeBaseHelper(context, type, "tuple"),
    values: type.values.map((x) => getClientType(context, x, operation)),
  };
}

// function handleLiteralInsteadOfEnum(
//   context: SdkContext,
//   type: Union,
//   nonNullOptions: (StringLiteral | NumericLiteral)[]
// ): SdkBuiltInType | undefined {
//   const tspKind = nonNullOptions[0].kind;
//   for (const option of nonNullOptions) {
//     if (option.kind !== tspKind) {
//       reportUnionUnsupported(context, type);
//       return;
//     }
//   }
//   reportDiagnostic(context.program, { code: "use-enum-instead", target: type });
//   const enumVal = getSdkEnumValueType(context, nonNullOptions[0]);
//   enumVal.__raw = type;
//   return enumVal;
// }

function getNonNullOptions(type: Union): Type[] {
  return [...type.variants.values()].map((x) => x.type).filter((t) => !isNullType(t));
}

export function getSdkUnion<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Union,
  operation?: Operation
): SdkType | undefined {
  const nonNullOptions = getNonNullOptions(type);
  if (nonNullOptions.length === 0) {
    reportDiagnostic(context.program, { code: "union-null", target: type });
    return;
  }
  // const tspKind = nonNullOptions[0].kind;
  // switch (tspKind) {
  //   case "String":
  //   case "Number":
  //     break;
  //   case "Boolean":
  //     // emitters don't support boolean enums right now
  //     // should we automatically convert these to boolean types / constant?
  //     reportUnionUnsupported(context, type);
  //     return;
  //   case "Model":
  //   case "Enum":
  //   case "Scalar":
  //     // Model unions can only ever be a model type with 'null'
  //     if (nonNullOptions.length === 1) {
  //       // Generate as internal type if there is only one internal type in this Union.
  //       const clientType = getClientType(context, nonNullOptions[0]);
  //       clientType.nullable = true;
  //       return clientType;
  //     }
  //     return {
  //       ...getSdkTypeBaseHelper(context, type, "union"),
  //       name: type.name,
  //       values: nonNullOptions.map((x) => getClientType(context, x)),
  //     };
  //   default:
  //     reportUnionUnsupported(context, type);
  //     return;
  // }

  // // We now create an enum for the remaining case, literals of the same type
  // return handleLiteralInsteadOfEnum(
  //   context,
  //   type,
  //   nonNullOptions as (StringLiteral | NumericLiteral)[]
  // );

  // change to a simple logic: only convert to normal type if the union is type | null, otherwise, return all the union types
  if (nonNullOptions.length === 1) {
    const clientType = getClientType(context, nonNullOptions[0], operation);
    clientType.nullable = true;
    return clientType;
  }
  let sdkType = context.unionsMap?.get(type) as SdkUnionType | undefined;
  if (!sdkType) {
    sdkType = {
      ...getSdkTypeBaseHelper(context, type, "union"),
      name: type.name,
      generatedName: type.name ? undefined : getGeneratedName(context, type),
      values: nonNullOptions.map((x) => getClientType(context, x, operation)),
      nullable: nonNullOptions.length < type.variants.size,
    };
    if (context.unionsMap === undefined) {
      context.unionsMap = new Map<Union, SdkUnionType>();
    }
    context.unionsMap.set(type, sdkType);
  }
  return sdkType;
}

export function getSdkConstant<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: StringLiteral | NumericLiteral | BooleanLiteral
): SdkConstantType {
  switch (type.kind) {
    case "Number":
    case "String":
    case "Boolean":
      const valueType = getSdkBuiltInType(context, type);
      return {
        ...getSdkTypeBaseHelper(context, type, "constant"),
        value: type.value,
        valueType,
      };
  }
}

function addDiscriminatorToModelType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Model,
  model: SdkModelType,
  operation?: Operation
): void {
  const discriminator = getDiscriminator(context.program, type);
  if (discriminator) {
    let discriminatorProperty;
    for (const childModel of type.derivedModels) {
      const childModelSdkType = getSdkModel(context, childModel, operation);
      updateModelsMap(context, childModel, childModelSdkType, operation);
      for (const property of childModelSdkType.properties) {
        if (property.kind === "property") {
          if (property.serializedName === discriminator?.propertyName) {
            if (property.type.kind !== "constant" && property.type.kind !== "enumvalue") {
              reportDiagnostic(context.program, {
                code: "discriminator-not-constant",
                target: type,
                format: { discriminator: property.nameInClient },
              });
            } else if (typeof property.type.value !== "string") {
              reportDiagnostic(context.program, {
                code: "discriminator-not-string",
                target: type,
                format: {
                  discriminator: property.nameInClient,
                  discriminatorValue: String(property.type.value),
                },
              });
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
        return;
      }
    }
    let discriminatorType: SdkType;
    if (discriminatorProperty) {
      if (discriminatorProperty.type.kind === "constant") {
        discriminatorType = { ...discriminatorProperty.type.valueType };
      } else if (discriminatorProperty.type.kind === "enumvalue") {
        discriminatorType = getSdkEnum(
          context,
          (discriminatorProperty.type.__raw as EnumMember).enum,
          operation
        );
      }
    } else {
      discriminatorType = {
        nullable: false,
        kind: "string",
        encode: "string",
      };
    }
    model.properties.push({
      kind: "property",
      optional: false,
      discriminator: true,
      serializedName: discriminator.propertyName,
      type: discriminatorType!,
      nameInClient: discriminator.propertyName,
      onClient: false,
      apiVersions: getAvailableApiVersions(context, type),
      isApiVersionParam: false,
    });
  }
}

export function getSdkModel<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Model,
  operation?: Operation
): SdkModelType {
  type = getEffectivePayloadType(context, type);
  let sdkType = context.modelsMap?.get(type) as SdkModelType | undefined;
  if (sdkType) {
    updateModelsMap(context, type, sdkType, operation);
  } else {
    const docWrapper = getDocHelper(context, type);
    sdkType = {
      ...getSdkTypeBaseHelper(context, type, "model"),
      name: getLibraryName(context, type),
      generatedName: type.name === "" ? getGeneratedName(context, type) : undefined,
      description: docWrapper.description,
      details: docWrapper.details,
      properties: [],
      additionalProperties: undefined, // going to set additional properties in the next few lines when we look at base model
      access: undefined, // dummy value since we need to update models map before we can set this
      usage: UsageFlags.None, // dummy value since we need to update models map before we can set this
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(type),
      apiVersions: getAvailableApiVersions<TServiceOperation>(context, type),
    };
    updateModelsMap(context, type, sdkType, operation);

    // model MyModel is Record<> {} should be model with additional properties
    if (type.sourceModel?.kind === "Model" && type.sourceModel?.name === "Record") {
      sdkType.additionalProperties = getClientType(
        context,
        type.sourceModel!.indexer!.value!,
        operation
      );
    }
    if (type.baseModel) {
      sdkType.baseModel = context.modelsMap?.get(type.baseModel) as SdkModelType | undefined;
      if (sdkType.baseModel === undefined) {
        const baseModel = getClientType(context, type.baseModel, operation) as
          | SdkDictionaryType
          | SdkModelType;
        if (baseModel.kind === "dict") {
          // model MyModel extends Record<> {} should be model with additional properties
          sdkType.additionalProperties = baseModel.valueType;
        } else {
          sdkType.baseModel = baseModel;
          updateModelsMap(context, type.baseModel, sdkType.baseModel, operation);
        }
      }
    }
    addPropertiesToModelType(context, type, sdkType, operation);
    addDiscriminatorToModelType(context, type, sdkType, operation);
  }
  return sdkType;
}

function getSdkEnumValueType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: EnumMember | StringLiteral | NumericLiteral
): SdkBuiltInType {
  let kind: "string" | "int32" | "float32" = "string";
  if (typeof type.value === "number") {
    kind = intOrFloat(type.value);
  }
  return {
    ...getSdkTypeBaseHelper(context, type, kind),
    encode: kind,
  };
}

export function getSdkEnumValue<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  enumType: SdkEnumType,
  type: EnumMember
): SdkEnumValueType {
  const docWrapper = getDocHelper(context, type);
  return {
    ...getSdkTypeBaseHelper(context, type, "enumvalue"),
    name: type.name,
    value: type.value ?? type.name,
    description: docWrapper.description,
    details: docWrapper.details,
    enumType,
    valueType: enumType.valueType,
  };
}

export function getSdkEnum<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Enum,
  operation?: Operation
): SdkEnumType {
  let sdkType = context.modelsMap?.get(type) as SdkEnumType | undefined;
  if (!sdkType) {
    const docWrapper = getDocHelper(context, type);
    sdkType = {
      ...getSdkTypeBaseHelper(context, type, "enum"),
      name: type.name,
      description: docWrapper.description,
      details: docWrapper.details,
      valueType: getSdkEnumValueType(context, type.members.values().next().value),
      values: [],
      isFixed: isFixed(context.program, type),
      isFlags: false,
      usage: UsageFlags.None, // We will add usage as we loop through the operations
      access: undefined, // Dummy value until we update models map
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(type),
      apiVersions: getAvailableApiVersions<TServiceOperation>(context, type),
    };
    for (const member of type.members.values()) {
      sdkType.values.push(getSdkEnumValue(context, sdkType, member));
    }
  }
  updateModelsMap(context, type, sdkType, operation);
  return sdkType;
}

function getKnownValuesEnum<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
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
        name: type.name,
        description: docWrapper.description,
        details: docWrapper.details,
        valueType: getSdkEnumValueType(context, knownValues.members.values().next().value),
        values: [],
        isFixed: false,
        isFlags: false,
        usage: UsageFlags.None, // We will add usage as we loop through the operations
        access: undefined, // Dummy value until we update models map
        crossLanguageDefinitionId: getCrossLanguageDefinitionId(type),
        apiVersions: getAvailableApiVersions<TServiceOperation>(context, type),
      };
      for (const member of knownValues.members.values()) {
        sdkType.values.push(getSdkEnumValue(context, sdkType, member));
      }
    }
    updateModelsMap(context, type, sdkType, operation);
    return sdkType;
  }
}

export function getClientType<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  type: Type,
  operation?: Operation
): SdkType {
  switch (type.kind) {
    case "String":
    case "Number":
    case "Boolean":
      return getSdkConstant(context, type);
    case "Tuple":
      return getSdkTuple(context, type, operation);
    case "Model":
      const dictOrList = getSdkArrayOrDict(context, type, operation);
      if (dictOrList === undefined) {
        return getSdkModel(context, type, operation);
      }
      return dictOrList;
    case "Intrinsic":
      return getSdkBuiltInType(context, type);
    case "Scalar":
      if (!context.program.checker.isStdType(type) && type.kind === "Scalar" && type.baseScalar) {
        const baseType = getClientType<TServiceOperation>(context, type.baseScalar, operation);
        addEncodeInfo(context, type, baseType);
        addFormatInfo(context, type, baseType);
        return getKnownValuesEnum(context, type, operation) ?? baseType;
      }
      if (type.name === "utcDateTime" || type.name === "offsetDateTime") {
        return getSdkDatetimeType(context, type);
      }
      if (type.name === "duration") {
        return getSdkDurationType(context, type);
      }
      const scalarType = getSdkBuiltInType(context, type);
      // just add default encode, normally encode is on extended scalar and model property
      addEncodeInfo(context, type, scalarType);
      return scalarType;
    case "Enum":
      return getSdkEnum(context, type, operation);
    case "Union":
      // start off with just handling nullable type
      const union = getSdkUnion(context, type, operation);
      if (union === undefined) {
        throw Error(`Error encountered during generation, view diagnostic logs`);
      }
      return union;
    case "ModelProperty":
      const innerType = getClientType<TServiceOperation>(context, type.type, operation);
      addEncodeInfo(context, type, innerType);
      addFormatInfo(context, type, innerType);
      return getKnownValuesEnum(context, type, operation) ?? innerType;
    case "UnionVariant":
      return {
        ...getSdkTypeBaseHelper(context, type, "any"),
        encode: getEncodeHelper(context, type, "any"),
      };
    case "EnumMember":
      const enumType = getSdkEnum(context, type.enum, operation);
      return getSdkEnumValue(context, enumType, type);
    default:
      throw Error(`Not supported ${type.kind}`);
  }
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

function getSdkVisibility<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: ModelProperty
): Visibility[] | undefined {
  const visibility = getVisibility(context.program, type);
  if (visibility) {
    const result = [];
    if (visibility?.includes("read")) {
      result.push(Visibility.Read);
    }
    if (visibility?.includes("create")) {
      result.push(Visibility.Create);
    }
    if (visibility?.includes("update")) {
      result.push(Visibility.Update);
    }
    if (visibility?.includes("delete")) {
      result.push(Visibility.Delete);
    }
    if (visibility?.includes("query")) {
      result.push(Visibility.Query);
    }
    return result;
  }
  return undefined;
}

function getCollectionFormat<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
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
  authentication: ServiceAuthentication
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
    };
  }
  return credentialTypes[0];
}

export function getSdkCredentialParameter<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  client: SdkClient
): SdkCredentialParameter | undefined {
  const auth = getAuthentication(context.program, client.service);
  if (!auth) return undefined;
  return {
    type: getSdkCredentialType(client, auth),
    kind: "credential",
    nameInClient: "credential",
    description: "Credential used to authenticate requests to the service.",
    apiVersions: getAvailableApiVersions<TServiceOperation>(context, client.service),
    onClient: true,
    optional: false,
    isApiVersionParam: false,
  };
}

interface GetSdkModelPropertyTypeOptions {
  isEndpointParam?: boolean;
  operation?: Operation;
  isMethodParameter?: boolean;
  defaultContentType?: string;
}

export function getSdkModelPropertyType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: ModelProperty,
  options: GetSdkModelPropertyTypeOptions = {}
): SdkModelPropertyType {
  let propertyType = getClientType<TServiceOperation>(context, type.type, options.operation);
  addEncodeInfo(context, type, propertyType, options.defaultContentType);
  addFormatInfo(context, type, propertyType);
  const knownValues = getKnownValues(context.program, type);
  if (knownValues) {
    propertyType = getSdkEnum(context, knownValues, options.operation);
  }
  const docWrapper = getDocHelper(context, type);
  const base = {
    __raw: type,
    description: docWrapper.description,
    details: docWrapper.details,
    apiVersions: getAvailableApiVersions(context, type),
    type: propertyType,
    nameInClient: getPropertyNames(context, type)[0],
    onClient: false,
    optional: type.optional,
  };
  const program = context.program;
  const headerQueryOptions = {
    ...base,
    optional: type.optional,
    collectionFormat: getCollectionFormat(context, type),
  };
  if (options.isMethodParameter) {
    return {
      ...base,
      kind: "method",
      ...updateWithApiVersionInformation(context, type),
      optional: type.optional,
    };
  } else if (isPathParam(program, type) || options.isEndpointParam) {
    return {
      ...base,
      kind: "path",
      urlEncode: true,
      serializedName: getPathParamName(program, type),
      ...updateWithApiVersionInformation(context, type),
      optional: false,
    };
  } else if (isHeader(program, type)) {
    return {
      ...headerQueryOptions,
      kind: "header",
      serializedName: getHeaderFieldName(program, type),
      ...updateWithApiVersionInformation(context, type),
    };
  } else if (isQueryParam(program, type)) {
    return {
      ...headerQueryOptions,
      kind: "query",
      serializedName: getQueryParamName(program, type),
      ...updateWithApiVersionInformation(context, type),
    };
  } else if (isBody(program, type)) {
    return {
      ...base,
      kind: "body",
      contentTypes: ["application/json"], // will update when we get to the operation level
      defaultContentType: "application/json", // will update when we get to the operation level
      ...updateWithApiVersionInformation(context, type),
      optional: false,
    };
  } else {
    // I'm a body model property
    return {
      ...base,
      kind: "property",
      optional: type.optional,
      visibility: getSdkVisibility(context, type),
      discriminator: false,
      serializedName: getPropertyNames(context, type)[1],
      ...updateWithApiVersionInformation(context, type),
    };
  }
}

function addPropertiesToModelType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Model,
  sdkType: SdkType,
  operation?: Operation
): void {
  for (const property of type.properties.values()) {
    if (
      isStatusCode(context.program, property) ||
      isNeverType(property.type) ||
      sdkType.kind !== "model"
    ) {
      continue;
    }
    const clientProperty = getSdkModelPropertyType(context, property, { operation: operation });
    if (sdkType.properties) {
      sdkType.properties.push(clientProperty);
    } else {
      sdkType.properties = [clientProperty];
    }
  }
}

function updateModelsMap<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
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
      if (sdkType.discriminatedSubtypes) {
        for (const subtype of Object.values(sdkType.discriminatedSubtypes)) {
          updateModelsMap(context, subtype.__raw as any, subtype, operation);
        }
      }
    }
  }
}

function checkAndGetClientType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Type,
  operation?: Operation
): SdkType[] {
  const retval: SdkType[] = [];
  if (type.kind === "Model") {
    if (isExclude(context, type)) return []; // eslint-disable-line deprecation/deprecation
    const effectivePayloadType = getEffectivePayloadType(context, type);
    if (context.filterOutCoreModels && isAzureCoreModel(effectivePayloadType)) {
      if (effectivePayloadType.templateMapper && effectivePayloadType.name) {
        effectivePayloadType.templateMapper.args
          .filter((arg) => arg.kind === "Model" && arg.name)
          .forEach((arg) => {
            retval.push(...checkAndGetClientType(context, arg, operation));
          });
        return retval;
      } else {
        return [];
      }
    }
  }
  retval.push(getClientType(context, type, operation));
  return retval; // this will update the models map / simple types map
}

function updateUsageOfModel<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
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
  for (const property of type.properties) {
    updateUsageOfModel(context, usage, property.type, seenModelNames);
  }
}

function updateTypesFromOperation<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation
): void {
  const program = context.program;
  const httpOperation = ignoreDiagnostics(getHttpOperation(program, operation));
  const generateConvenient = shouldGenerateConvenient(context, operation);
  for (const param of operation.parameters.properties.values()) {
    const paramTypes = checkAndGetClientType(context, param.type, operation);
    if (generateConvenient) {
      paramTypes.forEach((paramType) => {
        updateUsageOfModel(context, UsageFlags.Input, paramType);
      });
    }
  }
  for (const param of httpOperation.parameters.parameters) {
    const paramTypes = checkAndGetClientType(context, param.param.type, operation);
    if (generateConvenient) {
      paramTypes.forEach((paramType) => {
        updateUsageOfModel(context, UsageFlags.Input, paramType);
      });
    }
  }
  if (httpOperation.parameters.body) {
    const bodies = checkAndGetClientType(context, httpOperation.parameters.body.type, operation);
    if (generateConvenient) {
      bodies.forEach((body) => {
        updateUsageOfModel(context, UsageFlags.Input, body);
      });
    }
  }
  for (const response of httpOperation.responses) {
    for (const innerResponse of response.responses) {
      if (innerResponse.body?.type) {
        const responseBodies = checkAndGetClientType(context, innerResponse.body.type, operation);
        if (generateConvenient) {
          responseBodies.forEach((responseBody) => {
            updateUsageOfModel(context, UsageFlags.Output, responseBody);
          });
        }
      }
    }
  }
  const lroMetaData = getLroMetadata(program, operation);
  if (lroMetaData) {
    const logicalResults = checkAndGetClientType(context, lroMetaData.logicalResult, operation);
    if (generateConvenient) {
      logicalResults.forEach((logicalResult) => {
        updateUsageOfModel(context, UsageFlags.Output, logicalResult);
      });
    }
  }
}

function updateAccessOfModel<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>
): void {
  for (const [type, sdkType] of context.modelsMap?.entries() ?? []) {
    const internal = isInternal(context, type as any); // eslint-disable-line deprecation/deprecation
    if (internal) {
      sdkType.access = "internal";
      continue;
    }

    const accessOverride = getAccessOverride(context, type as any);
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

function handleServiceOrphanType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  type: Model | Enum
) {
  // eslint-disable-next-line deprecation/deprecation
  if (type.kind === "Model" && isInclude(context, type)) {
    const sdkModels = checkAndGetClientType(context, type);
    sdkModels.forEach((sdkModel) => {
      updateUsageOfModel(context, UsageFlags.Input | UsageFlags.Output, sdkModel);
    });
  }
  if (getAccessOverride(context, type) !== undefined) {
    const sdkModels = checkAndGetClientType(context, type);
    sdkModels
      .filter((sdkModel) => ["model", "enum", "array", "dict", "union"].includes(sdkModel.kind))
      .forEach((sdkModel) => {
        updateUsageOfModel(context, UsageFlags.None, sdkModel);
      });
  }
}

export function getAllModels<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  options: GetAllModelsOptions = {}
): (SdkModelType | SdkEnumType)[] {
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
      updateTypesFromOperation(context, operation);
    }
    for (const operationGroup of listOperationGroups(context, client)) {
      for (const operation of listOperationsInOperationGroup(context, operationGroup)) {
        // operations on operation groups
        updateTypesFromOperation(context, operation);
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
        const sdkModels = checkAndGetClientType(context, param);
        sdkModels.forEach((sdkModel) => {
          updateUsageOfModel(context, UsageFlags.Input, sdkModel);
        });
      }
    }
  }
  // update access
  updateAccessOfModel(context);
  let filter = 0;
  if (options.input) {
    filter += UsageFlags.Input;
  }
  if (options.output) {
    filter += UsageFlags.Output;
  }
  return [...context.modelsMap.values()].filter((t) => (t.usage & filter) > 0);
}
