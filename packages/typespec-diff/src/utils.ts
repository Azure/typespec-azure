import { getTypeName, Model, Namespace, Operation, Program, Type } from "@typespec/compiler";
import { getAllHttpServices, HttpOperation, HttpService } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DiffContext } from "./rules.js";

export const typespecDiffVersion: string = readTypeSpecDiffVersion();

function readTypeSpecDiffVersion() {
  const packageJsonPath = path.resolve(fileURLToPath(import.meta.url), "../../../package.json");
  const packageJsonText = readFileSync(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonText);
  return packageJson.version;
}

type DiffMapEvent<N, T> = {
  onAddition?: (name: N, newType: T, ctx: DiffContext) => void;
  onRemove?: (name: N, oldType: T, ctx: DiffContext) => void;
  onUpdate?: (oldType: T, newType: T, ctx: DiffContext) => void;
};

function getIntersections<T extends Map<any, Type>>(left: T, right: T) {
  return Array.from(left.keys()).filter((n) => right.has(n));
}

export function getArrayDiff<T>(
  left: T[],
  right: T[],
  equal: (a: T, b: T) => boolean = (a: T, b: T) => {
    return a === b;
  }
) {
  const common = left.filter((item) => right.some((rightItem) => equal(rightItem, item)));
  const addition = right.filter((item) => !common.some((commonItem) => equal(commonItem, item)));
  const remove = left.filter((item) => !common.some((commonItem) => equal(commonItem, item)));
  return [addition, remove, common];
}

export function diffMaps<T extends Type, N>(
  oldMaps: Map<N, T>,
  newMaps: Map<N, T>,
  ctx: DiffContext,
  events: DiffMapEvent<N, T>
): void {
  const intersections = getIntersections(oldMaps, newMaps);
  if (events.onUpdate) {
    intersections.forEach((name: N) => {
      const oldValue = oldMaps.get(name);
      const newValue = newMaps.get(name);
      events.onUpdate?.(oldValue!, newValue!, ctx);
    });
  }
  if (events.onAddition) {
    newMaps.forEach((newValue, name) => {
      if (!intersections.includes(name)) events.onAddition?.(name, newValue!, ctx);
    });
  }
  if (events.onRemove) {
    oldMaps.forEach((oldValue, name) => {
      if (!intersections.includes(name)) events.onRemove?.(name, oldValue!, ctx);
    });
  }
}

function getInternalTypeName(type: Type) {
  const namespaceFilter = (ns: Namespace) => {
    return !!ns;
  };
  return getTypeName(type, { namespaceFilter });
}

export function isSameType(oldType: Type, newType: Type): boolean {
  return (
    oldType.kind === newType.kind && getInternalTypeName(oldType) === getInternalTypeName(oldType)
  );
}

const allHttpOperationsMap = new Map<Program, HttpService[]>();

export function getHttpOperation(program: Program, op: Operation): HttpOperation | undefined {
  let httpServices = allHttpOperationsMap.get(program);
  if (!httpServices) {
    const [rawHttpServices] = getAllHttpServices(program);
    allHttpOperationsMap.set(program, rawHttpServices);
    httpServices = rawHttpServices;
  }
  return httpServices
    ?.find((httpOp) => httpOp.operations.find((ope) => ope.operation.name === op.name))
    ?.operations.find((ope) => ope.operation.name === op.name);
}

export function getParameterInType(program: Program, op: Operation, parameterName: string) {
  const httpOperation = getHttpOperation(program, op);
  const param = httpOperation?.parameters.parameters.find((p) => p.name === parameterName);
  return param?.type ?? "body";
}

export function isLongRunningOperation(program: Program, op: Operation) {
  return (
    !!op.decorators.find((d) => d.decorator.name === "$pollingOperation") ||
    !!getExtensions(program, op)?.get("x-ms-long-running-operation")
  );
}

export function isPagedCollection(model: Model) {
  return !!model.decorators.find((d) => d.decorator.name === "$pagedResult");
}

export function getArgsIndex(i: number) {
  const maps = ["first", "second", "third", "fourth", "fifth", "sixth"];
  if (i < 6) {
    return maps[i];
  }
  return `${i}th`;
}
