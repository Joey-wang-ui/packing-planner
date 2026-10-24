import { z } from "zod";
import seed from "./initial-items.json";
export const categories = [
  "backpack",
  "case26",
  "case28",
  "shopping",
  "checklist",
] as const;
export type Category = (typeof categories)[number];
export const labels: Record<Category, string> = {
  backpack: "随身背包",
  case26: "26 寸行李箱",
  case28: "28 寸行李箱",
  shopping: "美国采购",
  checklist: "出发前检查",
};
export const statuses: Record<Category, string[]> = {
  backpack: ["待准备", "已准备", "已装箱"],
  case26: ["待准备", "已准备", "已装箱"],
  case28: ["待准备", "已准备", "已装箱"],
  shopping: ["待购买", "已购买"],
  checklist: ["未完成", "已完成"],
};
const number = z.number().finite().min(0).max(10000);
export const itemSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(150),
    quantity: z.union([
      z.number().finite().positive().max(10000),
      z
        .string()
        .trim()
        .min(1)
        .max(40)
        .refine(
          (v) => !Number.isFinite(Number(v)) || Number(v) > 0,
          "数量须大于 0",
        ),
    ]),
    unit: z.string().trim().max(20),
    category: z.enum(categories),
    priority: z.enum(["P0", "P1", "P2"]),
    status: z.string(),
    notes: z.string().max(5000),
    weight: number.nullable(),
    source: z
      .object({
        sheet: z.string(),
        row: z.number().int().positive(),
        subcategory: z.string(),
        quantity: z.string(),
        status: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((i) => statuses[i.category].includes(i.status), "状态与分类不匹配");
export type Item = z.infer<typeof itemSchema>;
export const weightSchema = z
  .object({ limit: number.positive(), actual: number.nullable(), tare: number })
  .strict();
export const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  s >= "1900-01-01" &&
  s <= "2200-12-31" &&
  Number.isFinite(Date.parse(s + "T00:00:00Z")) &&
  new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
export const stateSchema = z
  .object({
    schemaVersion: z.literal(1),
    departureDate: z.string().refine(validDate, "日期无效"),
    items: z.array(itemSchema).max(10000),
    weights: z.object({ case26: weightSchema, case28: weightSchema }).strict(),
  })
  .strict()
  .refine(
    (s) => new Set(s.items.map((i) => i.id)).size === s.items.length,
    "物品 ID 重复",
  );
export type Planner = z.infer<typeof stateSchema>;
// Validated workbook rows; every initial() call clones the seed. Source columns remain available for audit.
export const initialItems: readonly Item[] = Object.freeze(
  z.array(itemSchema).parse(seed),
);
export const initial = (): Planner => ({
  schemaVersion: 1,
  departureDate: "2026-12-22",
  items: structuredClone([...initialItems]),
  weights: {
    case26: { limit: 23, actual: null, tare: 0 },
    case28: { limit: 23, actual: null, tare: 0 },
  },
});
export const KEY = "usc-packing-planner-v1";
export const done = (i: Item) => i.status === statuses[i.category].at(-1);
export function progress(items: Item[]) {
  const complete = items.filter(done).length;
  return {
    total: items.length,
    complete,
    percent: items.length ? Math.round((complete / items.length) * 100) : 0,
  };
}
export function daysUntil(date: string, now = new Date()) {
  return Math.round(
    (Date.parse(date + "T00:00:00Z") -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000,
  );
}
export function parseBackup(text: string): Planner {
  if (new Blob([text]).size > 15 * 1024 * 1024)
    throw new Error("备份文件不能超过 15 MB");
  return stateSchema.parse(JSON.parse(text));
}
export function toggle(i: Item): Item {
  return {
    ...i,
    status: done(i) ? statuses[i.category][0] : statuses[i.category].at(-1)!,
  };
}
