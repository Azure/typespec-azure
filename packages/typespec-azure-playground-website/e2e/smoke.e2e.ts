import { expect, test } from "@playwright/test";

const host = `http://localhost:5174`;

test.describe("typespec-azure-playground-website UI tests", () => {
  test.skip(process.platform === "win32", "https://github.com/microsoft/typespec/issues/1223");

  test("compiled arm sample", async ({ page }) => {
    await page.goto(host);

    // Open samples drawer and pick the ARM sample.
    const samplesButton = page.locator('button[aria-label="Browse samples"]');
    await samplesButton.click();
    await page.locator("text=Azure Resource Manager framework").first().click();
    const outputContainer = page.locator("_react=FileOutput");
    await expect(outputContainer).toContainText(`"title": "ContosoProviderHubClient"`);
  });
});
