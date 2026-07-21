This diagnostic is issued when a parent client uses `autoMergeService` and a nested client also specifies its own service configuration.

To fix this issue, leave the nested client's `service` option unset so it inherits from the parent, or remove the parent `autoMergeService` setup.
