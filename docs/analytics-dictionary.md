# OKcopa 埋点数据字典 / Analytics Data Dictionary

> 表：`public.site_analytics_events` · 写入：`src/analytics.ts`（匿名 insert）  
> **已有 `event` 名不改**；新能力用新事件名。下文按业务模块分组。

---

## 1. 表字段 / Table columns

| 列 | 说明 |
|----|------|
| `event` | 事件名（见 §3） |
| `visitor_id` | UV 去重 ID（`localStorage` `okcopa_vid`） |
| `session_id` | 会话 ID（30 分钟无活动换新） |
| `path` | 触发时 URL path + query |
| `referrer` | `document.referrer` |
| `props` | 业务字段 + 自动归因（§2） |
| `created_at_ms` | 客户端毫秒时间戳 |

---

## 2. 自动附带字段 / Auto-enriched props（所有事件）

| 键 | 说明 |
|----|------|
| `lang` | `en` / `es` / `pt` |
| `utm_source` … `utm_term`, `gclid`, `fbclid` | 末次 UTM |
| `ft_utm_*`, `ft_ref_channel`, `ft_landing_path` 等 | 首次归因（`ft_` 前缀） |
| `ref_channel`, `ref_host` | 末次引荐渠道（见下表） |
| `filter_city`, `filter_match`, `filter_team` | 当前 URL 筛选 |
| `ticket_id` | 路径 `/tickets/{id}` 或 `?ticket=` |
| `share_ref` | URL 带 `?ref=share` 时为 true |
| `tab_path` | 如 `/wanted` → `wanted` |
| `guides` | 在 `/guides` 时为 true |

### `ref_channel`

`direct` · `internal` · `google` · `facebook` · `whatsapp` · `instagram` · `twitter` · `bing` · `referral` · `unknown`

---

## 3. 事件目录 / Event catalog

### 3.1 页面与导航

| event | 含义 | 主要 props |
|-------|------|------------|
| `page_view` | 列表区 PV | `tab`, `source`, `href`, `is_new_session` |
| `listings_tab_click` | 切换 Tickets/Wanted/Cars/Hotels/Odds | `tab` |
| `header_schedule_click` | 顶栏赛程 | — |
| `header_lang_open` | 打开语言菜单 | `lang` |
| `header_lang_select` | 切换语言 | `lang`, `from` |
| `hero_sell_click` | Hero 卖票 | — |
| `hero_buy_click` | Hero 买票 | — |
| `listing_expand_click` | 租车/酒店加载全部 | `tab`, `total` |
| `car_call_click` | 租车电话 | `car_id`, `city`, `has_phone` |
| `hotel_call_click` | 酒店电话 | `rental_id`, `city`, `has_phone` |

`page_view.source`：`load` · `tab` · `back`  
`page_view.tab`：`tickets` · `wanted` · `cars` · `hotels` · `odds`

---

### 3.2 票务墙（列表卡片）

| event | 含义 | 主要 props |
|-------|------|------------|
| `ticket_card_click` | 点击卡片进入详情 | `post_id`, `kind`, `is_user`, `from`（`wall`） |
| `ticket_whatsapp_click` | **仅列表卡片**上点 WhatsApp | `post_id`, `kind`, `is_user`, `has_wa`, `source`=`wall`, `placement`=`card` |
| `ticket_share_click` | **仅列表卡片**上点分享 | `post_id`, `kind`, `is_user`, `source`=`wall` |
| `ticket_deep_link_view` | 打开分享深链（`?ticket=` 等） | `post_id`, `kind` |
| `ticket_post_submit` | 提交发帖 | `kind`, `post_id`, `is_user`, `platform_guarantee` |

---

### 3.3 票务详情页 `/tickets/{id}`

| event | 含义 | 主要 props |
|-------|------|------------|
| `ticket_detail_view` | 进入详情页（每次加载帖子） | `post_id`, `kind`, `entry_source`, `verified` |
| `ticket_detail_whatsapp_click` | **详情页联系卖家/买家**（主 CTA） | `post_id`, `kind`, `has_wa`, `verified` |
| `ticket_detail_share_open` | 展开底部分享区 | `post_id`, `kind` |
| `ticket_detail_share_copy` | 复制分享链接 | `post_id`, `kind`, `source?` |
| `ticket_detail_share_click` | 详情内分享操作 | `post_id`, `kind`, `action`, `channel?` |

#### `ticket_detail_view.entry_source`

| 值 | 含义 |
|----|------|
| `share_link` | URL 带 `?ref=share` |
| `internal` | 站内卡片/列表进入 |
| `referral` | 外链 referrer |
| `direct` | 直接打开详情 URL |

#### `ticket_detail_share_copy.source`

| 值 | 含义 |
|----|------|
| （缺省） | 详情分享面板 |
| `post_success_modal` | 发帖成功弹窗复制链接 |

#### `ticket_detail_share_click`

| props | 取值 |
|-------|------|
| `action` | `native_share`（系统分享）· `external`（跳转渠道） |
| `channel` | `whatsapp` · `facebook` · `x`（仅 `action=external`） |

> **注意**：详情页 WhatsApp 联系只用 `ticket_detail_whatsapp_click`，不再写入 `ticket_whatsapp_click`。

---

### 3.4 发帖与 OKcopa Verified

| event | 含义 | 主要 props |
|-------|------|------------|
| `verified_seller_register` | 完成认证卖家注册 | `seller_id` |
| `verified_seller_post` | 带平台担保发帖 | `seller_id`, `proof_count` |

---

### 3.5 账号与「我的帖子」

| event | 含义 | 主要 props |
|-------|------|------------|
| `auth_modal_open` | 打开登录/注册弹窗 | `mode`（`sign_in`/`sign_up`）, `reason`（`header`/`verified_listing`） |
| `auth_sign_in` | 登录成功 | `reason` |
| `auth_sign_up` | 注册提交成功 | `reason` |
| `auth_sign_out` | 退出 | — |
| `auth_verify_resend` | 重发验证邮件 | — |
| `account_manage_open` | 打开「我的帖子」管理 | `is_logged_in` |
| `account_manage_search` | 按 WhatsApp 查询帖子 | `is_logged_in`, `result_count` |
| `account_listing_delist` | 下架一条帖子 | `post_id`, `kind`, `is_logged_in` |

---

### 3.6 筛选器

| event | 含义 | 主要 props |
|-------|------|------------|
| `filter_schedule_open` | 展开赛程 | — |
| `filter_cities_open` | 展开城市 | — |
| `filter_nation_open` | 展开国家/球队 | — |
| `schedule_date_click` | 点赛程日期 | `date`, `match_count` |
| `schedule_match_click` | 点某场比赛 | `match_id`, `match_number`, `city`, `date`, `action` |
| `filter_city_click` | 点主办城市 | `city`, `action`, `high_demand` |
| `filter_nation_click` | 点国家/球队 | `nation`, `action`, `match_count` |
| `filter_clear_click` | 清除筛选 | `had_city`, `had_match`, `had_team` |

`action`：`select` · `clear`

---

### 3.7 已废弃 / Legacy

| event | 说明 |
|-------|------|
| `hero_tab_click` | Hero Tab 已移除，历史数据可查 |

---

## 4. 转化漏斗参考 / Funnels

```
page_view (tab=tickets)
  → ticket_card_click
  → ticket_detail_view
  → ticket_detail_whatsapp_click   ← 详情联系（单独统计）

ticket_whatsapp_click (source=wall) ← 列表直接联系（不经过详情）
```

分享：

```
ticket_detail_view
  → ticket_detail_share_open
  → ticket_detail_share_copy | ticket_detail_share_click
```

账号/认证帖：

```
auth_modal_open (reason=verified_listing)
  → auth_sign_up | auth_sign_in
  → verified_seller_register
  → verified_seller_post
```

---

## 5. 常用 SQL

```sql
-- 今日 UV / PV
select count(distinct visitor_id) from site_analytics_events
where event = 'page_view' and created_at_ms > extract(epoch from (now() - interval '1 day')) * 1000;

-- 详情页浏览与来源
select props->>'entry_source' as entry, count(*) as views
from site_analytics_events
where event = 'ticket_detail_view' and created_at_ms > ...
group by 1 order by views desc;

-- 详情联系 vs 列表联系（勿混用）
select event, count(*) from site_analytics_events
where event in ('ticket_detail_whatsapp_click', 'ticket_whatsapp_click')
  and created_at_ms > ...
group by 1;

-- 详情分享漏斗
select
  count(*) filter (where event = 'ticket_detail_view') as detail_views,
  count(*) filter (where event = 'ticket_detail_whatsapp_click') as detail_wa,
  count(*) filter (where event = 'ticket_detail_share_copy') as share_copy
from site_analytics_events
where created_at_ms > ...;

-- 我的帖子：查询与下架
select event, count(*) from site_analytics_events
where event in ('account_manage_open', 'account_manage_search', 'account_listing_delist')
  and created_at_ms > ...
group by 1;

-- 认证与担保发帖
select event, count(*) from site_analytics_events
where event in ('verified_seller_register', 'verified_seller_post', 'auth_sign_up')
  and created_at_ms > ...
group by 1;
```

---

## 6. 扁平导出建议列

`id, event, visitor_id, session_id, path, referrer, created_at_ms, lang, tab, utm_source, ft_ref_channel, ref_channel, ticket_id, post_id, kind, entry_source, verified, source, placement, channel, action, is_logged_in, result_count, platform_guarantee, reason, mode`

---

## 7. 兼容性

- 2026-05 前无 `utm_*` / 详情事件为正常现象。
- 旧数据中 `ticket_whatsapp_click` 且 `source=detail_page` 为历史实现；新数据详情联系请查 `ticket_detail_whatsapp_click`。
- 分享链接：`https://okcopa.com/tickets/{id}?ref=share`（`entry_source=share_link`）。
