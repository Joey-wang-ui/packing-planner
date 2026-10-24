import { useEffect, useRef, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import { X, Check } from "lucide-react";
import { categories, labels, statuses, itemSchema } from "./model";
import type { Item, Category } from "./model";
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const nodes = () =>
      Array.from(
        ref.current!.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        ),
      ).filter((e) => !e.hasAttribute("disabled"));
    nodes()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const all = nodes();
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="关闭弹窗" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Editor({
  item,
  category,
  submit,
  autosave,
  close,
}: {
  item?: Item;
  category: Category;
  submit: (i: Item) => void;
  autosave: (i: Item) => void;
  close: () => void;
}) {
  const [draft, set] = useState<Item>(
    item
      ? { ...item }
      : {
          id: crypto.randomUUID(),
          name: "",
          quantity: 1,
          unit: "件",
          category,
          priority: "P1",
          status: statuses[category][0],
          notes: "",
          weight: null,
        },
  );
  const [error, setError] = useState("");
  const change = (patch: Partial<Item>) => {
    const next = { ...draft, ...patch };
    set(next);
    const result = itemSchema.safeParse(next);
    if (item && result.success) autosave(result.data);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const result = itemSchema.safeParse(draft);
    if (!result.success) {
      setError("请检查名称、数量和重量。数字数量须大于 0，重量不能为负。");
      return;
    }
    submit(result.data);
  };
  return (
    <Modal title={item ? "编辑物品" : "添加物品"} close={close}>
      <form onSubmit={save} className="form">
        <label>
          物品名称
          <input
            autoComplete="off"
            required
            maxLength={150}
            value={draft.name}
            onChange={(e) => change({ name: e.target.value })}
            placeholder="例如：护照"
          />
        </label>
        <div className="form-grid">
          <label>
            数量
            <input
              required
              maxLength={40}
              value={draft.quantity}
              onChange={(e) =>
                change({
                  quantity: /^\d+(\.\d+)?$/.test(e.target.value)
                    ? Number(e.target.value)
                    : e.target.value,
                })
              }
            />
          </label>
          <label>
            单位
            <input
              maxLength={20}
              value={draft.unit}
              onChange={(e) => change({ unit: e.target.value })}
            />
          </label>
        </div>
        <label>
          所属分类
          <select
            value={draft.category}
            onChange={(e) => {
              const c = e.target.value as Category;
              change({ category: c, status: statuses[c][0] });
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {labels[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            优先级
            <select
              value={draft.priority}
              onChange={(e) =>
                change({ priority: e.target.value as Item["priority"] })
              }
            >
              {["P0", "P1", "P2"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            状态
            <select
              value={draft.status}
              onChange={(e) => change({ status: e.target.value })}
            >
              {statuses[draft.category].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          预估单件重量（kg，可选）
          <input
            type="number"
            min="0"
            max="10000"
            step="any"
            value={draft.weight ?? ""}
            onChange={(e) =>
              change({
                weight: e.target.value === "" ? null : e.target.valueAsNumber,
              })
            }
          />
        </label>
        <label>
          备注
          <textarea
            rows={3}
            maxLength={5000}
            value={draft.notes}
            onChange={(e) => change({ notes: e.target.value })}
            placeholder="尺寸、收纳位置或需要留意的事…"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="muted small">
          {item
            ? "有效修改实时自动保存在当前浏览器，关闭即可。"
            : "添加后自动保存，随时可以继续编辑。"}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={close}>
            取消
          </button>
          <button className="btn primary" type="submit">
            <Check size={16} />
            {item ? "完成修改" : "添加物品"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Quantity({
  item,
  update,
}: {
  item: Item;
  update: (i: Item) => boolean;
}) {
  const [text, setText] = useState(String(item.quantity));
  useEffect(() => setText(String(item.quantity)), [item.quantity]);
  return (
    <label className="qty">
      <span className="sr-only">{item.name}数量</span>
      <input
        aria-label={`${item.name}数量`}
        maxLength={40}
        value={text}
        onBlur={() => {
          if (!text.trim()) setText(String(item.quantity));
        }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const quantity = /^\d+(\.\d+)?$/.test(v) ? Number(v) : v;
          const next = { ...item, quantity };
          if (itemSchema.safeParse(next).success) update(next);
        }}
      />
      <span>{item.unit}</span>
    </label>
  );
}
