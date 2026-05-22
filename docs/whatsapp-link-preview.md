# WhatsApp / 社交分享链接预览

## 原理

WhatsApp 展示链接卡片时**不运行** React，只：

1. 用爬虫访问分享 URL（如 `https://okcopa.com/?ticket=user-123`）
2. 读 HTML 里的 **Open Graph**（`og:title`、`og:description`、`og:image`）
3. 缓存很久 → 改完后要到 [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) 点 **Scrape Again**

## 本仓库方案（推荐：卡片内容 → 预览图）

| 环节 | 实现 |
|------|------|
| 分享链接 | `?ticket=帖子ID`（前端 Share 按钮已生成） |
| 爬虫 HTML | `functions/_middleware.ts` 返回带 OG 的静态 HTML |
| **预览图** | `functions/og/ticket.ts` 按帖子数据**画一张与卡片同结构的 PNG**（1200×630） |
| 数据来源 | Supabase `ticket_wall_posts` + `functions/data/matches-og.json`（赛程） |

预览图大致包含：对阵 + 国家/城市/球场 + 开球时间 + 票数/类别 + 价格，风格与站内卖票卡片一致。

`og:image` 指向：

```text
https://你的域名/og/ticket?id=帖子ID
```

## 部署 checklist

### 1. Cloudflare 环境变量（Production）

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 前端发帖、拉墙 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | **同上**（Functions 不读 `VITE_` 前缀） |
| `SITE_ORIGIN` | 可选，`https://okcopa.com`，用于 OG 绝对 URL |

### 2. 赛程数据（改赛程后执行一次）

```bash
npm run export:og-matches
```

会更新 `functions/data/matches-og.json`（104 场），提交并部署。

### 3. 重新部署 Pages

Push 后确认构建包含 `functions/`。部署后可在浏览器直接打开：

`https://okcopa.com/og/ticket?id=某帖子ID`

应看到 PNG 预览图（卖票帖会显示对阵等信息）。

### 4. 刷新 WhatsApp 缓存

[Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) → 粘贴 `https://okcopa.com/?ticket=...` → **Scrape Again**。

## 其他可选方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **当前：边缘动态 PNG** | 免存图、随帖子变；WhatsApp 认 | 依赖 CF Functions + wasm；emoji 旗在部分环境略糊 |
| 发帖时 html2canvas 截图上传 Supabase Storage | 与屏幕像素一致 | 要桶、上传逻辑、存储费 |
| 全站一张 `og-okcopa.png` | 最简单 | 所有链接预览相同 |
| 仅 `og:title` / `og:description` 无图 | 无图成本 | WhatsApp 常只显示纯链接 |

## 本地调试

`npm run dev` **不会**跑 Functions。可：

```bash
npm run build
npx wrangler pages dev dist
```

在 `.dev.vars` 里写 `SUPABASE_URL`、`SUPABASE_ANON_KEY`，再访问 `/og/ticket?id=...`。

## 字体（避免 WhatsApp 黑图）

边缘 `resvg` **没有系统字体**，文字会画不出来，预览图只剩黑底+色条。

本仓库在 **`public/fonts/`** 放了 Inter TTF，`ogPng.ts` 会从同域拉取后再生成 PNG。部署后确认能打开：

`https://okcopa.com/fonts/inter-latin-400-normal.ttf`

## 常见问题

| 现象 | 处理 |
|------|------|
| WhatsApp **缩略图全黑** / 只有一条色带 | 多为未加载字体（见上）；部署含 `public/fonts` 的新版后 Debugger **Scrape Again** |
| WhatsApp 无图 / 旧图 | Debugger 强制 Scrape；确认 `/og/ticket?id=` 在浏览器能打开 PNG 且**能看见文字** |
| 标题/描述是通用站名、不是帖子 | Production 未配 **`SUPABASE_URL` + `SUPABASE_ANON_KEY`**（与 `VITE_` 相同，Functions 不读 `VITE_`） |
| 图里没有对阵 | 帖子 `payload.matches` 是否含 `Match N`；是否跑过 `export:og-matches` |
| Functions 部署失败 | 看 CF 日志是否 wasm / 字体拉取失败 |
| 描述英文 | 改 `functions/ogCardContent.ts` / `ogTicket.ts` 文案 |
