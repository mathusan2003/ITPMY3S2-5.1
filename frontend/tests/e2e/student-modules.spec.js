import { expect, test } from "@playwright/test";
import { loginAsRole } from "./helpers/mockApi";

test.describe("Student module flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "student");
  });

  test("shows student dashboard and quick navigation", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page.getByText("Savor the Campus")).toBeVisible();
    await expect(page.getByRole("link", { name: "My Orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Cart" })).toBeVisible();
  });

  test("loads menu and adds item to cart", async ({ page }) => {
    await page.goto("/student/menu");
    await expect(page.getByText("Chicken Rice")).toBeVisible();

    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await expect(page.getByText("1 ITEMS")).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
  });

  test("shows cart summary", async ({ page }) => {
    await page.goto("/student/menu");
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await page.goto("/student/cart");

    await expect(page.getByRole("heading", { name: "My Cart" })).toBeVisible();
    await expect(page.getByText("Chicken Rice")).toBeVisible();
    await expect(page.getByRole("button", { name: "Proceed to Checkout" })).toBeVisible();
  });

  test("opens wallet and navigates to transactions tab", async ({ page }) => {
    await page.goto("/student/wallet");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Wallet Balance")).toBeVisible();

    await page.getByRole("button", { name: "Transactions" }).click();
    await expect(page.getByRole("heading", { name: "Transactions", exact: true })).toBeVisible();
    await expect(page.getByText("All Transactions")).toBeVisible();
  });

  test("shows complaints list", async ({ page }) => {
    await page.goto("/student/complaints");
    await expect(page.getByRole("heading", { name: "Complaint List" })).toBeVisible();
    await expect(page.getByText("Late order delivery")).toBeVisible();
  });

  test("validates create group form", async ({ page }) => {
    await page.goto("/student/group-study");
    await expect(page.getByRole("heading", { name: "Group Study" })).toBeVisible();
    await page.getByRole("button", { name: "+ New Group" }).click();
    await page.getByRole("button", { name: "Create Group" }).click();
    await expect(page.getByText("Please fix the highlighted form errors before creating the group.")).toBeVisible();
  });

  test("validates food sharing form", async ({ page }) => {
    await page.goto("/student/food-sharing");
    await expect(page.getByRole("heading", { name: /Food Sharing/ })).toBeVisible();

    await page.getByRole("button", { name: "+ Share Food" }).click();
    await page.getByRole("button", { name: "Publish Food Share" }).click();

    await expect(page.getByText("Food title is required")).toBeVisible();
    await expect(page.getByText("You must confirm food safety")).toBeVisible();
  });
});
