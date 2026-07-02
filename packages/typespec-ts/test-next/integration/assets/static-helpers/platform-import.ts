import { RestError } from "@azure/core-rest-pipeline";

export function usesPlatformImport() {
  return RestError.name;
}
