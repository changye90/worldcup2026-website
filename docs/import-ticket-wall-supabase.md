# 票务表格导入 Supabase

把 Excel / CSV（你现在的「交易类、比赛、联系方式…」表）批量写入 `ticket_wall_posts`，网站上票务墙会直接显示。

## 1. 准备表格

**第一行必须是表头**，列名用中文即可（与截图一致）：

| 列名 | 示例 | 说明 |
|------|------|------|
| 交易类 | `sell` | `sell` 卖票 / `buy` 求票 |
| 国家 | `Mexico` | 可选，用于国旗 emoji |
| 比赛 | `Germany vs Curaçao` | 建议 `A vs B`，能对上赛程会显示球场/时间 |
| 门票张数 | `4` | 数字 |
| 门票等级 | `Cat 1` | 可选 |
| 价格 | `面议` | `面议`→议价；`$350`→固定价 |
| 描述 | `Block 120…` | 备注；含 `Block 118` 会自动进座位详情 |
| 卖家联系方式 | `https://wa.me/message/…` | **支持完整 WhatsApp 链接**（你这种）或纯手机号 |

保存为例如：`data/tickets.xlsx` 或 `data/tickets.csv`。

> 一行一条 listing。若「描述」里混了多条，请拆成多行再导入。

## 2. 配置 Supabase

项目根目录 `.env.local`（已有可跳过）：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

表与 RLS 若未建过，在 Supabase SQL Editor 执行一次：[docs/supabase-ticket-wall.sql](./supabase-ticket-wall.sql)。

## 3. 生成赛程索引（首次 / 赛程更新后）

```bash
npm run export:og-matches
```

用于把「Germany vs Curaçao」对应到 `Match 25 · …`。

## 4. 试跑（不写库）

```bash
node scripts/import-ticket-wall-supabase.mjs ./data/tickets.xlsx --dry-run
```

终端会打印前 3 条解析结果和 WhatsApp 字段，确认无误再去掉 `--dry-run`。

## 5. 正式导入

```bash
node scripts/import-ticket-wall-supabase.mjs ./data/tickets.xlsx
```

成功后会提示导入条数。打开网站 **Tickets → Selling tickets** 刷新即可。

## 6. 关于 `wa.me/message/…` 链接

你表里的 `https://wa.me/message/FMP2YL6IW74UH1` 是 WhatsApp **短链接**（不是手机号）。导入后原样存在 `payload.whatsapp`，卡片上的 WhatsApp 按钮会**直接打开该链接**（已支持）。

若只有手机号，可填 `+5255512345678` 或 `5255512345678`。

## 7. 在 Supabase 里手动导入（可选）

1. Excel → **另存为 CSV (UTF-8)**
2. Supabase → **Table Editor** → `ticket_wall_posts` → **Insert** → **Import data from CSV**

CSV 列需映射到表字段；`payload` 必须是合法 JSON，手动较麻烦，**推荐用上面的脚本**自动生成 `summary` / `detail` / `payload`。

## 常见问题

| 问题 | 处理 |
|------|------|
| `42501` / policy | SQL 里给 `anon` 开 insert 策略 |
| 比赛对不上、无球场 | 检查「比赛」是否为 `Germany vs Curaçao`；跑 `export:og-matches` |
| 导入成功但网页没有 | Cloudflare 是否配了 `VITE_SUPABASE_*` 并重新部署 |
| 重复导入 | 每次生成新 `import-时间戳-行号` id；要更新同一条需改脚本或 Supabase 里改 id |
