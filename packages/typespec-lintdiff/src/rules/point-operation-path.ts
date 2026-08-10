const providerAndNamespace = "/providers/[^/]+";
const resourceTypeAndResourceName = "(?:/\\w+/default|/\\w+/{[^/]+})";
const queryParameter = "(?:\\?\\w+)";
const pointOperationPathRegExp = new RegExp(
  `${providerAndNamespace}${resourceTypeAndResourceName}+${queryParameter}?$`,
  "i",
);

export function isPointOperationPath(path: string): boolean {
  const index = path.lastIndexOf("/providers/");
  return index !== -1 && pointOperationPathRegExp.test(path.slice(index));
}
