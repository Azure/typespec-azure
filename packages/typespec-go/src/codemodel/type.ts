/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- codemodel intentionally merges interface and class declarations of the same name to define its public API shape. */

import * as path from "path";
import { Client, ClientOptions } from "./client.js";
import { type PackageContent, type PackageType, getPackageName } from "./module.js";
import { ParameterGroup } from "./param.js";
import { ResponseEnvelope } from "./result.js";

/** Docs contains the values used in doc comment generation. */
export interface Docs {
  /** the high level summary */
  summary?: string;

  /** detailed description */
  description?: string;
}

/** defines types used in generated code but do not go across the wire */
export type SdkType =
  ArmClientOptions | ClientOptions | ParameterGroup | ResponseEnvelope | TokenCredential;

/** defines types that go across the wire */
export type WireType =
  | Any
  | Constant
  | ConstantDef
  | ConstantValue
  | EncodedBytes
  | ETag
  | Interface
  | Literal
  | Map
  | Model
  | MultipartContent
  | PolymorphicModel
  | Ptr
  | RawJSON
  | ReadCloser
  | ReadSeekCloser
  | Scalar
  | Slice
  | SliceArray
  | String
  | Time
  | UnionStruct;

/** defines a type within the Go type system */
export type Type = SdkType | WireType;

/** the Go any type */
export interface Any {
  kind: "any";
}

/** an arm.ClientOptions type from azcore */
export interface ArmClientOptions extends QualifiedType {
  kind: "armClientOptions";
}

/** a const type definition used for enums */
export interface Constant<T extends ConstantType = ConstantType> {
  kind: "constant";

  /** the const type name */
  name: string;

  /** any docs for the const type */
  docs: Docs;

  /** the package to which this type belongs */
  pkg: PackageContent;

  /** the underlying type of the const */
  type: T;

  /** the possible values for this const */
  values: Array<ConstantValue>;

  /** the name of the func that returns the set of values */
  valuesFuncName: string;
}

/** the underlying type of a const */
export type ConstantType = "bool" | "float32" | "float64" | "int32" | "int64" | "string";

/** a const enum value definition */
export interface ConstantValue {
  kind: "constantValue";

  /** the const value name */
  name: string;

  /** any docs for the const value */
  docs: Docs;

  /** the const to which this value belongs */
  type: Constant;

  /** the value for this const */
  value: ConstantValueType;
}

/** a non-enum constant (e.g. const foo string = "bar") */
export interface ConstantDef {
  kind: "constantDef";

  /** the name of the constant */
  name: string;

  /** the type and value of the constant */
  literal: Literal<String>;
}

/** the underlying type of a const value */
export type ConstantValueType = boolean | number | string;

/** a byte slice that's base64 encoded */
export interface EncodedBytes {
  kind: "encodedBytes";

  /** indicates what kind of base64-encoding to use */
  encoding: BytesEncoding;
}

/** the types of base64 encoding */
export type BytesEncoding = "Std" | "URL";

/** an azcore.ETag type */
export interface ETag extends QualifiedType {
  kind: "etag";
}

/** a Go interface type used for discriminated types */
export interface Interface {
  kind: "interface";

  /** the name of the interface (e.g. FishClassification) */
  name: string;

  /** any docs for the interface */
  docs: Docs;

  /** contains possible concrete type instances (e.g. Flounder, Carp) */
  possibleTypes: Array<PolymorphicModel>;

  /** contains the name of the discriminator field in the JSON (e.g. "fishtype") */
  discriminatorField: string;

  /** does this polymorphic type have a parent (e.g. SalmonClassification has parent FishClassification) */
  parent?: Interface;

  /**  this is the "root" type in the list of polymorphic types (e.g. Fish for FishClassification) */
  rootType: PolymorphicModel;

  /** the package to which this type belongs */
  pkg: PackageContent;
}

/** a literal value (e.g. "foo", 123, true) */
export interface Literal<T extends LiteralType = LiteralType> {
  kind: "literal";

  /**
   * the literal's underlying type.
   * note that when T is a Constant type,
   * literal will contain a ConstantValue
   */
  type: T;

  /**
   * the value for this literal.
   * usually a boolean, number, or string
   * but it can also be a ConstantValue
   */
  literal: unknown;
}

/** the possible types of literals */
export type LiteralType = Constant | ConstantDef | EncodedBytes | Scalar | String | Time;

/** a Go map type. note that the key is always a string */
export interface Map<T extends MapValueType = MapValueType> {
  kind: "map";

  /**
   * the type of values in the map.
   * note that the type is always pointer-to-type
   * unless the type is implicitly nil-able.
   */
  valueType: T;
}

/** the set of map value types */
export type MapValueType =
  | Any
  | EncodedBytes
  | Interface
  | Map
  | Ptr<Exclude<PtrType, ETag | Literal>>
  | RawJSON
  | ReadCloser
  | ReadSeekCloser
  | Slice
  | SliceArray;

/** a field within a model */
export interface ModelField extends StructField {
  /** the field's underlying type */
  type: WireType;

  /** the name of the field as it's sent/received over the wire */
  serializedName: string;

  /** metadata for this field */
  annotations: ModelFieldAnnotations;

  /** the value to send over the wire if one isn't specified */
  defaultValue?: Literal;

  /** contains XML-specific serde info */
  xmlKind?: XMLKind;
}

/** additional settings for a model type */
export interface ModelAnnotations {
  /** when true, serde methods will not be generated */
  omitSerDeMethods: boolean;

  /** indicates the model should be converted into multipart/form data */
  multipartFormData: boolean;
}

/** additional settings for a model field */
export interface ModelFieldAnnotations {
  /** the field is required on input and will always be populated on output */
  required: boolean;

  /** the field is read-only and will be populated on output. any set value on input will be ignored */
  readOnly: boolean;

  /** field is JSON additional properties */
  isAdditionalProperties: boolean;

  /** field is the discriminator for a discriminated type */
  isDiscriminator: boolean;

  /** unmarshal an empty string as nil. the default is false */
  unmarshalEmptyStringAsNil: boolean;
}

/** a struct that participates in serialization over the wire */
export interface Model extends ModelBase {
  kind: "model";
}

/** a streaming.MultipartContent type from azcore */
export interface MultipartContent extends QualifiedType {
  kind: "multipartContent";

  /** optional, explicit content-type for the payload */
  contentType?: Literal<String>;
}

/** a model that's a discriminated type */
export interface PolymorphicModel extends ModelBase {
  kind: "polymorphicModel";

  /** the polymorphic interface this type implements */
  interface: Interface;

  /**
   * the value in the JSON that indicates what type was sent over the wire (e.g. goblin, salmon, shark)
   * note that for "root" types (Fish), there is no discriminatorValue. however, "sub-root" types (e.g. Salmon)
   * will have this populated.
   */
  discriminatorValue?: Literal;
}

/** defines possible Ptr types */
export type PtrType =
  | Constant
  | ETag
  | Literal
  | Model
  | MultipartContent
  | PolymorphicModel
  | Scalar
  | String
  | Time
  | UnionStruct;

/** a pointer to some type */
export interface Ptr<T extends PtrType = PtrType> {
  kind: "ptr";

  /** the type being pointed to */
  ptrType: T;
}

/** a byte slice containing raw JSON */
export interface RawJSON {
  kind: "rawJSON";
}

/** a Go scalar type */
export interface Scalar<T extends ScalarType = ScalarType> {
  kind: "scalar";

  /** the type of scalar */
  type: T;

  /** indicates the value is sent/received as a string */
  encodeAsString: boolean;
}

/** an io.ReadCloser */
export interface ReadCloser extends QualifiedType {
  kind: "readCloser";
}

/** an io.ReadSeekCloser */
export interface ReadSeekCloser extends QualifiedType {
  kind: "readSeekCloser";
}

/** the supported Go scalar types */
export type ScalarType =
  | "bool"
  | "byte"
  | "float32"
  | "float64"
  | "int8"
  | "int16"
  | "int32"
  | "int64"
  | "rune"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64";

/** a Go slice */
export interface Slice<T extends SliceElementType = SliceElementType> {
  kind: "slice";

  /** the element type for this slice */
  elementType: T;

  /** the XML name for the elements */
  xmlName?: string;
}

/** the set of slice element types */
export type SliceElementType =
  | Any
  | Constant
  | EncodedBytes
  | Interface
  | Map
  | Model
  | MultipartContent
  | PolymorphicModel
  | Ptr<Exclude<PtrType, ETag | Literal>>
  | RawJSON
  | ReadCloser
  | ReadSeekCloser
  | Scalar
  | Slice
  | SliceArray
  | String
  | Time
  | UnionStruct;

/** specialized slice type for arrays represented as delimited strings */
export interface SliceArray {
  kind: "sliceArray";

  /** the element type for this slice */
  elementType: SliceArrayElementType;

  /** the delimiter used to separate elements */
  delimiter: SliceArrayDelimiter;
}

/** the set of slice array delimiters */
export type SliceArrayDelimiter = "comma" | "newline" | "pipe" | "space";

/** the supported element types for arrays represented as delimited strings */
export type SliceArrayElementType = SliceArrayElementWireType | Ptr<SliceArrayElementWireType>;

/** the set of slice array wire types */
export type SliceArrayElementWireType = Constant | String;

/** a Go string */
export interface String {
  kind: "string";
}

/** a vanilla struct definition (pretty much exclusively used for parameter groups/options bag types) */
export interface Struct extends StructBase {
  kind: "struct";
}

/** a field definition within a struct */
export interface StructField {
  /** the name of the field */
  name: string;

  /** and docs for this field */
  docs: Docs;

  /** the field's underlying type */
  type: Type;
}

/** a time.Time type from the standard library with a format specifier */
export interface Time extends QualifiedType {
  kind: "time";

  /** the serde format used */
  format: TimeFormat;

  /**
   * indicates the value must be coerced to UTC (via .UTC()) before marshalling.
   * this is only true for RFC3339 utcDateTime values: RFC3339 is the sole
   * offset-preserving format, so RFC7231 (always GMT) and Unix (absolute) leave
   * this false even for a utcDateTime.
   */
  utc: boolean;
}

/** the set of time serde formats */
export type TimeFormat = "PlainDate" | "RFC1123" | "RFC3339" | "RFC7231" | "PlainTime" | "Unix";

/** an azcore.TokenCredential */
export interface TokenCredential extends QualifiedType {
  kind: "tokenCredential";

  /** the scopes to include for the credential */
  scopes: Array<string>;
}

/** a single variant within a union */
export interface UnionField extends StructField {
  /** the variant's underlying type */
  type: UnionVariantType;
}

/** a Go struct modeling a non-discriminated union where exactly one field is set */
export interface UnionStruct extends StructBase {
  kind: "unionStruct";

  /** the variant fields of the union. exactly one is populated at runtime */
  fields: Array<UnionField>;
}

/**
 * the subset of WireType kinds that can appear as a variant within a non-discriminated union.
 * pointer-capable variants are stored pointer-to-type.
 */
export type UnionVariantType = Map | Slice | Ptr<UnionVariantPtrType>;

/** the pointer-capable wire types that can be a union variant */
export type UnionVariantPtrType = Constant | Literal | Model | Scalar | String;

/** the wire types accepted as a union variant, prior to pointer-wrapping */
export type UnionVariantWireType = Map | Slice | UnionVariantPtrType;

/** bit flags indicating how a model/polymorphic type is used */
export enum UsageFlags {
  /** the type is unreferenced */
  None = 0,

  /** the type is received over the wire */
  Input = 1,

  /** the type is sent over the wire */
  Output = 2,
}

/** XMLKind contains info used for generating XML-specific serde */
export type XMLKind = "attribute" | "text" | "unwrappedList";

///////////////////////////////////////////////////////////////////////////////////////////////////
// helpers
///////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * returns the Go type declaration for the specified LiteralType
 *
 * @param literal the type for which to emit the declaration
 * @returns the Go type declaration
 */
export function getLiteralTypeDeclaration(literal: LiteralType): string {
  switch (literal.kind) {
    case "constant":
      return literal.name;
    case "constantDef":
      return literal.literal.type.kind;
    case "encodedBytes":
      return "[]byte";
    case "scalar":
      return literal.type;
    case "string":
      return literal.kind;
    case "time":
      return "time.Time";
  }
}

/**
 * returns the Go type declaration for the specified type.
 * if the type is defined in a package that's different from
 * the provided scope, the type declaration will include
 * the type's package name prefix.
 *
 * @param type the type for which to emit the declaration
 * @param scope the scope in which the type declaration is emitted
 * @param instance emit the type declaration used for defining an instance instead of a type.
 * only useful for Ptr types so "&" is emitted instead of "*". the default is false.
 * @returns the Go type declaration
 */
export function getTypeDeclaration(
  type: Client | Type,
  scope: PackageType,
  instance: boolean = false,
): string {
  // client/method options are always emitted as pointer-to-type thus aren't wrapped in a go.Ptr
  const byRef =
    type.kind === "armClientOptions" ||
    type.kind === "clientOptions" ||
    (type.kind === "paramGroup" && !type.required)
      ? instance
        ? "&"
        : "*"
      : "";
  switch (type.kind) {
    case "any":
    case "string":
      return type.kind;
    case "client":
    case "clientOptions":
    case "constant":
    case "constantValue":
    case "interface":
    case "model":
    case "paramGroup":
    case "polymorphicModel":
    case "responseEnvelope":
    case "unionStruct": {
      let pkg: PackageType;
      const typeName = type.kind === "paramGroup" ? type.groupName : type.name;
      switch (type.kind) {
        case "constantValue":
          pkg = type.type.pkg;
          break;
        case "responseEnvelope":
          pkg = type.method.receiver.type.pkg;
          break;
        default:
          pkg = type.pkg;
      }
      if (pkg !== scope) {
        // type is being referenced from a different package
        // then where it's defined, so add its package prefix
        return `${byRef}${getPackageName(pkg)}.${typeName}`;
      }
      return `${byRef}${typeName}`;
    }
    case "constantDef":
      return type.literal.type.kind;
    case "encodedBytes":
    case "rawJSON":
      return "[]byte";
    case "literal":
      return getTypeDeclaration(type.type, scope);
    case "map":
      return `map[string]${getTypeDeclaration(type.valueType, scope)}`;
    case "ptr":
      return `${instance ? "&" : "*"}${getTypeDeclaration(type.ptrType, scope)}`;
    case "scalar":
      return type.type;
    case "slice":
    case "sliceArray":
      return `[]${getTypeDeclaration(type.elementType, scope)}`;
    case "time":
      return "time.Time";
    case "armClientOptions":
    case "etag":
    case "multipartContent":
    case "readCloser":
    case "readSeekCloser":
    case "tokenCredential":
      // strip module to just the leaf package as required
      return `${byRef}${path.basename(type.module)}.${type.name}`;
  }
}

/**
 * returns the XML name for the provided type or undefined
 *
 * @param type the type to inspect for XMLInfo
 * @returns the XMLInfo or undefined
 */
export function hasXMLName(type: WireType): string | undefined {
  if ("xmlName" in type) {
    return type.xmlName;
  }
  return undefined;
}

/** narrows the field to the model's JSON additional properties bucket, whose type is always a map */
export function isAdditionalProperties(field: ModelField): field is ModelField & { type: Map } {
  return field.annotations.isAdditionalProperties;
}

/** narrows type to a constant with one of the specified underlying types (any constant when no types are given) */
export function isConstant<T extends ConstantType = ConstantType>(
  type: WireType,
  ...kinds: Array<T>
): type is Constant<T> {
  if (type.kind !== "constant") {
    return false;
  }
  return kinds.length === 0 || (kinds as Array<ConstantType>).includes(type.type);
}

/** narrows type to a LiteralType within the conditional block */
export function isLiteralValueType(type: WireType): type is LiteralType {
  switch (type.kind) {
    case "constant":
    case "encodedBytes":
    case "scalar":
    case "string":
    case "time":
      return true;
    default:
      return false;
  }
}

/** the inner (pointed-to) types allowed as a map value */
type MapPtrType = Extract<MapValueType, Ptr> extends Ptr<infer U> ? U : never;

/** narrows type to a map with one of the specified value type kinds (any map when no kinds are given) */
export function isMap<T extends MapValueType["kind"] | MapPtrType["kind"] = MapValueType["kind"]>(
  type: WireType,
  ...kinds: Array<T>
): type is Map<
  | Extract<MapValueType, { kind: T }>
  | (Extract<MapPtrType, { kind: T }> extends never ? never : Ptr<Extract<MapPtrType, { kind: T }>>)
> {
  if (type.kind !== "map") {
    return false;
  }
  return (
    kinds.length === 0 ||
    (kinds as Array<string>).includes(type.valueType.kind) ||
    (kinds as Array<string>).includes(unwrapPtr(type.valueType).kind)
  );
}

/** narrows type to a ptr with one of the specified underlying types (any ptr when no types are given) */
export function isPtr<T extends PtrType["kind"] = PtrType["kind"]>(
  type: WireType,
  ...kinds: Array<T>
): type is Ptr<Extract<PtrType, { kind: T }>> {
  if (type.kind !== "ptr") {
    return false;
  }
  return kinds.length === 0 || (kinds as Array<string>).includes(type.ptrType.kind);
}

/** narrows type to a scalar with one of the specified underlying types (any scalar when no types are given) */
export function isScalar<T extends ScalarType = ScalarType>(
  type: WireType,
  ...kinds: Array<T>
): type is Scalar<T> {
  if (type.kind !== "scalar") {
    return false;
  }
  return kinds.length === 0 || (kinds as Array<ScalarType>).includes(type.type);
}

type SlicePtrType = Extract<SliceElementType, Ptr> extends Ptr<infer U> ? U : never;

/** narrows type to a slice with one of the specified element type kinds (any slice when no kinds are given) */
export function isSlice<
  T extends SliceElementType["kind"] | SlicePtrType["kind"] = SliceElementType["kind"],
>(
  type: WireType,
  ...kinds: Array<T>
): type is Slice<
  | Extract<SliceElementType, { kind: T }>
  | (Extract<SlicePtrType, { kind: T }> extends never
      ? never
      : Ptr<Extract<SlicePtrType, { kind: T }>>)
> {
  if (type.kind !== "slice") {
    return false;
  }
  return (
    kinds.length === 0 ||
    (kinds as Array<string>).includes(type.elementType.kind) ||
    (kinds as Array<string>).includes(unwrapPtr(type.elementType).kind)
  );
}

/** narrows type to a union variant wire type (prior to pointer-wrapping) within the conditional block */
export function isUnionVariantType(type: Exclude<WireType, Ptr>): type is UnionVariantWireType {
  switch (type.kind) {
    case "constant":
    case "literal":
    case "map":
    case "model":
    case "scalar":
    case "slice":
    case "string":
      return true;
    default:
      return false;
  }
}

/** the result of unwrapping a Ptr from T, distributing over unions */
type UnwrappedPtr<T> = T extends Ptr<infer U> ? U : Exclude<T, Ptr>;

/** unwraps type from a Ptr type, else returns type */
export function unwrapPtr<T extends WireType>(type: T): UnwrappedPtr<T> {
  if (type.kind === "ptr") {
    return type.ptrType as UnwrappedPtr<T>;
  }
  return type as UnwrappedPtr<T>;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// exported base types
///////////////////////////////////////////////////////////////////////////////////////////////////

export class StructField implements StructField {
  constructor(name: string, type: Type) {
    this.name = name;
    this.type = type;
    this.docs = {};
  }
}

/** used when building types that come from an external package */
export interface QualifiedType {
  /** the type name minus any package qualifier (e.g. URL) */
  name: string;

  /** the full name of the module to import (e.g. "net/url") */
  module: string;
}

export class QualifiedType implements QualifiedType {
  constructor(name: string, module: string) {
    this.name = name;
    this.module = module;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// base types
///////////////////////////////////////////////////////////////////////////////////////////////////

interface StructBase {
  /** the name of the struct */
  name: string;

  /** and docs for this struct */
  docs: Docs;

  /** the fields in this struct. can be empty */
  fields: Array<StructField>;

  /** the package to which this type belongs */
  pkg: PackageContent;
}

interface ModelBase extends StructBase {
  /** the fields in this model. can be empty */
  fields: Array<ModelField>;

  /** any annotations for this model */
  annotations: ModelAnnotations;

  /** usage flags for this model */
  usage: UsageFlags;

  /**
   * the name of the type over the wire if it's
   * different from the type's name.
   */
  xmlName?: string;
}

class StructBase implements StructBase {
  constructor(pkg: PackageContent, name: string) {
    this.name = name;
    this.fields = new Array<StructField>();
    this.docs = {};
    this.pkg = pkg;
  }
}

class ModelBase extends StructBase implements ModelBase {
  constructor(pkg: PackageContent, name: string, annotations: ModelAnnotations, usage: UsageFlags) {
    super(pkg, name);
    this.annotations = annotations;
    this.usage = usage;
    this.fields = new Array<ModelField>();
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

export class Any implements Any {
  constructor() {
    this.kind = "any";
  }
}

export class ArmClientOptions extends QualifiedType implements ArmClientOptions {
  constructor() {
    super("ClientOptions", "github.com/Azure/azure-sdk-for-go/sdk/azcore/arm");
    this.kind = "armClientOptions";
  }
}

export class Constant<T extends ConstantType = ConstantType> implements Constant<T> {
  constructor(pkg: PackageContent, name: string, type: T, valuesFuncName: string) {
    this.kind = "constant";
    this.name = name;
    this.pkg = pkg;
    this.type = type;
    this.values = new Array<ConstantValue>();
    this.valuesFuncName = valuesFuncName;
    this.docs = {};
  }
}

export class ConstantDef implements ConstantDef {
  constructor(name: string, literal: Literal<String>) {
    this.kind = "constantDef";
    this.name = name;
    this.literal = literal;
  }
}

export class ConstantValue implements ConstantValue {
  constructor(name: string, type: Constant, value: ConstantValueType) {
    this.kind = "constantValue";
    this.name = name;
    this.type = type;
    this.value = value;
    this.docs = {};
  }
}

export class EncodedBytes implements EncodedBytes {
  constructor(encoding: BytesEncoding) {
    this.kind = "encodedBytes";
    this.encoding = encoding;
  }
}

export class ETag extends QualifiedType implements ETag {
  constructor() {
    super("ETag", "github.com/Azure/azure-sdk-for-go/sdk/azcore");
    this.kind = "etag";
  }
}

export class Interface implements Interface {
  // WireTypes and rootType are required. however, we have a chicken-and-egg
  // problem as creating a PolymorphicType requires the necessary InterfaceType.
  // so these fields MUST be populated after creating the InterfaceType.
  constructor(pkg: PackageContent, name: string, discriminatorField: string) {
    this.kind = "interface";
    this.name = name;
    this.pkg = pkg;
    this.discriminatorField = discriminatorField;
    this.possibleTypes = new Array<PolymorphicModel>();
    this.docs = {};
  }
}

export class Literal<T> implements Literal<T> {
  constructor(type: T, literal: unknown) {
    this.kind = "literal";
    this.type = type;
    this.literal = literal;
  }
}

export class Map<T extends MapValueType = MapValueType> implements Map<T> {
  constructor(valueType: T) {
    this.kind = "map";
    this.valueType = valueType;
  }
}

export class ModelAnnotations implements ModelAnnotations {
  constructor(omitSerDe: boolean, multipartForm: boolean) {
    this.omitSerDeMethods = omitSerDe;
    this.multipartFormData = multipartForm;
  }
}

export class ModelField extends StructField implements ModelField {
  constructor(
    name: string,
    type: WireType,
    serializedName: string,
    annotations: ModelFieldAnnotations,
  ) {
    super(name, type);
    this.serializedName = serializedName;
    this.annotations = annotations;
  }
}

export class ModelFieldAnnotations implements ModelFieldAnnotations {
  constructor(
    required: boolean,
    readOnly: boolean,
    isAddlProps: boolean,
    isDiscriminator: boolean,
  ) {
    this.required = required;
    this.readOnly = readOnly;
    this.isAdditionalProperties = isAddlProps;
    this.isDiscriminator = isDiscriminator;
    this.unmarshalEmptyStringAsNil = false;
  }
}

export class Model extends ModelBase implements Model {
  constructor(pkg: PackageContent, name: string, annotations: ModelAnnotations, usage: UsageFlags) {
    super(pkg, name, annotations, usage);
    this.kind = "model";
    this.fields = new Array<ModelField>();
  }
}

export class MultipartContent extends QualifiedType implements MultipartContent {
  constructor(contentType?: Literal<String>) {
    super("MultipartContent", "github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");
    this.kind = "multipartContent";
    this.contentType = contentType;
  }
}

export class PolymorphicModel extends ModelBase implements PolymorphicModel {
  constructor(
    pkg: PackageContent,
    name: string,
    iface: Interface,
    annotations: ModelAnnotations,
    usage: UsageFlags,
  ) {
    super(pkg, name, annotations, usage);
    this.kind = "polymorphicModel";
    this.interface = iface;
  }
}

export class Ptr<T extends PtrType = PtrType> implements Ptr<T> {
  constructor(ptrType: T) {
    this.kind = "ptr";
    this.ptrType = ptrType;
  }
}

export class RawJSON implements RawJSON {
  constructor() {
    this.kind = "rawJSON";
  }
}

export class ReadCloser extends QualifiedType implements ReadCloser {
  constructor() {
    super("ReadCloser", "io");
    this.kind = "readCloser";
  }
}

export class ReadSeekCloser extends QualifiedType implements ReadSeekCloser {
  constructor() {
    super("ReadSeekCloser", "io");
    this.kind = "readSeekCloser";
  }
}

export class Scalar<T extends ScalarType = ScalarType> implements Scalar<T> {
  constructor(type: T, encodeAsString: boolean) {
    this.kind = "scalar";
    this.type = type;
    this.encodeAsString = encodeAsString;
  }
}

export class Slice<T extends SliceElementType = SliceElementType> implements Slice<T> {
  constructor(elementType: T) {
    this.kind = "slice";
    this.elementType = elementType;
  }
}

export class SliceArray implements SliceArray {
  constructor(elementType: SliceArrayElementType, delimiter: SliceArrayDelimiter) {
    this.kind = "sliceArray";
    this.elementType = elementType;
    this.delimiter = delimiter;
  }
}

export class String implements String {
  constructor() {
    this.kind = "string";
  }
}

export class Struct extends StructBase implements Struct {
  constructor(pkg: PackageContent, name: string) {
    super(pkg, name);
    this.kind = "struct";
  }
}

export class UnionField extends StructField implements UnionField {
  constructor(name: string, type: UnionVariantType) {
    super(name, type);
  }
}

export class UnionStruct extends StructBase implements UnionStruct {
  constructor(pkg: PackageContent, name: string) {
    super(pkg, name);
    this.kind = "unionStruct";
    this.fields = new Array<UnionField>();
  }
}

export class Time extends QualifiedType implements Time {
  constructor(format: TimeFormat, utc: boolean) {
    super("Time", "time");
    this.kind = "time";
    this.format = format;
    this.utc = utc;
  }
}

export class TokenCredential extends QualifiedType implements TokenCredential {
  constructor(scopes: Array<string>) {
    super("TokenCredential", "github.com/Azure/azure-sdk-for-go/sdk/azcore");
    this.kind = "tokenCredential";
    this.scopes = scopes;
  }
}
