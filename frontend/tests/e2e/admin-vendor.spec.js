import { expect, test } from "@playwright/test";
import { loginAsRole } from "./helpers/mockApi";

test.describe("Admin flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("loads canteen admin dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByText("Canteen Operations Dashboard")).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage Menu" }).first()).toBeVisible();
  });

  test("opens admin orders and verifies order code", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

    await page.getByPlaceholder("Enter 5-digit order code").fill("12345");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Order Found")).toBeVisible();
    await expect(page.getByText("Student:").first()).toBeVisible();
  });

  test("loads canteen menu management page", async ({ page }) => {
    await page.goto("/admin/menu");
    await expect(page.getByText("Manage Menu")).toBeVisible();
    await expect(page.getByText("Chicken Rice")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Menu Item" })).toBeVisible();
  });
});

test.describe("Vendor flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "vendor");
  });

  test("loads vendor dashboard", async ({ page }) => {
    await page.goto("/vendor/dashboard");
    await expect(page.getByText("Canteen Owner Dashboard")).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage Menu" }).first()).toBeVisible();
  });

  test("creates item from vendor menu page", async ({ page }) => {
    await page.goto("/vendor/menu");
    await expect(page.getByRole("heading", { name: /Manage Menu/ })).toBeVisible();

    await page.getByPlaceholder("e.g. Chicken Rice").fill("Veg Noodles");
    await page.getByPlaceholder("350").fill("300");
    await page.getByPlaceholder("e.g. Main Canteen").fill("Main Canteen");
    await page.getByRole("combobox").nth(0).selectOption({ index: 1 });
    await page.getByPlaceholder("Ingredients, size, special notes...").fill("Fresh vegetable noodles");
    await page.getByRole("button", { name: "Add Menu Item" }).click();

    await expect(page.getByText("Veg Noodles")).toBeVisible();
  });

  test("loads vendor orders and code verification panel", async ({ page }) => {
    await page.goto("/vendor/orders");
    await expect(page.getByRole("heading", { name: "Manage Incoming Orders" })).toBeVisible();

    await page.getByPlaceholder("Enter 5-digit order code").fill("12345");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Order Found")).toBeVisible();
  });

  test("loads revenue summary table", async ({ page }) => {
    await page.goto("/vendor/revenue");
    await expect(page.getByRole("heading", { name: "Revenue Summary" })).toBeVisible();
    await expect(page.getByText("15200")).toBeVisible();
  });
});
