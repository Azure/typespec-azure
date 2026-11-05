import { execa } from "execa";
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
await execa(
  "mvn",
  ["-B", "--no-transfer-progress", "-f", fileURLToPath(new URL("wasm/pom.xml", root)), "package"],
  {
    stdio: "inherit",
  },
);
const destination = new URL("dist/browser/java-wasm/", root);
await mkdir(destination, { recursive: true });
await cp(new URL("wasm/target/wasm/generator.wasm", root), new URL("generator.wasm", destination));
await cp(new URL("wasm/target/wasm/runtime.js", root), new URL("runtime.js", destination));
await cp(new URL("dist/browser/worker.js", root), new URL("worker.js", destination));
