/**
 * Derive the `examples.yaml` operation key from a Swagger `operationId`.
 *
 * Swagger operation ids follow the `Interface_Method` convention (as emitted by
 * `@azure-tools/typespec-autorest`). The unified format uses the interface-relative key
 * `Interface.method` with a lower-cased first letter on the method (e.g. `CaCertificates_Get`
 * becomes `CaCertificates.get`). Operation ids without an underscore become a bare top-level key.
 */
export function deriveOperationKey(operationId: string): string {
  const underscore = operationId.indexOf("_");
  if (underscore < 0) {
    return operationId;
  }
  const iface = operationId.slice(0, underscore);
  const method = operationId.slice(underscore + 1);
  return `${iface}.${lowerFirst(method)}`;
}

/** The interface portion of a derived operation key (everything before the first `.`). */
export function interfaceOf(operationKey: string): string {
  const dot = operationKey.indexOf(".");
  return dot < 0 ? operationKey : operationKey.slice(0, dot);
}

function lowerFirst(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}
