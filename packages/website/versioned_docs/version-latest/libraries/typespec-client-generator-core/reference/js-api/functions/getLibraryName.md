---
jsApi: true
title: "[F] getLibraryName"

---
```ts
getLibraryName(context, type): string
```

Get the library name of a property / parameter / operation / model / enum. Takes projections into account

Returns name in the following order of priority
1. language emitter name, i.e. @clientName("csharpSpecificName", "csharp") => "csharpSpecificName"
2. client name, i.e. @clientName(""clientName") => "clientName"
3. deprecated projected name
4. friendly name, i.e. @friendlyName("friendlyName") => "friendlyName"
5. name in typespec

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> |  |
| `type` | `Object` |  |
| `type.instantiationParameters`? | `Type`[] | - |
| `type.isFinished` | `boolean` | Reflect if a type has been finished(Decorators have been called).<br />There is multiple reasons a type might not be finished:<br />- a template declaration will not<br />- a template instance that argument that are still template parameters<br />- a template instance that is only partially instantiated(like a templated operation inside a templated interface) |
| `type.kind` |    \| `"String"`   \| `"Number"`   \| `"Boolean"`   \| `"Model"`   \| `"ModelProperty"`   \| `"Scalar"`   \| `"Interface"`   \| `"Enum"`   \| `"EnumMember"`   \| `"TemplateParameter"`   \| `"Namespace"`   \| `"Operation"`   \| `"StringTemplate"`   \| `"StringTemplateSpan"`   \| `"Tuple"`   \| `"Union"`   \| `"UnionVariant"`   \| `"Intrinsic"`   \| `"Function"`   \| `"Decorator"`   \| `"FunctionParameter"`   \| `"Object"`   \| `"Projection"` | - |
| `type.name`? | `string` | - |
| `type.node`? |    \| `TypeSpecScriptNode`   \| `JsSourceFileNode`   \| `JsNamespaceDeclarationNode`   \| `TemplateArgumentNode`   \| `TemplateParameterDeclarationNode`   \| `ProjectionParameterDeclarationNode`   \| `ProjectionLambdaParameterDeclarationNode`   \| `ModelPropertyNode`   \| `UnionVariantNode`   \| `OperationStatementNode`   \| `OperationSignatureDeclarationNode`   \| `OperationSignatureReferenceNode`   \| `EnumMemberNode`   \| `EnumSpreadMemberNode`   \| `ModelSpreadPropertyNode`   \| `DecoratorExpressionNode`   \| `DirectiveExpressionNode`   \| `ImportStatementNode`   \| `ModelStatementNode`   \| `ScalarStatementNode`   \| `NamespaceStatementNode`   \| `InterfaceStatementNode`   \| `UnionStatementNode`   \| `UsingStatementNode`   \| `EnumStatementNode`   \| `AliasStatementNode`   \| `DecoratorDeclarationStatementNode`   \| `FunctionDeclarationStatementNode`   \| `AugmentDecoratorStatementNode`   \| `EmptyStatementNode`   \| `InvalidStatementNode`   \| `ProjectionStatementNode`   \| `ArrayExpressionNode`   \| `MemberExpressionNode`   \| `ModelExpressionNode`   \| `TupleExpressionNode`   \| `UnionExpressionNode`   \| `IntersectionExpressionNode`   \| `TypeReferenceNode`   \| `ValueOfExpressionNode`   \| `StringLiteralNode`   \| `NumericLiteralNode`   \| `BooleanLiteralNode`   \| `StringTemplateExpressionNode`   \| `VoidKeywordNode`   \| `NeverKeywordNode`   \| `AnyKeywordNode`   \| `FunctionParameterNode`   \| `StringTemplateSpanNode`   \| `StringTemplateHeadNode`   \| `StringTemplateMiddleNode`   \| `StringTemplateTailNode`   \| `ExternKeywordNode`   \| `DocNode`   \| `DocTextNode`   \| `DocReturnsTagNode`   \| `DocErrorsTagNode`   \| `DocParamTagNode`   \| `DocTemplateTagNode`   \| `DocUnknownTagNode`   \| `ProjectionExpressionStatementNode`   \| `ProjectionLogicalExpressionNode`   \| `ProjectionRelationalExpressionNode`   \| `ProjectionEqualityExpressionNode`   \| `ProjectionUnaryExpressionNode`   \| `ProjectionArithmeticExpressionNode`   \| `ProjectionCallExpressionNode`   \| `ProjectionMemberExpressionNode`   \| `ProjectionDecoratorReferenceExpressionNode`   \| `ProjectionTupleExpressionNode`   \| `ProjectionModelExpressionNode`   \| `ProjectionIfExpressionNode`   \| `ProjectionBlockExpressionNode`   \| `ProjectionLambdaExpressionNode`   \| `IdentifierNode`   \| `ReturnExpressionNode`   \| `ProjectionModelSelectorNode`   \| `ProjectionModelPropertySelectorNode`   \| `ProjectionInterfaceSelectorNode`   \| `ProjectionOperationSelectorNode`   \| `ProjectionEnumSelectorNode`   \| `ProjectionEnumMemberSelectorNode`   \| `ProjectionUnionSelectorNode`   \| `ProjectionUnionVariantSelectorNode`   \| `ProjectionModelPropertyNode`   \| `ProjectionModelSpreadPropertyNode`   \| `ProjectionNode` | - |
| `type.projectionBase`? | `Type` | - |
| `type.projectionSource`? | `Type` | - |
| `type.projector`? | `Projector` | - |
| `type.projections` | - |
| `type.projectionsByName` | - |

## Returns

`string`

the library name for a typespec type
