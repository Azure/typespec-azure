import { Interface, createRule } from "@typespec/compiler";

import { isArmOperationsListInterface } from "../private.decorators.js";
import { isInternalTypeSpec } from "./utils.js";

export const interfacesRule = createRule({
  name: "arm-resource-interface-requires-decorator",
  severity: "warning",
  description: "Each resource interface must have an @armResourceOperations decorator.",
  messages: {
    default: "Each resource interface must have an @armResourceOperations decorator.",
  },
  create(context) {
    return {
      interface: (interfaceContext: Interface) => {
        if (
          !isInternalTypeSpec(context.program, interfaceContext) &&
          !isArmOperationsListInterface(context.program, interfaceContext)
        ) {
          if (
            !interfaceContext.decorators.some(
              (d) =>
                d.decorator.name === "$armResourceOperations" ||
                d.decorator.name === "$armResourceRoute",
            )
          ) {
            context.reportDiagnostic({
              target: interfaceContext,
            });
          }
        }
      },
    };
  },
});
