This diagnostic is issued when `@clientLroResult` cannot select the established
completion response or a supported property path within it.

## Impact

- **Area:** LRO SDK result selection. The invalid customization blocks generation.
- **Not affected:** The operation's polling and required completion requests are not rewritten.

## How to Fix

Use the whole body returned by the existing completion strategy or a readable
property path within that body. Use `::type` to continue through a property's
model type, for example `Status.result::type.value`. Do not pass an unrelated
replacement model.

An ordinary operation or a legacy LRO marker without native protocol metadata is
not a valid target. Property paths must be rooted in the established completion
response; TCGC does not infer a missing route from a nested leaf-property alias.
New optional/nullable projections are not supported without a missing-value
contract. Paging selections must preserve the items and continuation mapping.
