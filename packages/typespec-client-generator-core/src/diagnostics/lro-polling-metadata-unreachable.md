This diagnostic is issued when `@lroPollingMetadata` selects a property that is not a direct or
inherited property of the resolved status-monitor response model. Nested property paths are not
supported.

## How to fix

Select a direct or inherited status-monitor property. To expose a nested value, first model a
direct property in the monitor contract.
