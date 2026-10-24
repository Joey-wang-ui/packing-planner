import { Modal, Editor, Quantity } from "./packing/components";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Backpack,
  Luggage,
  ShoppingBag,
  ClipboardCheck,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  X,
  ChevronDown,
  Pencil,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Plane,
  CheckCheck,
  Scale,
  AlertCircle,
  Undo2,
  Menu,
} from "lucide-react";
import {
  categories,
  labels,
  statuses,
  initial,
  KEY,
  done,
  progress,
  daysUntil,
  parseBackup,
  stateSchema,
  toggle,
} from "./packing/model";
import type { Category, Item, Planner } from "./packing/model";
const icons = {
  backpack: Backpack,
  case26: Luggage,
  case28: Luggage,
  shopping: ShoppingBag,
  checklist: ClipboardCheck,
};
type Page = "dashboard" | "list" | "settings";
export default function App() {
  const [loadError] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) parseBackup(raw);
      return "";
    } catch {
      return "本地数据无法读取。为保护原数据，已暂停保存。请先导出原始数据或导入有效备份。";
    }
  });
  const [data, setData] = useState<Planner>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? parseBackup(raw) : initial();
    } catch {
      return initial();
    }
  });
  const [blocked, setBlocked] = useState(!!loadError),
    [notice, setNotice] = useState(loadError),
    [page, setPage] = useState<Page>("dashboard"),
    [category, setCategory] = useState<Category | "all">("all"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [priority, setPriority] = useState("all"),
    [edit, setEdit] = useState<Item | null | undefined>(undefined),
    [deleting, setDeleting] = useState<Item | null>(null),
    [confirm, setConfirm] = useState<"reset" | "import" | null>(null),
    [pending, setPending] = useState<Planner | null>(null),
    [undo, setUndo] = useState<{ item: Item; index: number } | null>(null),
    [expanded, setExpanded] = useState<string[]>([]),
    [nav, setNav] = useState(false),
    [today, setToday] = useState(new Date());
  const closeEditor = useCallback(() => setEdit(undefined), []);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === null)
        localStorage.setItem(KEY, JSON.stringify(initial()));
    } catch {
      setBlocked(true);
      setNotice("浏览器存储不可用，保存已暂停。请启用站点存储后刷新。");
    }
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === KEY) {
        setBlocked(true);
        setNotice(
          "另一个标签页修改了数据。请刷新页面加载最新数据后继续，避免覆盖。",
        );
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  function commit(next: Planner) {
    if (blocked) {
      setNotice("保存已暂停，请刷新加载最新数据，或导入有效备份恢复。");
      return false;
    }
    try {
      stateSchema.parse(next);
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      return true;
    } catch {
      setNotice(
        "保存失败：浏览器存储不可用或空间不足。修改未提交，请导出备份。",
      );
      return false;
    }
  }
  function restore(next: Planner) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setBlocked(false);
      setUndo(null);
      setNotice("清单已更新并保存在当前浏览器。");
    } catch {
      setNotice("无法写入浏览器存储，原数据未替换。");
    }
  }
  function go(p: Page, c: Category | "all" = "all") {
    setPage(p);
    setCategory(c);
    setNav(false);
    setSearch("");
    setFilter("all");
    setPriority("all");
  }
  function update(item: Item) {
    return commit({
      ...latest.current,
      items: latest.current.items.map((i) => (i.id === item.id ? item : i)),
    });
  }
  const stats = progress(data.items),
    days = daysUntil(data.departureDate, today);
  const visible = data.items.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (!search ||
        `${i.name} ${i.notes}`.toLowerCase().includes(search.toLowerCase())) &&
      (priority === "all" || i.priority === priority) &&
      (filter === "all" ||
        (filter === "done"
          ? done(i)
          : filter === "pending"
            ? !done(i)
            : i.status === filter)),
  );
  function backup(raw = false) {
    try {
      const text = raw
        ? (localStorage.getItem(KEY) ?? JSON.stringify(data))
        : JSON.stringify(data, null, 2);
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `usc-packing-${new Date().toISOString().slice(0, 10)}${raw ? "-raw" : ""}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("备份已导出，请妥善保管。");
    } catch {
      setNotice("备份导出失败，请检查浏览器权限。");
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 15 * 1024 * 1024) throw Error();
      const next = parseBackup(await file.text());
      setPending(next);
      setConfirm("import");
    } catch {
      setNotice(
        "导入失败：需要有效的 v1 JSON 备份（最多 15 MB），请检查字段、分类、状态、日期和唯一 ID。",
      );
    }
    if (input.current) input.current.value = "";
  }
  const progressBar = (percent: number) => (
    <div
      className="progress"
      role="progressbar"
      aria-label="完成进度"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
  const row = (i: Item) => {
    const Icon = icons[i.category];
    const open = expanded.includes(i.id);
    return (
      <div className={`item ${done(i) ? "completed" : ""}`} key={i.id}>
        <div className="item-main">
          <label className="check-hit">
            <input
              className="checkbox"
              type="checkbox"
              aria-label={`完成 ${i.name}`}
              checked={done(i)}
              onChange={() => update(toggle(i))}
            />
          </label>
          <div className="item-name">
            <button onClick={() => setEdit(i)}>{i.name}</button>
            <span className="muted small">
              <Icon size={12} /> {labels[i.category]}
            </span>
          </div>
          <Quantity item={i} update={update} />
          <span className={`priority ${i.priority}`}>{i.priority}</span>
          <label className="status-select">
            <span className="sr-only">{i.name}状态</span>
            <select
              aria-label={`${i.name}状态`}
              value={i.status}
              onChange={(e) => update({ ...i, status: e.target.value })}
            >
              {statuses[i.category].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            className="icon-btn"
            aria-label={`展开 ${i.name}`}
            aria-expanded={open}
            onClick={() =>
              setExpanded((x) =>
                open ? x.filter((id) => id !== i.id) : [...x, i.id],
              )
            }
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="icon-btn edit-btn"
            aria-label={`编辑 ${i.name}`}
            onClick={() => setEdit(i)}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-btn delete"
            aria-label={`删除 ${i.name}`}
            onClick={() => setDeleting(i)}
          >
            <Trash2 size={15} />
          </button>
        </div>
        {open && (
          <div className="item-detail">
            <p>{i.notes || "尚未添加备注"}</p>
            {i.source && (
              <p className="muted small">
                Excel 原始记录：{i.source.sheet} · 第 {i.source.row} 行 ·{" "}
                {i.source.subcategory} · 数量 {i.source.quantity} · 状态{" "}
                {i.source.status}
              </p>
            )}
            <span>
              预估单件重量：{i.weight === null ? "未填写" : `${i.weight} kg`} ·{" "}
              <button className="text-btn" onClick={() => setEdit(i)}>
                编辑备注与重量
              </button>
            </span>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="shell">
      <aside className={nav ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("dashboard");
          }}
        >
          <span className="brand-mark">
            <Luggage size={23} />
          </span>
          <span>
            USC Packing
            <span className="brand-sub">PLANNER / 洛杉矶出发计划</span>
          </span>
        </a>
        <div className="workspace">
          <span className="avatar">USC</span>
          <div>
            我的留学旅程<small>Fall forward. Pack thoughtfully.</small>
          </div>
          <span className="dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => go("dashboard")}
          >
            <LayoutDashboard size={18} />
            总览 <span className="nav-en">Overview</span>
          </button>
          <button
            className={page === "list" && category === "all" ? "active" : ""}
            onClick={() => go("list")}
          >
            <ListChecks size={18} />
            全部清单 <span className="count">{data.items.length}</span>
          </button>
          <p className="nav-label">PACKING SPACES</p>
          {categories.map((c) => {
            const Icon = icons[c];
            return (
              <button
                key={c}
                className={page === "list" && category === c ? "active" : ""}
                onClick={() => go("list", c)}
              >
                <Icon size={18} />
                {labels[c]}
                <span className="count">
                  {data.items.filter((i) => i.category === c).length}
                </span>
              </button>
            );
          })}
          <p className="nav-label">PREFERENCES</p>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => go("settings")}
          >
            <Settings size={18} />
            设置与备份
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="destination">
            <Plane size={17} />
            <span>
              下一站，洛杉矶<small>University of Southern California</small>
            </span>
          </div>
          <p>
            <span className="dot" /> 仅保存在此浏览器 · 无云端同步
          </p>
        </div>
      </aside>
      {nav && (
        <button
          className="nav-scrim"
          aria-label="关闭导航"
          onClick={() => setNav(false)}
        />
      )}
      <div className="main">
        <header className="topbar">
          <div>
            <button
              className="icon-btn mobile-menu"
              aria-label="打开导航"
              onClick={() => setNav(!nav)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">我的工作区</span>
            <span className="slash">/</span>
            <span>
              {page === "dashboard"
                ? "旅程总览"
                : page === "settings"
                  ? "设置与备份"
                  : "行李清单"}
            </span>
          </div>
          <span className="save-state">
            <span className={`dot ${blocked ? "warning" : ""}`} />
            {blocked ? "保存已暂停" : "本地自动保存"}
          </span>
        </header>
        <main>
          {notice && (
            <div className="notice" role="status">
              <AlertCircle size={17} />
              <span>{notice}</span>
              {blocked && (
                <button onClick={() => backup(true)}>导出原始数据</button>
              )}
              <button
                className="icon-btn"
                aria-label="关闭提示"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                USC PACKING PLANNER <span>·</span> LOS ANGELES, CA
              </div>
              <h1>
                {page === "dashboard"
                  ? "从容打包，开启下一程。"
                  : page === "settings"
                    ? "你的旅程，你来设定。"
                    : category === "all"
                      ? "每一件，都准备妥当。"
                      : labels[category]}
              </h1>
              <p>
                {page === "dashboard"
                  ? "把准备留在这里，把期待带去洛杉矶。"
                  : page === "settings"
                    ? "管理出发计划，给每一次准备留一份备份。"
                    : "整理行囊的小事，让远行更安心。"}
              </p>
            </div>
            {page !== "settings" && (
              <button className="btn primary" onClick={() => setEdit(null)}>
                <Plus size={18} />
                添加物品
              </button>
            )}
          </div>
          <div className="source-notice">
            <ClipboardCheck size={18} />
            <span>
              <strong>清单已就位</strong> 已从你的 Excel 导入 92
              项原始记录。按需、各1 和范围数量均保留原文。
            </span>
          </div>
          {page === "dashboard" && (
            <>
              <section className="departure">
                <div>
                  <div className="eyebrow">THE NEXT CHAPTER</div>
                  <h2>
                    你好，洛杉矶。<span>Hello, Los Angeles.</span>
                  </h2>
                  <p>
                    <Plane size={16} />
                    {new Date(
                      data.departureDate + "T12:00:00",
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="divider" />
                    USC · 研究生 · 校外公寓
                  </p>
                </div>
                <div className="countdown">
                  {days > 0 ? (
                    <>
                      <span>距离出发还有</span>
                      <div>
                        <strong>{days}</strong>
                        <span>天</span>
                      </div>
                      <small>DEPARTURE COUNTDOWN</small>
                    </>
                  ) : (
                    <>
                      <strong className="departed">
                        {days === 0 ? "今日出发" : "已经出发"}
                      </strong>
                      <small>祝你开启精彩的新旅程</small>
                    </>
                  )}
                </div>
                <div className="flight-path" aria-hidden="true">
                  <Plane size={76} />
                </div>
              </section>
              <section className="stats">
                <div className="stat">
                  <span>
                    全部物品 <ListChecks size={17} />
                  </span>
                  <strong>
                    {stats.total}
                    <small>项</small>
                  </strong>
                  <p>让每一件物品都有归处</p>
                </div>
                <div className="stat">
                  <span>
                    已完成 <CheckCheck size={17} />
                  </span>
                  <strong>
                    {stats.complete}
                    <small>项</small>
                  </strong>
                  <p>又离准备就绪近了一步</p>
                </div>
                <div className="stat">
                  <span>
                    整体完成度 <ArrowUpRight size={17} />
                  </span>
                  <strong>
                    {stats.percent}
                    <small>%</small>
                  </strong>
                  {progressBar(stats.percent)}
                </div>
              </section>
              <div className="section-title">
                <h2>
                  行囊进度 <span>YOUR PACKING SPACES</span>
                </h2>
                <button className="text-btn" onClick={() => go("list")}>
                  查看全部 <ArrowRight size={15} />
                </button>
              </div>
              <section className="space-grid">
                {categories.map((c) => {
                  const Icon = icons[c],
                    p = progress(data.items.filter((i) => i.category === c));
                  return (
                    <button
                      className="space-card"
                      key={c}
                      onClick={() => go("list", c)}
                    >
                      <div className="space-top">
                        <span className="space-icon">
                          <Icon size={22} />
                        </span>
                        <ArrowUpRight size={17} />
                      </div>
                      <h3>{labels[c]}</h3>
                      <p>
                        {c === "case26"
                          ? "核心生活用品"
                          : c === "case28"
                            ? "补充衣物与个人用品"
                            : c === "backpack"
                              ? "证件、电脑及贵重物品"
                              : c === "shopping"
                                ? "抵达洛杉矶后购买"
                                : "重要事项，逐一确认"}
                      </p>
                      <div className="space-progress">
                        <span>
                          {p.complete} / {p.total} 已完成
                        </span>
                        <strong>{p.percent}%</strong>
                      </div>
                      {progressBar(p.percent)}
                    </button>
                  );
                })}
              </section>
              <div className="dashboard-bottom">
                <section className="panel">
                  <div className="section-title">
                    <h2>
                      优先准备 <span>P0 / P1</span>
                    </h2>
                    <span className="muted small">尚未完成</span>
                  </div>
                  {data.items
                    .filter((i) => !done(i) && i.priority !== "P2")
                    .sort((a, b) => a.priority.localeCompare(b.priority))
                    .slice(0, 5)
                    .map((i) => (
                      <div className="important" key={i.id}>
                        <label className="check-hit">
                          <input
                            className="checkbox"
                            type="checkbox"
                            aria-label={`完成 ${i.name}`}
                            checked={false}
                            onChange={() => update(toggle(i))}
                          />
                        </label>
                        <button onClick={() => setEdit(i)}>
                          {i.name}
                          <small>{labels[i.category]}</small>
                        </button>
                        <span className={`priority ${i.priority}`}>
                          {i.priority}
                        </span>
                      </div>
                    ))}
                  {!data.items.some((i) => !done(i) && i.priority !== "P2") && (
                    <div className="compact-empty">
                      <CheckCheck size={26} />
                      <p>暂时没有待办的重要物品</p>
                      <small>添加 P0 / P1 物品后会显示在这里</small>
                    </div>
                  )}
                </section>
                <section className="travel-note">
                  <span className="eyebrow">A LITTLE REMINDER</span>
                  <Backpack size={32} />
                  <h3>轻一点，也安心一点。</h3>
                  <p>
                    实际称重是行李额度的参考依据。出发前记得核实航空公司的最新规定，并备份你的清单。
                  </p>
                  <button className="text-btn" onClick={() => go("settings")}>
                    管理重量与备份 <ArrowRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {page === "list" && (
            <>
              <div className="tabs">
                {(["all", ...categories] as const).map((c) => (
                  <button
                    key={c}
                    className={category === c ? "selected" : ""}
                    onClick={() => {
                      setCategory(c);
                      setFilter("all");
                    }}
                  >
                    {c === "all" ? "全部物品" : labels[c]}
                  </button>
                ))}
              </div>
              <div className="filters">
                <div className="search">
                  <Search size={18} />
                  <input
                    aria-label="搜索物品"
                    placeholder="搜索物品名称、备注…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="icon-btn"
                      aria-label="清空搜索"
                      onClick={() => setSearch("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <select
                  aria-label="状态筛选"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">全部状态</option>
                  <option value="pending">尚未完成</option>
                  <option value="done">已完成</option>
                  {Array.from(
                    new Set(
                      (category === "all" ? categories : [category]).flatMap(
                        (c) => statuses[c],
                      ),
                    ),
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="优先级筛选"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="all">全部优先级</option>
                  {["P0", "P1", "P2"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                {(search || filter !== "all" || priority !== "all") && (
                  <button
                    className="text-btn"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                      setPriority("all");
                    }}
                  >
                    清除筛选
                  </button>
                )}
              </div>
              <div className="list-meta">
                <span>{visible.length} 项物品</span>
                <span>P0 必需 · P1 重要 · P2 可选</span>
              </div>
              <section className="list-panel">
                {visible.map(row)}
                {!visible.length && (
                  <div className="empty">
                    <ListChecks size={40} />
                    <h3>
                      {data.items.length
                        ? "没有匹配的物品"
                        : "行囊，等你来填满。"}
                    </h3>
                    <p>
                      {data.items.length
                        ? "试试其他关键词，或清除筛选条件。"
                        : "从一件重要的物品开始，所有修改都会自动保存。"}
                    </p>
                    <button className="btn" onClick={() => setEdit(null)}>
                      <Plus size={16} />
                      添加第一件物品
                    </button>
                  </div>
                )}
              </section>
              {(category === "case26" || category === "case28") && (
                <p className="muted small">
                  重量额度与实际称重可在「设置与备份」中独立管理。
                </p>
              )}
            </>
          )}
          {page === "settings" && (
            <>
              <section className="panel settings-panel">
                <h2>
                  <Plane size={20} />
                  出发计划
                </h2>
                <p className="muted">
                  默认前往洛杉矶 · University of Southern California · 校外公寓
                </p>
                <label className="date-label">
                  出发日期
                  <input
                    aria-label="出发日期"
                    type="date"
                    min="1900-01-01"
                    max="2200-12-31"
                    value={data.departureDate}
                    onChange={(e) => {
                      const next = { ...data, departureDate: e.target.value };
                      if (stateSchema.safeParse(next).success) commit(next);
                    }}
                  />
                </label>
              </section>
              <div className="section-title">
                <h2>
                  行李重量 <span>WEIGHT MANAGEMENT</span>
                </h2>
              </div>
              <p className="muted small">
                默认 23 kg /
                件仅作参考，请按实际航司额度调整。实际称重与估算分开记录。
              </p>
              <div className="weight-grid">
                {(["case26", "case28"] as const).map((c) => {
                  const w = data.weights[c],
                    remaining = w.actual === null ? null : w.limit - w.actual,
                    estimate = data.items
                      .filter((i) => i.category === c)
                      .reduce(
                        (s, i) =>
                          s +
                          (i.weight ?? 0) *
                            (typeof i.quantity === "number" ? i.quantity : 0),
                        0,
                      ),
                    known = data.items.filter(
                      (i) =>
                        i.category === c &&
                        i.weight !== null &&
                        typeof i.quantity === "number",
                    ).length;
                  return (
                    <section
                      className={`panel weight-panel ${remaining !== null && remaining < 0 ? "overweight" : ""}`}
                      key={c}
                    >
                      <h2>
                        <Luggage size={20} />
                        {labels[c]}
                      </h2>
                      <div className="weight-value">
                        <strong>
                          {w.actual === null ? "—" : w.actual.toFixed(2)}
                        </strong>
                        <span>/ {w.limit} kg</span>
                      </div>
                      <p
                        className={
                          remaining !== null && remaining < 0
                            ? "error"
                            : "muted"
                        }
                      >
                        {remaining === null
                          ? "尚未填写实际称重"
                          : remaining < 0
                            ? `超重 ${(-remaining).toFixed(2)} kg，请调整行李`
                            : `剩余 ${remaining.toFixed(2)} kg 额度`}
                      </p>
                      {progressBar(
                        Math.min(
                          100,
                          Math.round(((w.actual ?? 0) / w.limit) * 100),
                        ),
                      )}
                      <div className="weight-inputs">
                        {(["limit", "actual", "tare"] as const).map((k) => (
                          <label key={k}>
                            {k === "limit"
                              ? "航司额度 (kg)"
                              : k === "actual"
                                ? "实际总重 (kg)"
                                : "箱子自重 (kg)"}
                            <input
                              aria-label={`${labels[c]}${k === "limit" ? "额度" : k === "actual" ? "实际重量" : "自重"}`}
                              type="number"
                              min={k === "limit" ? "0.01" : "0"}
                              max="10000"
                              step="any"
                              value={w[k] ?? ""}
                              onChange={(e) => {
                                const n =
                                  e.target.value === "" && k === "actual"
                                    ? null
                                    : e.target.valueAsNumber;
                                const next = {
                                  ...data,
                                  weights: {
                                    ...data.weights,
                                    [c]: { ...w, [k]: n },
                                  },
                                };
                                if (stateSchema.safeParse(next).success)
                                  commit(next);
                              }}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="estimate">
                        <Scale size={17} />
                        <span>
                          物品预估合计 <strong>{estimate.toFixed(2)} kg</strong>
                          <small>
                            {known} 项数值数量 × 单件重量；按需/范围数量不计入
                          </small>
                        </span>
                      </div>
                      <p className="muted small">
                        估算含箱重：{(estimate + w.tare).toFixed(2)} kg ·
                        不替代实际称重
                      </p>
                    </section>
                  );
                })}
              </div>
              <section className="panel settings-panel">
                <h2>
                  <Download size={20} />
                  数据备份
                </h2>
                <p>
                  数据仅保存在当前浏览器，不会跨设备自动同步。清理浏览器数据可能丢失清单，请定期导出
                  JSON 备份。
                </p>
                <div className="backup-actions">
                  <button className="btn" onClick={() => backup()}>
                    <Download size={17} />
                    导出 JSON 备份
                  </button>
                  <button
                    className="btn"
                    onClick={() => input.current?.click()}
                  >
                    <Upload size={17} />
                    导入 JSON 备份
                  </button>
                </div>
                <small className="muted">
                  导入前校验格式并二次确认，将完整替换当前清单、出发日期和重量设置。
                </small>
              </section>
              <section className="panel settings-panel danger-panel">
                <h2>
                  <RotateCcw size={20} />
                  恢复初始清单
                </h2>
                <p>
                  恢复 Excel 的全部 92
                  项初始物品，替换当前物品及状态，保留日期和重量设置。请先导出备份。
                </p>
                <button
                  className="btn danger"
                  onClick={() => setConfirm("reset")}
                >
                  恢复初始清单
                </button>
              </section>
            </>
          )}
          <footer>
            <span>USC Packing Planner</span>
            <span>
              为新旅程，留一点从容。
              <span className="footer-detail">
                {" "}
                · 个人工具，非 USC 官方应用
              </span>
            </span>
          </footer>
        </main>
      </div>
      <input
        type="file"
        ref={input}
        hidden
        accept=".json,application/json"
        aria-label="选择 JSON 备份"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {edit !== undefined && (
        <Editor
          item={edit ?? undefined}
          category={category === "all" ? "backpack" : category}
          close={closeEditor}
          autosave={(i) => {
            update(i);
          }}
          submit={(i) => {
            const exists = data.items.some((x) => x.id === i.id);
            if (
              commit({
                ...data,
                items: exists
                  ? data.items.map((x) => (x.id === i.id ? i : x))
                  : [...data.items, i],
              })
            ) {
              setEdit(undefined);
              setNotice(exists ? "修改已自动保存。" : "物品已添加并自动保存。");
            }
          }}
        />
      )}
      {deleting && (
        <Modal title="删除这件物品？" close={() => setDeleting(null)}>
          <p>确定删除「{deleting.name}」？删除后可通过底部提示撤销。</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>
              取消
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const index = data.items.findIndex((i) => i.id === deleting.id);
                if (
                  commit({
                    ...data,
                    items: data.items.filter((i) => i.id !== deleting.id),
                  })
                ) {
                  setUndo({ item: deleting, index });
                  setDeleting(null);
                }
              }}
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm === "import"
              ? "导入并替换当前数据？"
              : "恢复 Excel 初始清单？"
          }
          close={() => {
            setConfirm(null);
            setPending(null);
          }}
        >
          <p>
            {confirm === "import"
              ? `备份包含 ${pending?.items.length} 项物品。当前清单、日期和重量设置将被完整替换。`
              : "现有物品将被替换为 Excel 中的 92 项原始清单，状态也将重置。"}
          </p>
          <p className="muted small">此操作不可撤销。建议先导出备份。</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => backup()}>
              先导出备份
            </button>
            <button className="btn" onClick={() => setConfirm(null)}>
              取消
            </button>
            <button
              className="btn primary"
              onClick={() => {
                if (confirm === "import" && pending) restore(pending);
                else restore({ ...data, items: initial().items });
                setConfirm(null);
                setPending(null);
              }}
            >
              确认替换
            </button>
          </div>
        </Modal>
      )}
      {undo && (
        <div className="undo" role="status">
          <span>已删除「{undo.item.name}」</span>
          <button
            onClick={() => {
              const items = [...data.items];
              if (items.some((i) => i.id === undo.item.id)) {
                setUndo(null);
                return;
              }
              items.splice(Math.min(undo.index, items.length), 0, undo.item);
              if (commit({ ...data, items })) setUndo(null);
            }}
          >
            <Undo2 size={16} />
            撤销删除
          </button>
          <button aria-label="关闭撤销提示" onClick={() => setUndo(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
