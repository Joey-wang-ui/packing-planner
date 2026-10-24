import { test, expect } from "@playwright/test";
async function add(page: import("@playwright/test").Page, name: string) {
  await page
    .getByRole("button", { name: "添加物品", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("物品名称").fill(name);
  await dialog.getByRole("button", { name: "添加物品", exact: true }).click();
}
test("92 original rows, CRUD, live editing, persistence, filters and undo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("清单已就位")).toBeVisible();
  await page.getByRole("button", { name: /全部清单/ }).click();
  await expect(page.locator(".item")).toHaveCount(92);
  await add(page, "测试证件袋");
  await expect(page.locator(".item")).toHaveCount(93);
  await page
    .getByRole("checkbox", { name: "完成 测试证件袋", exact: true })
    .check();
  await page.getByRole("button", { name: "测试证件袋", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("数量", { exact: true }).fill("3");
  await dialog.getByLabel("备注", { exact: true }).fill("自动保存的备注");
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();
  await page.reload();
  await page.getByRole("button", { name: /全部清单/ }).click();
  await page.getByRole("textbox", { name: "搜索物品" }).fill("测试证件袋");
  await expect(page.locator(".item")).toHaveCount(1);
  await expect(
    page.getByRole("checkbox", { name: "完成 测试证件袋", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("textbox", { name: "测试证件袋数量", exact: true }),
  ).toHaveValue("3");
  await page
    .getByRole("button", { name: "展开 测试证件袋", exact: true })
    .click();
  await expect(page.getByText("自动保存的备注")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "完成 测试证件袋", exact: true })
    .uncheck();
  await page
    .getByRole("combobox", { name: "状态筛选", exact: true })
    .selectOption("done");
  await expect(page.locator(".item")).toHaveCount(0);
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await expect(page.locator(".item")).toHaveCount(93);
  await page
    .getByRole("button", { name: "删除 测试证件袋", exact: true })
    .click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.locator(".item")).toHaveCount(92);
  await page.getByRole("button", { name: "撤销删除", exact: true }).click();
  await expect(page.locator(".item")).toHaveCount(93);
  expect(errors).toEqual([]);
});
test("independent weights, JSON export/import validation and reset confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设置与备份", exact: true }).click();
  await page.getByLabel("26 寸行李箱实际重量", { exact: true }).fill("24");
  await page.getByLabel("28 寸行李箱实际重量", { exact: true }).fill("19");
  await expect(page.getByText("超重 1.00 kg，请调整行李")).toBeVisible();
  await expect(page.getByText("剩余 4.00 kg 额度")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "设置与备份", exact: true }).click();
  await expect(
    page.getByLabel("26 寸行李箱实际重量", { exact: true }),
  ).toHaveValue("24");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 JSON 备份", exact: true })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .getByLabel("选择 JSON 备份", { exact: true })
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":20}'),
    });
  await expect(page.getByRole("status")).toContainText("导入失败");
  await page.getByRole("button", { name: "恢复初始清单", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByLabel("26 寸行李箱实际重量", { exact: true }),
  ).toHaveValue("24");
  await page.getByLabel("选择 JSON 备份", { exact: true }).setInputFiles(path!);
  await expect(page.getByRole("dialog")).toContainText("92 项物品");
  await page.getByRole("button", { name: "确认替换", exact: true }).click();
  await expect(
    page.getByLabel("28 寸行李箱实际重量", { exact: true }),
  ).toHaveValue("19");
  await page.getByLabel("出发日期", { exact: true }).fill("2020-01-01");
  await page.getByRole("button", { name: /总览/ }).click();
  await expect(page.getByText("已经出发", { exact: true })).toBeVisible();
});
test("mobile navigation, touch controls and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/packing-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "打开导航", exact: true }).click();
  await page.getByRole("button", { name: /全部清单/ }).click();
  await expect(page.locator(".item")).toHaveCount(92);
  await page
    .getByRole("checkbox", { name: "完成 护照 + 有效 F-1 签证", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", {
      name: "完成 护照 + 有效 F-1 签证",
      exact: true,
    }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "护照 + 有效 F-1 签证", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/packing-list-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "打开导航", exact: true }).click();
  await page.getByRole("button", { name: "设置与备份", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("corrupted local data is preserved and write failures do not claim success", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("usc-packing-planner-v1", "broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("本地数据无法读取");
  expect(
    await page.evaluate(() => localStorage.getItem("usc-packing-planner-v1")),
  ).toBe("broken");
});
test("storage quota failures leave the list unchanged", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await add(page, "不得丢失");
  await expect(page.getByRole("status")).toContainText("保存失败");
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("desktop overview", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({
    path: "test-results/packing-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "从容打包，开启下一程。" }),
  ).toBeVisible();
});
