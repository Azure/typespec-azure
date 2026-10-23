# Structural LRO property selected as status metadata

`@lroStatusMetadata` is only for auxiliary values from the status-monitor envelope. Status,
logical result, error, and polling or final-location properties already have dedicated LRO
semantics.

## How to fix

Remove `@lroStatusMetadata` from the structural LRO property. Apply it only to an auxiliary
status-monitor property such as usage or progress information.
