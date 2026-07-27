import {
  isArrayModelType,
  walkPropertiesInherited,
  type Enum,
  type Model,
  type Scalar,
  type Tuple,
  type Type,
  type Union,
} from "@typespec/compiler";
import { type HttpOperation, type HttpOperationResponse } from "@typespec/http";

export interface PutRequestResponseComparison {
  matches: boolean;
  statusCode: string;
}

export function comparePutRequestAndResponse(
  httpOperation: HttpOperation,
): PutRequestResponseComparison | undefined {
  const requestBody = httpOperation.parameters.body;
  if (requestBody === undefined) {
    return undefined;
  }

  const response = getPrimaryResponse(httpOperation.responses);
  if (response === undefined) {
    return undefined;
  }

  const responseBody = response.responses.find((content) => content.body !== undefined)?.body;
  if (responseBody === undefined) {
    return undefined;
  }

  return {
    matches: areEquivalentTypes(requestBody.type, responseBody.type, new Map()),
    statusCode: String(response.statusCodes),
  };
}

function getPrimaryResponse(
  responses: HttpOperationResponse[],
): HttpOperationResponse | undefined {
  return (
    responses.find((response) => response.statusCodes === 200) ??
    responses.find((response) => response.statusCodes === 201)
  );
}

function areEquivalentTypes(
  left: Type,
  right: Type,
  seen: Map<Type, Set<Type>>,
): boolean {
  if (left === right) {
    return true;
  }

  const seenRight = seen.get(left);
  if (seenRight?.has(right) === true) {
    return true;
  }

  if (left.kind !== right.kind) {
    return false;
  }

  markSeen(seen, left, right);

  switch (left.kind) {
    case "Model":
      return areEquivalentModels(left, right as Model, seen);
    case "Scalar":
      return areEquivalentScalars(left, right as Scalar);
    case "Enum":
      return areEquivalentEnums(left, right as Enum);
    case "Tuple":
      return areEquivalentTuples(left, right as Tuple, seen);
    case "Union":
      return areEquivalentUnions(left, right as Union, seen);
    default:
      return areEquivalentNamedTypes(left, right);
  }
}

function markSeen(seen: Map<Type, Set<Type>>, left: Type, right: Type): void {
  const pairs = seen.get(left);
  if (pairs === undefined) {
    seen.set(left, new Set([right]));
  } else {
    pairs.add(right);
  }
}

function areEquivalentModels(
  left: Model,
  right: Model,
  seen: Map<Type, Set<Type>>,
): boolean {
  const leftIsArray = isArrayModelType(left);
  const rightIsArray = isArrayModelType(right);
  if (leftIsArray || rightIsArray) {
    return (
      leftIsArray &&
      rightIsArray &&
      areEquivalentTypes(left.indexer.value, right.indexer.value, seen)
    );
  }

  const leftIndexer = left.indexer;
  const rightIndexer = right.indexer;
  if (leftIndexer !== undefined || rightIndexer !== undefined) {
    return (
      leftIndexer !== undefined &&
      rightIndexer !== undefined &&
      areEquivalentScalars(leftIndexer.key, rightIndexer.key) &&
      areEquivalentTypes(leftIndexer.value, rightIndexer.value, seen)
    );
  }

  const leftProperties = new Map(
    [...walkPropertiesInherited(left)].map((property) => [property.name, property]),
  );
  const rightProperties = new Map(
    [...walkPropertiesInherited(right)].map((property) => [property.name, property]),
  );
  if (leftProperties.size !== rightProperties.size) {
    return false;
  }

  for (const [name, leftProperty] of leftProperties) {
    const rightProperty = rightProperties.get(name);
    if (rightProperty === undefined) {
      return false;
    }

    if (leftProperty.optional !== rightProperty.optional) {
      return false;
    }

    if (!areEquivalentTypes(leftProperty.type, rightProperty.type, seen)) {
      return false;
    }
  }

  return true;
}

function areEquivalentScalars(left: Scalar, right: Scalar): boolean {
  return left.name === right.name;
}

function areEquivalentEnums(left: Enum, right: Enum): boolean {
  if (left.members.size !== right.members.size) {
    return false;
  }

  for (const [name, leftMember] of left.members) {
    const rightMember = right.members.get(name);
    if (rightMember === undefined || leftMember.value !== rightMember.value) {
      return false;
    }
  }

  return true;
}

function areEquivalentTuples(
  left: Tuple,
  right: Tuple,
  seen: Map<Type, Set<Type>>,
): boolean {
  return (
    left.values.length === right.values.length &&
    left.values.every((value, index) => areEquivalentTypes(value, right.values[index], seen))
  );
}

function areEquivalentUnions(
  left: Union,
  right: Union,
  seen: Map<Type, Set<Type>>,
): boolean {
  if (left.variants.size !== right.variants.size) {
    return false;
  }

  for (const [name, leftVariant] of left.variants) {
    const rightVariant = right.variants.get(name);
    if (rightVariant === undefined) {
      return false;
    }

    if (!areEquivalentTypes(leftVariant.type, rightVariant.type, seen)) {
      return false;
    }
  }

  return true;
}

function areEquivalentNamedTypes(left: Type, right: Type): boolean {
  const leftName = "name" in left ? left.name : undefined;
  const rightName = "name" in right ? right.name : undefined;
  return leftName !== undefined && leftName === rightName;
}
