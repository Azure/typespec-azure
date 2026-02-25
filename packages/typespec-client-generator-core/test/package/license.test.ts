import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { licenseMap } from "../../src/license.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

describe("typespec-client-generator-core: license", () => {
  it("none license", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
      }
    `);

    const context = await createSdkContextForTester(program);
    const licenseInfo = context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo, undefined);
  });

  it("mit license without company name", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
      }
    `);

    const context = await createSdkContextForTester(program, {
      license: { name: "MIT License" },
    });
    const licenseInfo = context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, licenseMap["MIT License"].name);
    strictEqual(licenseInfo?.company, "");
    strictEqual(licenseInfo?.link, licenseMap["MIT License"].link);
    strictEqual(licenseInfo?.header, licenseMap["MIT License"].header.replace("<company>", ""));
    strictEqual(
      licenseInfo?.description,
      licenseMap["MIT License"].description.replace("<company>", ""),
    );
  });

  it("mit license with company name", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
      }
    `);

    const context = await createSdkContextForTester(program, {
      license: { name: "MIT License", company: "Microsoft Cooperation" },
    });
    const licenseInfo = context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, licenseMap["MIT License"].name);
    strictEqual(licenseInfo?.company, "Microsoft Cooperation");
    strictEqual(licenseInfo?.link, licenseMap["MIT License"].link);
    strictEqual(
      licenseInfo?.header,
      licenseMap["MIT License"].header.replace("<company>", "Microsoft Cooperation"),
    );
    strictEqual(
      licenseInfo?.description,
      licenseMap["MIT License"].description.replace("<company>", "Microsoft Cooperation"),
    );
    strictEqual(licenseInfo?.description.startsWith("Copyright (c) Microsoft Cooperation"), true);
  });

  it("mit license with some customization", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
      }
    `);

    const context = await createSdkContextForTester(program, {
      license: {
        name: "MIT License",
        header: `Copyright (c) Microsoft Corporation. All rights reserved.\n
Licensed under the MIT License. See LICENSE in the project root for license information.`,
      },
    });
    const licenseInfo = context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, licenseMap["MIT License"].name);
    strictEqual(licenseInfo?.company, "");
    strictEqual(licenseInfo?.link, licenseMap["MIT License"].link);
    strictEqual(
      licenseInfo?.header,
      `Copyright (c) Microsoft Corporation. All rights reserved.\n
Licensed under the MIT License. See LICENSE in the project root for license information.`,
    );
    strictEqual(
      licenseInfo?.description,
      licenseMap["MIT License"].description.replace("<company>", ""),
    );
  });

  it("fully customize license", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
      }
    `);

    const context = await createSdkContextForTester(program, {
      license: {
        name: "Test License",
        company: "Microsoft Cooperation",
        link: "https://example.com",
        header: "Copyright Microsoft Cooperation",
        description: "Copyright Microsoft Cooperation",
      },
    });
    const licenseInfo = context.sdkPackage.licenseInfo;
    strictEqual(licenseInfo?.name, "Test License");
    strictEqual(licenseInfo?.company, "Microsoft Cooperation");
    strictEqual(licenseInfo?.link, "https://example.com");
    strictEqual(licenseInfo?.header, "Copyright Microsoft Cooperation");
    strictEqual(licenseInfo?.description, "Copyright Microsoft Cooperation");
  });
});
