# 发布 OKcopa 到服务器（接 INDEX 第 147 条）

## Cloudflare Pages（GitHub 自动部署）

在 Cloudflare 控制台 → Pages → 你的项目 → **Settings → Builds & deployments** 填：

| 项 | 值 |
|----|-----|
| Framework preset | **Vite**（选 Vite 会自动填下面两行；若选 None 必须手填） |
| Build command | **`npm run build`** ← 缺这项就会报 `dist not found` |
| Build output directory | **`dist`**（可与 wrangler.toml 的 `pages_build_output_dir` 一致） |
| Node.js version | **20**（Environment variables → `NODE_VERSION` = `20`） |

### 票务墙 Supabase（生产环境必配）

Pages → 项目 → **Settings → Environment variables**（Production）添加：

| 变量名 | 值 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://qytwpbckusacimnzmemo.supabase.co`（你的 Project URL） |
| `VITE_SUPABASE_ANON_KEY` | Supabase **Publishable key**（`sb_publishable_...`） |

保存后 **Retry deployment** 或再 push 一次，否则线上发帖仍只存浏览器、别人看不到。

**WhatsApp 链接预览**（分享 `?ticket=` 时显示标题/描述/图）还需：

| 变量名 | 值 |
|--------|-----|
| `SUPABASE_URL` | 与 `VITE_SUPABASE_URL` 相同（Functions 不读 `VITE_` 前缀） |
| `SUPABASE_ANON_KEY` | 与 `VITE_SUPABASE_ANON_KEY` 相同 |
| `SITE_ORIGIN` | 可选，`https://okcopa.com` |

缺 `SUPABASE_*` 时 WhatsApp 链接标题会是通用文案（务必在 Production 配齐，与 `VITE_*` 同值）。预览图输出为 **JPEG（约 150KB）**——超过 ~300KB 时 WhatsApp 常会**不显示缩略图**。详见 [docs/whatsapp-link-preview.md](./whatsapp-link-preview.md)。

票务分享预览图由 **`/og/ticket?id=帖子ID`** 动态生成（卡片对阵样式），无需手传每张图。改赛程后执行 `npm run export:og-matches`。详见 [docs/whatsapp-link-preview.md](./whatsapp-link-preview.md)。

Supabase 表 `ticket_wall_posts` 需已建表，且 RLS 允许 `anon` 的 `select` / `insert` / `update`。完整 SQL 见 [docs/supabase-ticket-wall.sql](./supabase-ticket-wall.sql)。

**访问与点击埋点**（PV/UV、WhatsApp、电话、头部/赛程按钮）写入表 `site_analytics_events`，使用同一套 `VITE_SUPABASE_*`。建表 SQL：[docs/supabase-analytics.sql](./supabase-analytics.sql)（只需执行一次）。

表单字段（含 `category`、`seatDetails`）存在 **`payload` jsonb** 里，加座位详情**不用改表结构**，部署新前端即可。

批量导入 Excel 票务行见 [docs/import-ticket-wall-supabase.md](./import-ticket-wall-supabase.md)（`npm run import:tickets -- ./data/你的表.xlsx`）。

日志里若出现 **`No build command specified. Skipping build step.`** 紧接着 **`Output directory "dist" not found`**：就是没配 Build command（`dist` 在 `.gitignore` 里，必须构建才会生成）。

**不要**把输出目录设成 `/` 或仓库根目录——根目录里曾有过指向本机 `.cursor` 的符号链接，会报：

`build output directory contains links to files that can't be accessed`

保存后必须 **重新部署最新 main**，不要对旧失败记录点 **Retry deployment**（见下）。

### 重要：不要只点「重试部署」

日志里若仍是：

- `HEAD is now at b48137c 第一次通过 Cursor 提交`
- `No build command specified`

说明 Cloudflare 在 **重复上一次失败**，没有拉 GitHub 上已修复的 `f757b3f` 等提交。

请按顺序做：

1. **Settings → Builds**：确认 Build command = `npm run build`，Output = `dist`，Production branch = `main`
2. **Deployments** → **Create deployment** → 选 **main** 最新提交（或本地 `git commit --allow-empty` 再 `git push` 触发新构建）
3. 新日志里应出现 `npm run build`，且 **不再是** `b48137c`

构建成功后站点只有 `dist` 内容。在 Cloudflare 上构建时会自动 `base: '/'`（`CF_PAGES=1`）；阿里云子目录包仍用 `VITE_BASE=./`。

若出现白屏 + 控制台 `application/octet-stream`：不要用 `/* /index.html` 通配重定向（会把 `.js` 当 HTML 返回）；本仓库已用 `public/_headers` 固定 JS/CSS 的 Content-Type。

> 若仍因 **文件过多 / 体积过大** 失败：把 `public/media/car-rentals/*.jpg` 迁到 R2/OSS，不要打进 Git（见下文「图片」）。

---

## 免 Nginx：html.zip + Node 静态服务（CentOS 7 推荐）

本机打包（`base: './'` 相对路径 + `server.js`）：

```bash
npm run pack:html
```

生成项目根目录 **`html.zip`**（约 280MB，含车辆图片资源）。上传到服务器后：

```bash
mkdir -p /root/mywebsite && cd /root/mywebsite
unzip -o ~/html.zip
sudo node server.js    # 监听 80，需已安装 Node
```

非 root 端口：`PORT=8080 node server.js`，安全组放行对应端口。

`server.js` 对 `.js` 返回 `application/javascript`，并支持 SPA 回退到 `index.html`。

---

## SFTP 上传 dist（可选）

这是 **静态站**：也可只上传 `dist/`（或配合 Nginx）。

你的 SFTP 已配置在 `.vscode/sftp.json`：

| 项 | 值 |
|----|-----|
| 服务器 | `47.90.231.165` |
| 远程目录 | `/root/mywebsite` |
| 上传内容 | 本机 `dist/` 里的文件 |

---

## 每次发布（推荐流程）

### 1. 本机构建

在项目根目录：

```bash
cd /Users/a58/Desktop/wordcup2026
npm run build
```

确认出现 `dist/index.html` 和 `dist/assets/`。

### 2. 用 Cursor / VS Code 上传到服务器

1. 安装扩展：**SFTP**（`natizyskunk.sftp`，你本机若已有可跳过）。
2. 打开命令面板：**Cmd + Shift + P**。
3. 执行：**`SFTP: Upload Project`**（或 **`SFTP: Sync Local -> Remote`**）。
   - 配置里 `"context": "./dist"` 表示上传的是 **`dist` 目录内容**，不是整个仓库。
4. 等待上传完成。

> 若菜单里没有 SFTP：在左侧资源管理器里 **右键 `dist` 文件夹** → 找 **Upload Folder** / **Sync** 相关项。

### 3. 浏览器访问

- 若域名已解析到该服务器：打开你的域名（如 `http://你的域名/`）。
- 若只用 IP：一般是 **`http://47.90.231.165/`**（具体取决于 Nginx 是否监听 80、是否绑了别的站点根目录）。

页脚有 **`build · <时间>`** 时，对比时间可确认是不是刚传的包。

---

## 服务器上 Nginx（首次或 404 时）

SSH 登录服务器后，站点根目录应指向 **`/root/mywebsite`**（与 SFTP 一致），并支持 SPA 回退：

```nginx
server {
    listen 80;
    server_name _;   # 或你的域名

    root /root/mywebsite;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

检查并重载：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS 可用 `certbot --nginx -d 你的域名`。

---

## 命令行上传（可选）

已配置 SSH 公钥时：

```bash
npm run build
rsync -avz --delete dist/ root@47.90.231.165:/root/mywebsite/
```

未配置密钥时会提示输入密码（与 SFTP 相同，勿把密码写进脚本或提交 Git）。

---

## SFTP 报错：`Timed out while waiting for handshake`

说明：**网络能碰到 22 端口，但 SSH 服务没在规定时间内完成握手**（常见日志：`timed out during banner exchange`）。

按顺序排查：

1. **阿里云控制台 → ECS → 安全组**  
   - 入方向放行 **TCP 22**（来源可先试 `0.0.0.0/0` 测通，再改回你本机公网 IP）。  
   - 确认实例在 **运行中**，公网 IP 仍是 `47.90.231.165`。

2. **用网页终端登录（不依赖本机 SFTP）**  
   - 控制台 → **远程连接 / Workbench** → 登录后执行：  
     `systemctl status sshd`  
     `systemctl restart sshd`  
   - 若 `sshd` 异常或磁盘满，SSH 会一直卡在 handshake。

3. **本机终端自测**（应看到 `SSH-2.0-...` 字样，而不是一直卡住）：  
   `ssh -v -o ConnectTimeout=20 root@47.90.231.165`

4. **换网络**（手机热点 / 关 VPN）再试 SFTP；延迟高时 `.vscode/sftp.json` 里已设 `"connectTimeout": 60000`。

5. **临时上传**（SSH 修不好时）  
   - 在 Workbench 里用 `rz`/面板上传，或把 `dist` 打成 zip 传到 OSS 再在服务器解压到 `/root/mywebsite`。

---

## 常见问题

**Q：上传后页面还是旧的？**  
- 浏览器 **Cmd + Shift + R** 强刷。  
- 看页脚 `build ·` 时间是否更新。

**Q：门票墙发帖别人看不到？**  
- 表单帖存在**访客浏览器 localStorage**，不会随 `dist` 上传。全员可见需要后端或把数据写进代码种子数据。

**Q：密码安全**  
- `.vscode/sftp.json` 已加入 `.gitignore`，不要提交到 GitHub。
