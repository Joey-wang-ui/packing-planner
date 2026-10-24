import { describe, expect, it } from "vitest";
import {
  categories,
  initial,
  initialItems,
  progress,
  toggle,
  daysUntil,
  parseBackup,
  stateSchema,
} from "./model";
describe("Excel 初始数据", () => {
  it("完整保留 92 条记录和各分类数量、原文及稳定 ID", () => {
    const s = initial();
    expect(s.items).toHaveLength(92);
    expect(
      categories.map((c) => s.items.filter((i) => i.category === c).length),
    ).toEqual([18, 20, 20, 19, 15]);
    expect(new Set(s.items.map((i) => i.id)).size).toBe(92);
    expect(s.items.every((i) => i.source?.row && i.source?.quantity)).toBe(
      true,
    );
    expect(s.items.find((i) => i.name === "衣架")?.quantity).toBe("15–20个");
    expect(
      s.items.find((i) => i.name === "短袖 T 恤" && i.category === "case26")
        ?.quantity,
    ).toBe(3);
    expect(progress(s.items).complete).toBe(0);
  });
  it("每次恢复都是独立副本，不污染初始数据", () => {
    const a = initial();
    a.items[0].notes = "changed";
    a.items.pop();
    expect(initial().items).toHaveLength(92);
    expect(initialItems[0].notes).not.toBe("changed");
  });
});
describe("进度与状态", () => {
  it.each(categories)("%s 分类快捷完成和取消", (c) => {
    const item = initial().items.find((i) => i.category === c)!;
    const checked = toggle(item);
    expect(progress([checked]).percent).toBe(100);
    expect(toggle(checked).status).toBe(item.status);
  });
  it("空清单进度为零，按条目而非数量统计", () => {
    expect(progress([])).toEqual({ total: 0, complete: 0, percent: 0 });
    const items = initial().items.slice(0, 3);
    items[0] = toggle(items[0]);
    expect(progress(items)).toEqual({ total: 3, complete: 1, percent: 33 });
  });
});
describe("日期与备份边界", () => {
  it("倒计时按本地日历日期计算，不受时刻影响", () => {
    expect(daysUntil("2026-12-22", new Date(2026, 9, 24, 23, 59))).toBe(59);
    expect(daysUntil("2026-12-22", new Date(2026, 11, 22))).toBe(0);
    expect(daysUntil("2026-12-22", new Date(2026, 11, 23))).toBe(-1);
  });
  it("JSON 备份保留全部状态、来源和两个独立重量设置", () => {
    const s = initial();
    s.weights.case26.actual = 24;
    s.weights.case28.limit = 30;
    s.items[0] = toggle(s.items[0]);
    expect(parseBackup(JSON.stringify(s))).toEqual(s);
  });
  it.each(["2026-02-30", "2026-13-01", "2026-00-01", "bad"])(
    "拒绝无效日期 %s",
    (departureDate) =>
      expect(
        stateSchema.safeParse({ ...initial(), departureDate }).success,
      ).toBe(false),
  );
  it("拒绝重复 ID、非法状态、非有限重量、负数量、未知字段和版本", () => {
    const s = initial();
    const invalid = [
      { ...s, items: [s.items[0], s.items[0]] },
      { ...s, items: [{ ...s.items[0], status: "已购买" }] },
      { ...s, items: [{ ...s.items[0], quantity: -1 }] },
      {
        ...s,
        weights: {
          ...s.weights,
          case26: { limit: 0, actual: Infinity, tare: -1 },
        },
      },
      { ...s, schemaVersion: 2 },
      { ...s, unknown: true },
    ];
    for (const v of invalid)
      expect(stateSchema.safeParse(v).success).toBe(false);
    expect(() => parseBackup("{")).toThrow();
  });
});
