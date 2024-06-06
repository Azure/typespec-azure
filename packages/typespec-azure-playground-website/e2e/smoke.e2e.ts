import { expect, test } from "@playwright/test";

const host = `http://localhost:5174`;

test.describe("typespec-azure-playground-website UI tests", () => {
  test.skip(process.platform === "win32", "https://github.com/microsoft/typespec/issues/1223");

  test("compiled arm sample", async ({ page }) => {
    await page.goto(host);
    const samplesDropDown = page.locator("_react=SamplesDropdown").locator("select");
    await samplesDropDown.selectOption({ label: "Azure Resource Manager framework" });
    const outputContainer = page.locator("_react=FileOutput");
    await expect(outputContainer).toContainText(`"title": "ContosoProviderHubClient"`);
  });
});
