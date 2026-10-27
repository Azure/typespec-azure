This diagnostic is issued when `@clientLroResult` cannot select an unambiguous,
supported value from the operation's LRO protocol.

## Impact

- **Area:** LRO SDK result selection. The invalid customization blocks generation.
- **Not affected:** The operation's polling and required completion requests are not rewritten.

## How to Fix

Use the operation's actual monitor, verified original-URI resource response, or
declared final response model, or a readable property of that body. Use `::type`
for nested property references. Do not pass an unrelated replacement model.

An ordinary operation or a legacy LRO marker without native protocol-source
evidence is not a valid target. Resolve ambiguous sources or paths explicitly.
New optional/nullable projections are not supported without a missing-value
contract. Paging selections must preserve the items and continuation mapping.
