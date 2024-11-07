---
title: ARM Rules, TypeSpec Linting, and Suppression
---

ARM includes many rules on the structure of resources and the details of resource operations that ensure a consistent user experience when managing services inside Azure. TypeSpec encodes many fo these rules into linting checks that occur on each compilation. If you use an IDE and install the [TypeSpec IDE Tools](../../getstarted/azure-resource-manager/step00.md#installing-ide-tools), violations of rules will show up as yellow highlights in your tsp code. If you hover over these, you will get a message indicating the issue and how to fix it in your specification. If you use the typespec command-line, violations of rules will be printed as warnings, with a description and steps to correct the issue, and a pointer to the location in the specification where the violation occurred.

In the sections below, we will discuss these rules, how they work, and, in cases where a violation is a false positive, or has a reason approved by an ARM reviewer, can be suppressed.

## ARM RPC Rules

TypeSpec has a set of linting rules that execute whenever the specification is compiled, and in the IDE as you type. Violations are highlighted inline in the spec, or emitted during compilation.

For more information, see [ARM RPC rules](https://eng.ms/docs/products/arm/api_contracts/guidelines/rpc)

## Detecting and Suppressing Rule Violations at Design Time

Violations of ARM RPC rules will show up at design time as a yellow highlight over the violating type in TypeSpec, and at compile time as an emitted warning with a specific reference in the specification code (line number, position, pointer).

Here is an example of a linter warning:

```bash
Diagnostics were reported during compilation:

C:/typespec-samples/resource-manager/zerotrust/main.tsp:38:3 - warning @azure-tools/typespec-azure-resource-manager/arm-resource-operation-missing-decorator: Resource POST operation must be decorated with @armResourceAction.
> 38 |   @doc("Gets the Zero Trust URL for this resource")
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 39 |   @post
     | ^^^^^^^
> 40 |   getZeroTrustUrl(...ResourceInstanceParameters<ZeroTrustResource>): ZeroTrustUrl | ErrorResponse;
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Found 1 warning.

```

To suppress the warning, you would use the `#suppress` directive on the type that violates the rule. The directive takes the fully-qualified name of the rule you are suppressing, and a reason for the suppression.

```typespec
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-missing-decorator" "This is a sample suppression."
  @doc("Gets the MAA URL for this resource")
  @post
  getZeroTrustUrl(...ResourceInstanceParameters<ZeroTrustResource>): ZeroTrustUrl | ErrorResponse;
```

Of course, in this case, the best resolution would be to follow the advice in the linting rule, and add the `@armResourceAction` decorator.

```typespec
  @armResourceAction(ZeroTrustResource)
  @doc("Gets the MAA URL for this resource")
  @post
  getZeroTrustUrl(...ResourceInstanceParameters<ZeroTrustResource>): ZeroTrustUrl | ErrorResponse;
```
