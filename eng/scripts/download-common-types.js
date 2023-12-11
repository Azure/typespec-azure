// @ts-check
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { get } from "https";
import { dirname } from "path";

const version = process.argv[2];
const remoteSwaggerPath = `https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/common-types/resource-management/${version}/types.json`;
const localSwaggerPath = `packages/samples/specs/resource-manager/common-types/${version}/types.json`;
console.log("Downloading common types:", {
  version,
  remoteSwaggerPath,
  localSwaggerPath,
});

const dir = dirname(localSwaggerPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const file = createWriteStream(localSwaggerPath);
get(remoteSwaggerPath, (res) => {
  if (res.statusCode === 200) {
    res.pipe(file);
  } else {
    throw new Error(res.statusMessage ?? "");
  }
});
