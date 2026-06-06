import {
  FunctionContext,
  FunctionValue,
  getDiscriminator,
  getLifecycleVisibilityEnum,
  isVisible,
  Model,
  ModelProperty,
  Program,
  VisibilityFilter,
} from "@typespec/compiler";
import {
  unsafe_mutateSubgraph as mutateSubgraph,
  unsafe_Mutator as Mutator,
  unsafe_MutatorFlow as MutatorFlow,
} from "@typespec/compiler/experimental";
import { $ } from "@typespec/compiler/typekit";
import type {
  ApplySimplifiedMergePatchFunctionImplementation,
  MapRenamerFunctionImplementation,
  TemplateRenamerFunctionImplementation,
} from "../generated-defs/Azure.Core.js";

type Renamer = FunctionValue<[name: string], string>;
type MergePatchSubject = Model | ModelProperty;

type MutateSubgraphResult = ReturnType<typeof mutateSubgraph>;

const MUTATOR_CACHE = Symbol.for("Azure.Core.SimplifiedMergePatchMutatorCache");
const MUTATOR_RESULT_CACHE = Symbol.for("Azure.Core.SimplifiedMergePatchMutatorResultCache");

interface SimplifiedMergePatchMutatorCache {
  [MUTATOR_CACHE]?: WeakMap<Renamer, WeakMap<Model, Mutator>>;
}

interface SimplifiedMergePatchMutatorResultCache {
  [MUTATOR_RESULT_CACHE]?: WeakMap<object, MutateSubgraphResult>;
}

export const applySimplifiedMergePatch: ApplySimplifiedMergePatchFunctionImplementation = (
  context,
  input,
  rename,
) => {
  if (!isRenamer(rename)) {
    throw new Error("Expected rename to be a function value.");
  }
  const mutatorCache = ((context.program as SimplifiedMergePatchMutatorCache)[MUTATOR_CACHE] ??=
    new WeakMap());

  let byInput = mutatorCache.get(rename);
  if (!byInput) {
    byInput = new WeakMap();
    mutatorCache.set(rename, byInput);
  }

  let mutator = byInput.get(input);
  if (!mutator) {
    mutator = createSimplifiedMergePatchMutator(context, input, rename);
    byInput.set(input, mutator);
  }

  const { type } = cachedMutateSubgraph(context.program, mutator, input);
  if (type.kind !== "Model") {
    throw new Error("Expected simplified merge patch transform to return a model.");
  }

  return type;
};

export const mapRenamer: MapRenamerFunctionImplementation = (context, mapping) => {
  return createRenamer(context.program, (name) => mapping[name] ?? name);
};

export const templateRenamer: TemplateRenamerFunctionImplementation = (context, template) => {
  return createRenamer(context.program, (name) => template.replaceAll("{name}", name));
};

function createRenamer(program: Program, rename: (name: string) => string): Renamer {
  const stringType = program.checker.getStdType("string");
  const stringValueConstraint = {
    entityKind: "MixedParameterConstraint",
    valueType: stringType,
  } as const;
  const parameter = program.checker.createAndFinishType({
    kind: "FunctionParameter",
    mixed: true,
    name: "name",
    optional: false,
    rest: false,
    type: stringValueConstraint,
  }) as any;
  const functionType = program.checker.createAndFinishType({
    kind: "FunctionType",
    parameters: [parameter],
    returnType: stringValueConstraint,
  }) as any;

  return {
    entityKind: "Value",
    valueKind: "Function",
    type: functionType,
    parameters: [parameter],
    returnType: stringValueConstraint,
    implementation: (_context, name) => rename(name),
  };
}

function createSimplifiedMergePatchMutator(
  context: FunctionContext,
  input: Model,
  rename: Renamer,
): Mutator {
  const lifecycle = getLifecycleVisibilityEnum(context.program);
  const updateFilter: VisibilityFilter = {
    any: new Set([lifecycle.members.get("Update")!]),
  };

  const propertyMutator: Mutator = {
    name: "SimplifiedMergePatchProperty",
    ModelProperty: {
      filter: () => MutatorFlow.DoNotRecur,
      replace: (property, clone, program) => {
        let modified = false;
        const discriminator = isDiscriminatorProperty(program, property);
        const optional = discriminator ? false : true;

        if (property.optional !== optional) {
          clone.optional = optional;
          modified = true;
        }

        if (property.defaultValue !== undefined) {
          clone.defaultValue = undefined;
          modified = true;
        }

        if (property.type.kind === "Model" && !$(program).array.is(property.type)) {
          const mutated = cachedMutateSubgraph(program, self, property.type);
          if (mutated.type !== property.type) {
            clone.type = mutated.type;
            modified = true;
          }
        }

        return modified ? clone : property;
      },
    },
  };

  const self: Mutator = {
    name: "SimplifiedMergePatch",
    Model: {
      filter: () => MutatorFlow.DoNotRecur,
      replace: (model, clone, program, realm) => {
        if ($(program).array.is(model)) {
          return model;
        }

        let modified = model !== input;

        if ($(program).record.is(model) && model.indexer && model.indexer.value.kind === "Model") {
          const mutated = cachedMutateSubgraph(program, self, model.indexer.value);
          if (mutated.type !== model.indexer.value) {
            clone.indexer = { ...model.indexer, value: mutated.type };
            modified = true;
          }
        }

        for (const [name, property] of model.properties) {
          if (!isVisible(program, property, updateFilter)) {
            const clonedProperty = clone.properties.get(name);
            if (clonedProperty) {
              clone.properties.delete(name);
              realm.remove(clonedProperty);
            }
            modified = true;
            continue;
          }

          const mutated = cachedMutateSubgraph(program, propertyMutator, property);
          const nextProperty = mutated.type as ModelProperty;
          if (nextProperty !== property) {
            nextProperty.model = clone;
            clone.properties.set(name, nextProperty);
            modified = true;
          }
        }

        if (!modified) {
          return model;
        }

        if (model !== input) {
          renameModel(context, rename, clone);
        }

        return clone;
      },
    },
  };

  return self;
}

function cachedMutateSubgraph(
  program: Program,
  mutator: Mutator,
  source: MergePatchSubject,
): MutateSubgraphResult {
  const cache = ((mutator as SimplifiedMergePatchMutatorResultCache)[MUTATOR_RESULT_CACHE] ??=
    new WeakMap());
  const cached = cache.get(source);
  if (cached) {
    return cached;
  }

  const mutated = mutateSubgraph(program, [mutator], source);
  cache.set(source, mutated);
  return mutated;
}

function isDiscriminatorProperty(program: Program, property: ModelProperty): boolean {
  if (!property.model) {
    return false;
  }

  return getDiscriminator(program, property.model)?.propertyName === property.name;
}

function isRenamer(value: unknown): value is Renamer {
  return (
    typeof value === "object" &&
    value !== null &&
    "entityKind" in value &&
    value.entityKind === "Value" &&
    "valueKind" in value &&
    value.valueKind === "Function"
  );
}

function renameModel(context: FunctionContext, rename: Renamer, model: Model) {
  if (!model.name || model.name === "Record") {
    return;
  }

  model.name = context.callFunction(rename.implementation, model.name);
}
