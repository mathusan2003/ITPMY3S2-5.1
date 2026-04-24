import { expect, test } from "@playwright/test";
import { attachMockApi, expectOnDashboard } from "./helpers/mockApi";

test.describe("Auth and route guards", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await attachMockApi(page);
    await page.goto("/student/dashboard");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  });

  test("shows client-side validation on login form", async ({ page }) => {
    await attachMockApi(page);
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();

    await page.getByPlaceholder("you@example.com").fill("not-an-email");
    await page.getByPlaceholder("Enter your password").fill("123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Password must be at least 6 characters")).toBeVisible();
  });

  test("logs in and redirects student to dashboard", async ({ page }) => {
    await attachMockApi(page, { role: "student" });
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("student1@campus.edu");
    await page.getByPlaceholder("Enter your password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expectOnDashboard(page, "student");
    await expect(page.getByText("Welcome back,")).toBeVisible();
  });

  test("blocks student from admin route", async ({ page }) => {
    await attachMockApi(page, { role: "student" });
    await page.addInitScript(() => {
      localStorage.setItem("canteen_auth", JSON.stringify({ token: "mock-token" }));
    });

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/unauthorized$/);
    await expect(page.getByRole("heading", { name: "Unauthorized" })).toBeVisible();
  });
});
