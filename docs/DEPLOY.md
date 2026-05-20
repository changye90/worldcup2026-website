# 发布 OKcopa 到服务器（接 INDEX 第 147 条）

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
