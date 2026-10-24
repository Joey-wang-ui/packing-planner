# USC Packing Planner

为 2026-12-22 赴洛杉矶、USC 研究生及校外公寓生活准备的个人行李管理工具。React + TypeScript + Vite + Tailwind CSS + Lucide；无后端、账户、数据库服务器或 API Key。

## 运行与验证

使用 Node.js 24 LTS（`.nvmrc`）。

```bash
npm install
npm run dev
# 可重复安装 / CI 使用 npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

浏览器测试：

```bash
npx playwright install --with-deps chromium
npm run test:e2e
# 已安装系统 Chromium 的 Linux 环境可用：
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

## 初始清单与来源

原文件保存在 `docs/source.xlsx`，只读提取，未改写 Excel。`src/packing/initial-items.json` 包含全部 **92 项**：随身背包 18、26 寸箱 20、28 寸箱 20、美国采购 19、出发检查 15。`docs/excel-source.json` 留存总览内容和核对数量。

- 保留每行名称、数量原文、优先级、备注及 Excel 子分类，不合并同名不同箱子的物品。
- 稳定 ID 为工作表分类 + 原行号；原表位置、原数量、原状态保存在 `source` 字段，展开物品可查看。
- “3件”等明确数量拆为数字及单位；“各1”“按需”“少量”“2–3个”等保持原文，允许用户在编辑窗口改为确定数量和单位。
- 原表全部为“未开始”：国内映射为“待准备”、采购映射为“待购买”、检查映射为“未完成”。后续状态按对应分类管理。
- 估算重量为空，不编造；仅合计数值数量 × 单件估算重量。范围、按需等不计入估算。箱子自重单独记录，含箱重估算与实际称重始终分开。
- Excel 总览缓存倒计时不作为常量，按浏览器本地日期实时计算。出发当日显示“今日出发”，之后显示“已经出发”。
- 校验脚本：`python3 scripts/verify-excel.py`（开发核对需 openpyxl，Web 应用不依赖 Python）。

## 使用与数据安全

支持分类导航、搜索/状态/优先级筛选、添加、编辑、数量调整、完成勾选、删除确认及最近一次删除撤销。点击名称编辑已有物品时，有效字段修改实时自动保存；新增物品需确认添加。修改分类会重置为该分类的初始状态。整体进度按物品条目计算，国内“已装箱”、采购“已购买”、检查“已完成”计为完成。

数据保存在当前 origin 的 localStorage，键为 `usc-packing-planner-v1`。刷新、关闭浏览器后仍保留；**不跨设备同步，也不会上传个人数据**。清理浏览器数据、隐私模式或更换站点 origin 可能导致数据不可用。定期在「设置与备份」导出 JSON；换设备后导入，校验通过并确认后完整替换。备份最大 15 MB，版本 `schemaVersion: 1`，验证数量、日期、唯一 ID、分类、匹配状态和重量等字段。

写入失败不提交修改；损坏的本地数据不自动覆盖，支持导出原文。检测其他标签页修改后暂停编辑，刷新加载最新数据。建议只在一个标签页编辑；localStorage 不提供跨标签页事务，无法保证极端同时写入的并发安全。撤销删除仅保留在当前会话，导入及恢复会清除撤销记录。

两个箱子独立设置航司额度、实际总重和自重。23 kg 是参考值，最终以实际航司规定为准；总览原表另建议 26 寸控制在 18–20 kg、28 寸 19–21 kg。恢复初始清单需要确认，恢复全部 92 项及初始状态，保留当前出发日期与重量设置。导入和恢复不可撤销，先导出备份。

## GitHub Pages 部署

仓库：[Joey-wang-ui/packing-planner](https://github.com/Joey-wang-ui/packing-planner)。

`.github/workflows/deploy.yml` 已配置测试、构建、Pages 配置检查及部署：

1. 提交代码并推送到仓库 `main` 分支。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送 `main` 或手动运行 **Test and deploy to GitHub Pages**。
4. 等待 build 和 deploy 两个 job 成功，从 Actions 的 `github-pages` environment 获取实际地址。

需要仓库允许 Actions 使用 `pages: write`、`id-token: write`；如有保护规则需仓库维护者审批。Vite 使用相对 `base: './'`，支持仓库子路径、根站点和自定义域名。页面导航采用应用内状态，无服务端路由，刷新不会访问虚构路径；刷新回到总览，数据保留。

本次环境的 GitHub API 权限检查返回 Forbidden，**尚未部署或验证线上地址**。不要将本地开发服务器视为线上网站。发布到同一 origin 的多个路径会共享 localStorage，建议一个 origin 只运行一个该工具实例。

## 目录

- `src/App.tsx`：布局、Dashboard、清单、编辑弹窗及设置。
- `src/packing/model.ts`：校验、初始化、状态、统计与日期。
- `src/packing/initial-items.json`：Excel 初始数据。
- `src/packing/model.test.ts`：来源数量及业务边界测试。
- `src/styles.css`：响应式布局、组件样式与动效。
- `e2e/tracker.spec.ts`：真实浏览器交互、持久化、备份与移动端测试。

个人工具，非 USC 官方应用。
