import {
  getSourceLocation,
  isArrayModelType,
  type Enum,
  type Model,
  type ModelProperty,
  type Scalar,
  type SourceLocation,
  type Type,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";
import type { HttpCanonicalization } from "@typespec/http-canonicalization";
import type { DiffKind } from "./diff-kind.js";
import type { ApiDiff, DiffComponent, OperationDiffIdentity, OperationIdentity } from "./types.js";

export interface DiffContext {
  operation: OperationIdentity;
  component: DiffComponent;
  statusCode?: string;
  /** Current element path being compared (e.g., "body.properties.tags") */
  elementPath: string;
  /** Visited type pairs for cycle detection (Set of "baseTypeId:headTypeId") */
  visited: Set<string>;
}

const anonymousTypeIds = new WeakMap<object, number>();
let nextAnonymousTypeId = 0;

export function compareCanonicalizedTypes(
  base: HttpCanonicalization,
  head: HttpCanonicalization,
  ctx: DiffContext,
): ApiDiff[] {
  return compareTypes(base.wireType, head.wireType, ctx);
}

export function compareTypes(baseType: Type, headType: Type, ctx: DiffContext): ApiDiff[] {
  const pairKey = `${getTypeKey(baseType)}:${getTypeKey(headType)}`;
  if (ctx.visited.has(pairKey)) {
    return [];
  }

  ctx.visited.add(pairKey);

  try {
    if (baseType.kind !== headType.kind) {
      return [
        makeDiff(
          typeKindChangedKind(ctx),
          ctx,
          ctx.elementPath,
          baseType,
          headType,
          `${componentLabel(ctx.component)} type kind changed at ${ctx.elementPath} from ${baseType.kind} to ${headType.kind}.`,
        ),
      ];
    }

    switch (baseType.kind) {
      case "Model":
        return compareModels(baseType, headType as Model, ctx);
      case "Scalar":
        return compareScalars(baseType, headType as Scalar, ctx);
      case "Enum":
        return compareEnums(baseType, headType as Enum, ctx);
      case "Union":
        return compareUnions(baseType, headType as Union, ctx);
      default:
        return [];
    }
  } finally {
    ctx.visited.delete(pairKey);
  }
}

function compareModels(base: Model, head: Model, ctx: DiffContext): ApiDiff[] {
  if (isArrayModelType(base) && isArrayModelType(head)) {
    return compareTypes(base.indexer.value, head.indexer.value, ctx);
  }

  const diffs: ApiDiff[] = [];

  for (const [name, baseProp] of base.properties) {
    const headProp = head.properties.get(name);
    const elementPath = propertyElementPath(ctx.elementPath, name);

    if (!headProp) {
      diffs.push(
        makeDiff(
          propertyRemovedKind(ctx.component),
          ctx,
          elementPath,
          baseProp,
          undefined,
          `${componentLabel(ctx.component)} property '${name}' was removed at ${elementPath}.`,
        ),
      );
      continue;
    }

    diffs.push(...compareProperties(baseProp, headProp, { ...ctx, elementPath }));
  }

  for (const [name, headProp] of head.properties) {
    if (base.properties.has(name)) {
      continue;
    }

    const elementPath = propertyElementPath(ctx.elementPath, name);
    diffs.push(
      makeDiff(
        propertyAddedKind(ctx.component),
        ctx,
        elementPath,
        undefined,
        headProp,
        `${componentLabel(ctx.component)} property '${name}' was added at ${elementPath}.`,
      ),
    );
  }

  return diffs;
}

function compareProperties(base: ModelProperty, head: ModelProperty, ctx: DiffContext): ApiDiff[] {
  const diffs: ApiDiff[] = [];

  if (!base.optional && head.optional) {
    diffs.push(
      makeDiff(
        propertyMadeOptionalKind(ctx.component),
        ctx,
        ctx.elementPath,
        base,
        head,
        `${componentLabel(ctx.component)} property at ${ctx.elementPath} was made optional.`,
      ),
    );
  } else if (base.optional && !head.optional) {
    diffs.push(
      makeDiff(
        propertyMadeRequiredKind(ctx.component),
        ctx,
        ctx.elementPath,
        base,
        head,
        `${componentLabel(ctx.component)} property at ${ctx.elementPath} was made required.`,
      ),
    );
  }

  diffs.push(...compareTypes(base.type, head.type, ctx));

  return diffs;
}

function compareScalars(base: Scalar, head: Scalar, ctx: DiffContext): ApiDiff[] {
  if (getScalarName(base) === getScalarName(head)) {
    return [];
  }

  return [
    makeDiff(
      typeChangedKind(ctx),
      ctx,
      ctx.elementPath,
      base,
      head,
      `${componentLabel(ctx.component)} type changed at ${ctx.elementPath} from ${getScalarName(base)} to ${getScalarName(head)}.`,
    ),
  ];
}

function compareEnums(base: Enum, head: Enum, ctx: DiffContext): ApiDiff[] {
  const diffs: ApiDiff[] = [];

  for (const [name, baseMember] of base.members) {
    if (!head.members.has(name)) {
      diffs.push(
        makeDiff(
          "EnumerationMemberRemoved",
          ctx,
          joinElementPath(ctx.elementPath, name),
          baseMember,
          undefined,
          `Enumeration member '${name}' was removed at ${ctx.elementPath}.`,
        ),
      );
    }
  }

  for (const [name, headMember] of head.members) {
    if (!base.members.has(name)) {
      diffs.push(
        makeDiff(
          "EnumerationMemberAdded",
          ctx,
          joinElementPath(ctx.elementPath, name),
          undefined,
          headMember,
          `Enumeration member '${name}' was added at ${ctx.elementPath}.`,
        ),
      );
    }
  }

  return diffs;
}

function compareUnions(base: Union, head: Union, ctx: DiffContext): ApiDiff[] {
  const diffs: ApiDiff[] = [];
  const baseNamed = new Map<string, UnionVariant>();
  const headNamed = new Map<string, UnionVariant>();
  const baseAnonymous = new Map<string, UnionVariant>();
  const headAnonymous = new Map<string, UnionVariant>();

  for (const variant of base.variants.values()) {
    if (typeof variant.name === "string") {
      baseNamed.set(variant.name, variant);
    } else {
      baseAnonymous.set(getTypeKey(variant.type), variant);
    }
  }

  for (const variant of head.variants.values()) {
    if (typeof variant.name === "string") {
      headNamed.set(variant.name, variant);
    } else {
      headAnonymous.set(getTypeKey(variant.type), variant);
    }
  }

  for (const [name, baseVariant] of baseNamed) {
    const headVariant = headNamed.get(name);
    const elementPath = variantElementPath(ctx.elementPath, name);

    if (!headVariant) {
      diffs.push(
        makeDiff(
          typeNarrowedKind(ctx),
          ctx,
          elementPath,
          baseVariant.type,
          undefined,
          `${componentLabel(ctx.component)} union at ${ctx.elementPath} removed variant '${name}'.`,
        ),
      );
      continue;
    }

    diffs.push(...compareTypes(baseVariant.type, headVariant.type, { ...ctx, elementPath }));
  }

  for (const [name, headVariant] of headNamed) {
    if (baseNamed.has(name)) {
      continue;
    }

    diffs.push(
      makeDiff(
        typeWidenedKind(ctx),
        ctx,
        variantElementPath(ctx.elementPath, name),
        undefined,
        headVariant.type,
        `${componentLabel(ctx.component)} union at ${ctx.elementPath} added variant '${name}'.`,
      ),
    );
  }

  for (const [key, baseVariant] of baseAnonymous) {
    const headVariant = headAnonymous.get(key);
    const elementPath = variantElementPath(ctx.elementPath, describeType(baseVariant.type));

    if (!headVariant) {
      diffs.push(
        makeDiff(
          typeNarrowedKind(ctx),
          ctx,
          elementPath,
          baseVariant.type,
          undefined,
          `${componentLabel(ctx.component)} union at ${ctx.elementPath} removed variant ${describeType(baseVariant.type)}.`,
        ),
      );
      continue;
    }

    diffs.push(...compareTypes(baseVariant.type, headVariant.type, { ...ctx, elementPath }));
  }

  for (const [key, headVariant] of headAnonymous) {
    if (baseAnonymous.has(key)) {
      continue;
    }

    diffs.push(
      makeDiff(
        typeWidenedKind(ctx),
        ctx,
        variantElementPath(ctx.elementPath, describeType(headVariant.type)),
        undefined,
        headVariant.type,
        `${componentLabel(ctx.component)} union at ${ctx.elementPath} added variant ${describeType(headVariant.type)}.`,
      ),
    );
  }

  return diffs;
}

function makeDiff(
  kind: DiffKind,
  ctx: DiffContext,
  elementPath: string,
  baseType?: Type,
  headType?: Type,
  message?: string,
): ApiDiff {
  const identity: OperationDiffIdentity = {
    operation: ctx.operation,
    component: ctx.component,
    statusCode: ctx.statusCode,
    element: elementPath,
  };

  return {
    kind,
    identity,
    baseSourceLocation: getTypeSourceLocation(baseType),
    headSourceLocation: getTypeSourceLocation(headType),
    baseType,
    headType,
    details: {
      elementPath,
      baseKind: baseType?.kind,
      headKind: headType?.kind,
    },
    message: message ?? `${kind} detected at ${elementPath}.`,
  };
}

function getTypeKey(type: Type): string {
  const namedKey = getNamedTypeKey(type);
  if (namedKey) {
    return namedKey;
  }

  const existing = anonymousTypeIds.get(type as object);
  if (existing !== undefined) {
    return `${type.entityKind}:${type.kind}:anonymous:${existing}`;
  }

  nextAnonymousTypeId += 1;
  anonymousTypeIds.set(type as object, nextAnonymousTypeId);
  return `${type.entityKind}:${type.kind}:anonymous:${nextAnonymousTypeId}`;
}

function getNamedTypeKey(type: Type): string | undefined {
  switch (type.kind) {
    case "Model":
    case "Scalar":
    case "Enum":
      return qualifiedName(type.namespace, type.name) ?? `${type.kind}:${type.name}`;
    case "ModelProperty":
      return type.model
        ? `${getTypeKey(type.model)}.properties.${type.name}`
        : `${type.kind}:${type.name}`;
    case "Union":
      return type.name ? qualifiedName(type.namespace, type.name) ?? `${type.kind}:${type.name}` : undefined;
    case "UnionVariant":
      return typeof type.name === "string"
        ? `${getTypeKey(type.union)}.variants.${type.name}`
        : undefined;
    case "String":
      return `${type.kind}:${JSON.stringify(type.value)}`;
    case "Number":
      return `${type.kind}:${type.valueAsString}`;
    case "Boolean":
      return `${type.kind}:${String(type.value)}`;
    default:
      return undefined;
  }
}

function propertyAddedKind(component: DiffComponent): DiffKind {
  return component === "request" ? "RequestPropertyAdded" : "ResponsePropertyAdded";
}

function propertyRemovedKind(component: DiffComponent): DiffKind {
  return component === "request" ? "RequestPropertyRemoved" : "ResponsePropertyRemoved";
}

function propertyMadeRequiredKind(component: DiffComponent): DiffKind {
  return component === "request" ? "RequestPropertyMadeRequired" : "ResponsePropertyMadeRequired";
}

function propertyMadeOptionalKind(component: DiffComponent): DiffKind {
  return component === "request" ? "RequestPropertyMadeOptional" : "ResponsePropertyMadeOptional";
}

function typeChangedKind(ctx: DiffContext): DiffKind {
  if (isPropertyElement(ctx.elementPath)) {
    return ctx.component === "request" ? "RequestPropertyTypeChanged" : "ResponsePropertyTypeChanged";
  }

  return ctx.component === "request" ? "RequestTypeChanged" : "ResponseTypeChanged";
}

function typeNarrowedKind(ctx: DiffContext): DiffKind {
  if (isPropertyElement(ctx.elementPath)) {
    return ctx.component === "request" ? "RequestPropertyTypeNarrowed" : "ResponsePropertyTypeNarrowed";
  }

  return ctx.component === "request" ? "RequestTypeNarrowed" : "ResponseTypeNarrowed";
}

function typeWidenedKind(ctx: DiffContext): DiffKind {
  if (isPropertyElement(ctx.elementPath)) {
    return ctx.component === "request" ? "RequestPropertyTypeWidened" : "ResponsePropertyTypeWidened";
  }

  return ctx.component === "request" ? "RequestTypeWidened" : "ResponseTypeWidened";
}

function typeKindChangedKind(ctx: DiffContext): DiffKind {
  if (isPropertyElement(ctx.elementPath)) {
    return ctx.component === "request" ? "RequestPropertyTypeChanged" : "ResponsePropertyTypeChanged";
  }

  return ctx.component === "request" ? "RequestTypeKindChanged" : "ResponseTypeKindChanged";
}

function getScalarName(scalar: Scalar): string {
  return qualifiedName(scalar.namespace, scalar.name) ?? scalar.name;
}

function getTypeSourceLocation(type?: Type): SourceLocation | undefined {
  return type ? getSourceLocation(type, { locateId: true }) : undefined;
}

function propertyElementPath(currentPath: string, propertyName: string): string {
  if (
    currentPath === "properties" ||
    currentPath.endsWith(".properties") ||
    currentPath.startsWith("properties.")
  ) {
    return joinElementPath(currentPath, propertyName);
  }

  return joinElementPath(currentPath, `properties.${propertyName}`);
}

function variantElementPath(currentPath: string, variantName: string): string {
  return joinElementPath(currentPath, `variants.${variantName}`);
}

function joinElementPath(base: string, segment: string): string {
  if (!base) {
    return segment;
  }

  return `${base}.${segment}`;
}

function qualifiedName(
  namespace: { name: string; namespace?: { name: string; namespace?: unknown } } | undefined,
  name: string,
): string | undefined {
  if (!name) {
    return undefined;
  }

  const namespaceParts: string[] = [];
  let current = namespace;

  while (current) {
    if (current.name) {
      namespaceParts.unshift(current.name);
    }
    current = current.namespace as { name: string; namespace?: { name: string; namespace?: unknown } } | undefined;
  }

  namespaceParts.push(name);
  return namespaceParts.length > 0 ? namespaceParts.join(".") : undefined;
}

function isPropertyElement(elementPath: string): boolean {
  return (
    elementPath === "properties" ||
    elementPath.includes(".properties.") ||
    elementPath.endsWith(".properties") ||
    elementPath.startsWith("properties.")
  );
}

function componentLabel(component: DiffComponent): "Request" | "Response" {
  return component === "request" ? "Request" : "Response";
}

function describeType(type: Type): string {
  switch (type.kind) {
    case "Model":
    case "Scalar":
    case "Enum":
      return qualifiedName(type.namespace, type.name) ?? type.name;
    case "Union":
      return type.name ? qualifiedName(type.namespace, type.name) ?? type.name : "anonymous-union";
    case "String":
      return JSON.stringify(type.value);
    case "Number":
      return type.valueAsString;
    case "Boolean":
      return String(type.value);
    default:
      return type.kind.toLowerCase();
  }
}
