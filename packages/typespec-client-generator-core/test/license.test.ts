import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { licenseMap } from "../src/license.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: license", () => {
  let runner: SdkTestRunner;

  it("none license", async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
    });

    await runner.compile(`
      @service
      namespace MyService {
      }
    `);

    const licenseInfo = runner.context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo, undefined);
  });

  it("mit license without company name", async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
      "license-name": "MIT License",
    });

    await runner.compile(`
      @service
      namespace MyService {
      }
    `);

    const licenseInfo = runner.context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, licenseMap["MIT License"].name);
    strictEqual(licenseInfo?.link, licenseMap["MIT License"].link);
    strictEqual(licenseInfo?.company, "");
    strictEqual(
      licenseInfo?.description,
      licenseMap["MIT License"].description.replace("<company>", ""),
    );
  });

  it("mit license with company name", async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
      "license-name": "MIT License",
      "license-company": "Microsoft Cooperation",
    });

    await runner.compile(`
      @service
      namespace MyService {
      }
    `);

    const licenseInfo = runner.context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, licenseMap["MIT License"].name);
    strictEqual(licenseInfo?.link, licenseMap["MIT License"].link);
    strictEqual(licenseInfo?.company, "Microsoft Cooperation");
    strictEqual(
      licenseInfo?.description,
      licenseMap["MIT License"].description.replace("<company>", "Microsoft Cooperation"),
    );
    strictEqual(licenseInfo?.description.startsWith("Copyright © Microsoft Cooperation"), true);
  });

  it("customize license", async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
      "license-name": "Test License",
      "license-link": "https://example.com",
      "license-company": "Microsoft Cooperation",
      "license-description": "Copyright Microsoft Cooperation",
    });

    await runner.compile(`
      @service
      namespace MyService {
      }
    `);

    const licenseInfo = runner.context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, "Test License");
    strictEqual(licenseInfo?.link, "https://example.com");
    strictEqual(licenseInfo?.company, "Microsoft Cooperation");
    strictEqual(licenseInfo?.description, "Copyright Microsoft Cooperation");
  });
});
