import {
  compile,
  isTemplateDeclarationOrInstance,
  listServices,
  Namespace,
  NodeHost,
  Program,
  ProjectionApplication,
  projectProgram,
  TemplatedType,
  Type,
} from "@typespec/compiler";
import { buildVersionProjections } from "@typespec/versioning";
import { resolve } from "path";
import { diffNamespace } from "./namespace-diff.js";
import { MessageReporter } from "./reporter.js";
import { applyRuleConfig, DiffContext, DiffMessage, reportMessage } from "./rules.js";
import { getArrayDiff } from "./utils.js";

type VersionedService = {
  versionProjections: {
    version: string | undefined;
    projections: ProjectionApplication[];
  }[];
  serviceNamespace: Namespace;
};

async function createProgram(specDir: string) {
  const host = { ...NodeHost };
  return await compile(host, resolve(specDir), {
    outputDir: ".",
    nostdlib: false,
    additionalImports: [],
    warningAsError: false,
    noEmit: false,
    miscOptions: {},
    emitters: {},
  });
}

export async function diffSpec(
  oldSpec: string,
  newSpec: string,
  messageReporter: MessageReporter,
  config?: string,
  oldVersion?: string,
  newVersion?: string
) {
  const oldProgram = await createProgram(oldSpec);
  const newProgram = await createProgram(newSpec);
  const ctx: DiffContext = {
    direction: "None",
    oldProgram,
    newProgram,
    visited: new Set(),
    caches: new Map(),
    versions: { oldVersion: "", newVersion: "" },
    messageReporter,
  };
  if (config) {
    await applyRuleConfig(config);
  }
  await diffProgram(oldProgram, newProgram, ctx, oldVersion, newVersion);
}

function getVersionedService(program: Program): VersionedService[] {
  const services = listServices(program);
  if (services.length === 0) {
    services.push({ type: program.getGlobalNamespaceType() });
  }
  return services.map((s) => {
    return {
      serviceNamespace: s.type,
      versionProjections: buildVersionProjections(program, s.type),
    };
  });
}

function diffVersions(
  oldVersionedService: VersionedService,
  newVersionedService: VersionedService,
  ctx: DiffContext
) {
  const [additions, removals, common] = getArrayDiff(
    oldVersionedService.versionProjections,
    newVersionedService.versionProjections,
    (a, b) => {
      return a.version === b.version;
    }
  );
  common.forEach((version) => {
    const newVersion = newVersionedService.versionProjections.find(
      (cv) => cv.version === version.version
    )!;
    const oldVersion = oldVersionedService.versionProjections.find(
      (cv) => cv.version === version.version
    )!;
    diffNamespace(oldVersionedService.serviceNamespace, newVersionedService.serviceNamespace, {
      ...ctx,
      oldProgram: projectProgram(ctx.oldProgram, oldVersion.projections),
      newProgram: projectProgram(ctx.newProgram, newVersion.projections),
      versions: { newVersion: version.version!, oldVersion: version.version! },
      isVersionBumped: false,
    });
  });

  removals.forEach((v) => {
    reportMessage(
      {
        code: "RemovedVersion",
        params: {
          version: v.version!,
        },
      },
      ctx
    );
  });

  additions.forEach((newVersionProject) => {
    reportMessage(
      {
        code: "AddedVersion",
        params: {
          version: newVersionProject.version!,
        },
      },
      ctx
    );
    // for newType added api version, needs to diff it with last stable version.
    const lastStable = oldVersionedService.versionProjections
      .map((s) => s.version)
      .reverse()
      .find((v) => v && isStableVersion(v));
    if (lastStable) {
      const oldVersion = oldVersionedService.versionProjections.find(
        (cv) => cv.version === lastStable
      )!;
      const newVersion = newVersionedService.versionProjections.find(
        (cv) => cv.version === newVersionProject.version
      )!;

      diffNamespace(oldVersionedService.serviceNamespace, newVersionedService.serviceNamespace, {
        ...ctx,
        oldProgram: projectProgram(ctx.oldProgram, oldVersion.projections),
        newProgram: projectProgram(ctx.newProgram, newVersion.projections),
        versions: { newVersion: newVersion.version!, oldVersion: lastStable },
        isVersionBumped: true,
      });
    }
  });
}

export function diffProgram(
  oldSpec: Program,
  newSpec: Program,
  ctx: DiffContext,
  oldVersion?: string,
  newVersion?: string
) {
  if (oldSpec.hasError()) {
    // eslint-disable-next-line no-console
    console.log(oldSpec.diagnostics.filter((d) => d.severity === "error"));
    throw new Error(`old spec contains compilation errors.`);
  }
  if (newSpec.hasError()) {
    // eslint-disable-next-line no-console
    console.log(newSpec.diagnostics.filter((d) => d.severity === "error"));
    throw new Error(`new spec contains compilation errors.`);
  }
  function findVersion(services: VersionedService[], targetVersion: string) {
    let versionProjection: any;
    let serviceNamespace: Namespace | undefined;
    services.some((service) => {
      versionProjection = service.versionProjections.find((v: any) => v.version === targetVersion);
      if (versionProjection) {
        serviceNamespace = service.serviceNamespace;
      }
      return !!versionProjection;
    });
    return versionProjection && serviceNamespace
      ? { serviceNamespace, versionProjection }
      : undefined;
  }
  const [oldSpecVersions, newSpecVersions] = [
    getVersionedService(oldSpec),
    getVersionedService(newSpec),
  ];
  if (newVersion && !findVersion(newSpecVersions, newVersion)) {
    throw new Error(`The new version '${newVersion}' doesn't exist.`);
  }
  if (oldVersion && !findVersion(oldSpecVersions, oldVersion)) {
    throw new Error(`The old version '${oldVersion}' doesn't exist.`);
  }
  if (newVersion && oldVersion) {
    const oldNsProjection = findVersion(oldSpecVersions, oldVersion)!;
    const newNsProjection = findVersion(newSpecVersions, newVersion)!;
    return diffNamespace(oldNsProjection.serviceNamespace, newNsProjection.serviceNamespace, {
      ...ctx,
      oldProgram: projectProgram(oldSpec, oldNsProjection.versionProjection),
      newProgram: projectProgram(newSpec, newNsProjection.versionProjection),
      isVersionBumped: newVersion !== oldVersion,
      versions: { oldVersion, newVersion },
    });
  } else {
    return diffServices(getVersionedService(oldSpec), getVersionedService(newSpec), ctx);
  }
}

function isStableVersion(version: string) {
  return !version.toLowerCase().includes("preview");
}

function diffServices(
  oldVersionedService: VersionedService[],
  newVersionedService: VersionedService[],
  ctx: DiffContext
) {
  const [additions, removals, common] = getArrayDiff(
    oldVersionedService.map((s) => s.serviceNamespace.name),
    newVersionedService.map((s) => s.serviceNamespace.name)
  );
  common.forEach((service) => {
    const newService = newVersionedService.find((cv) => cv.serviceNamespace.name === service)!;
    const oldService = oldVersionedService.find((cv) => cv.serviceNamespace.name === service)!;
    diffVersions(oldService, newService, {
      ...ctx,
      isVersionBumped: false,
    });
  });

  removals.forEach((v) => {
    reportMessage(
      {
        code: "RemovedVersion",
        params: {
          version: v!,
        },
      },
      ctx
    );
  });

  additions.forEach((newVersion) => {
    reportMessage(
      {
        code: "AddedVersion",
        params: {
          version: newVersion!,
        },
      },
      ctx
    );
  });
}

export function createDiffFunction<T extends Type>(
  diffFunc: (oldType: T, newType: T, ctx: DiffContext) => void
) {
  return (oldType: T, newType: T, ctx: DiffContext): DiffMessage[] => {
    if (isTemplateDeclarationOrInstance(oldType as TemplatedType)) {
      return [];
    }
    const visited = ctx.visited.has(oldType);
    if (!visited) {
      ctx.visited.add(oldType);
      const cache = ctx.caches.get(oldType);
      if (cache && cache.get(newType)) {
        return cache.get(newType)!;
      }
      const messages: DiffMessage[] = [];
      diffFunc(oldType, newType, {
        ...ctx,
        messageReporter: {
          report: (msg: DiffMessage) => {
            messages.push(msg);
            ctx.messageReporter.report(msg);
          },
        },
      });
      ctx.caches.set(oldType, new Map([[newType, messages]]));
      ctx.visited.delete(oldType);
      return messages;
    } else {
      return [];
    }
  };
}
