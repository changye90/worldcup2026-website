# OKcopa 埋点数据字典 / Analytics Data Dictionary

> 表名：`public.site_analytics_events`（Supabase）  
> 写入：前端 `src/analytics.ts`，匿名 `insert` only  
> **历史事件名未改**；新事件与 `props` 字段为增量。2026-05 起自动附带来源归因（UTM + 引荐渠道）。

---

## 1. 表结构列 / Table columns

| 列名 Column | 类型 Type | 中文说明 | English |
|-------------|-----------|----------|---------|
| `id` | uuid | 事件主键 | Event primary key |
| `event` | text | 事件类型（见第 2 节） | Event name / type |
| `visitor_id` | text | 访客 ID（`localStorage`，跨会话） | Visitor ID (persistent, for **UV**) |
| `session_id` | text | 会话 ID（30 分钟无活动换新） | Session ID (30m idle timeout) |
| `path` | text | 触发时浏览器路径+查询串 | Path + query at fire time |
| `referrer` | text | 浏览器 `document.referrer`（可能为空） | HTTP Referer header |
| `props` | jsonb | 事件自定义属性 + 自动合并的归因/筛选字段 | Custom + auto-enriched JSON |
| `created_at_ms` | bigint | 客户端时间戳（毫秒） | Client timestamp (ms) |
| `created_at` | timestamptz | 服务端写入时间 | Server insert time |

---

## 2. 每条事件自动附带的 `props` / Auto-enriched props

以下字段在**所有事件**中尽可能出现（有值才写入），便于统计来源与筛选状态：

| props 键 | 中文 | English | 说明 |
|----------|------|---------|------|
| `lang` | 界面语言 | UI language | `en` / `es` / `pt` |
| `utm_source` | 本次访问来源（末次归因） | Last-touch UTM source | URL `utm_source` |
| `utm_medium` | 媒介 | Last-touch medium | `utm_medium` |
| `utm_campaign` | 活动 | Last-touch campaign | `utm_campaign` |
| `utm_content` | 素材 | Last-touch content | `utm_content` |
| `utm_term` | 关键词 | Last-touch term | `utm_term` |
| `gclid` | Google Ads 点击 ID | Google click ID | |
| `fbclid` | Facebook 点击 ID | Facebook click ID | |
| `ref_channel` | 引荐渠道分类（末次） | Classified referrer channel | 见下表 |
| `ref_host` | 引荐域名 | Referrer hostname | |
| `landing_path` | 末次落地路径 | Last landing path | |
| `ft_utm_source` | **首次** UTM 来源 | **First-touch** UTM source | 前缀 `ft_` = first touch |
| `ft_utm_medium` | 首次媒介 | First-touch medium | |
| `ft_utm_campaign` | 首次活动 | First-touch campaign | |
| `ft_utm_content` | 首次素材 | First-touch content | |
| `ft_utm_term` | 首次关键词 | First-touch term | |
| `ft_gclid` | 首次 gclid | First-touch gclid | |
| `ft_fbclid` | 首次 fbclid | First-touch fbclid | |
| `ft_ref_channel` | 首次引荐渠道 | First-touch referrer channel | |
| `ft_ref_host` | 首次引荐域名 | First-touch referrer host | |
| `ft_landing_path` | 首次落地路径 | First-touch landing path | |
| `filter_city` | 当前 URL 城市筛选 | Active URL city filter | `?city=` |
| `filter_match` | 当前 URL 场次 | Active URL match # | `?match=` |
| `filter_team` | 当前 URL 国家/球队 | Active URL team filter | `?team=` |
| `ticket_id` | 当前 URL 票务深链 | Share deep-link post id | `?ticket=` |
| `guides` | 是否在指南页 | On /guides path | boolean |

### `ref_channel` 取值 / Referrer channel values

| 值 | 中文 | English |
|----|------|---------|
| `direct` | 无 referrer | No referrer |
| `internal` | 站内 okcopa | Same site |
| `google` | Google 搜索/生态 | Google |
| `facebook` | Facebook / fb | Facebook |
| `whatsapp` | WhatsApp | WhatsApp |
| `instagram` | Instagram | Instagram |
| `twitter` | X / Twitter | X / Twitter |
| `bing` | Bing | Bing |
| `referral` | 其他外链 | Other external site |
| `unknown` | 解析失败 | Parse error |

---

## 3. 事件清单 / Event catalog

### 3.1 页面与导航 / Page & navigation

| `event` | 中文含义 | English | 主要 props（除自动字段外） |
|---------|----------|---------|---------------------------|
| `page_view` | 页面浏览（PV） | Page view | `tab`, `source`, `href`, `is_new_session` |

`page_view.source`：

| 值 | 中文 | English |
|----|------|---------|
| `load` | 首次进入或刷新后首 tab | Initial load |
| `tab` | 切换 listings Tab | Tab switch |
| `back` | 浏览器后退 | Browser back |

`page_view.tab`：`tickets` \| `cars` \| `hotels` \| `odds`

---

### 3.2 票务墙 / Ticket wall

| `event` | 中文含义 | English | 主要 props |
|---------|----------|---------|------------|
| `ticket_whatsapp_click` | 点击联系 WhatsApp | WhatsApp CTA click | `post_id`, `kind`, `is_user`, `has_wa` |
| `ticket_share_click` | 点击分享帖子 | Share listing click | `post_id`, `kind`, `is_user` |
| `ticket_deep_link_view` | 打开分享深链帖子 | Shared link opened | `post_id`, `kind` |
| `ticket_post_submit` | 提交发帖（买/卖） | Post form submitted | `kind`, `post_id`, `is_user` |
| `hero_sell_click` | Hero「我要卖票」 | Hero sell CTA | — |
| `hero_buy_click` | Hero「我要买票」 | Hero buy CTA | — |
| `hero_tab_click` | **已废弃** Hero 分类 Tab | **Legacy** hero tab | （历史数据可能有） |

---

### 3.3 筛选器 / Filters（2026-05+）

| `event` | 中文含义 | English | 主要 props |
|---------|----------|---------|------------|
| `filter_schedule_open` | 展开赛程筛选面板 | Open schedule filter | — |
| `filter_cities_open` | 展开主办城市面板 | Open cities filter | — |
| `filter_nation_open` | 展开国家/球队面板 | Open nation filter | — |
| `schedule_date_click` | 点击赛程日期 | Schedule day pill | `date`, `match_count` |
| `schedule_match_click` | 点击某场比赛筛选票务 | Match filter click | `match_id`, `match_number`, `city`, `date`, `action` |
| `filter_city_click` | 点击主办城市 | Host city filter | `city`, `action`, `high_demand` |
| `filter_nation_click` | 选择/取消国家球队 | Nation filter | `nation`, `action`, `match_count` |
| `filter_clear_click` | 清除全部列表筛选 | Clear all filters | `had_city`, `had_match`, `had_team` |

`action`：`select` \| `clear`

---

### 3.4 列表 Tab 与其它 / Listings & misc

| `event` | 中文含义 | English | 主要 props |
|---------|----------|---------|------------|
| `listings_tab_click` | 切换 Tickets/Cars/Hotels/Odds | Listings tab | `tab` |
| `listing_expand_click` | 租车/酒店「加载全部」 | Load full grid | `tab`, `total` |
| `header_schedule_click` | 顶栏跳转赛程 | Header schedule | — |
| `header_lang_open` | 打开语言菜单 | Language menu open | `lang` |
| `header_lang_select` | 切换语言 | Language change | `lang`, `from` |
| `car_call_click` | 租车电话联系 | Car phone CTA | `car_id`, `city`, `has_phone` |
| `hotel_call_click` | 酒店电话联系 | Hotel phone CTA | `rental_id`, `city`, `has_phone` |

---

## 4. 常用 SQL 示例 / Example queries

```sql
-- 今日 PV
select count(*) from site_analytics_events
where event = 'page_view'
  and created_at_ms > extract(epoch from (now() - interval '1 day')) * 1000;

-- 今日 UV（按 visitor_id）
select count(distinct visitor_id) from site_analytics_events
where event = 'page_view'
  and created_at_ms > extract(epoch from (now() - interval '1 day')) * 1000;

-- 来源：末次 UTM（page_view）
select props->>'utm_source' as source, props->>'utm_medium' as medium, count(*) as pv
from site_analytics_events
where event = 'page_view' and created_at_ms > ...
group by 1, 2 order by pv desc;

-- 来源：首次归因（任意事件）
select props->>'ft_ref_channel' as ft_channel, count(distinct visitor_id) as uv
from site_analytics_events
where created_at_ms > ...
group by 1 order by uv desc;

-- 票务 WhatsApp 转化
select count(*) from site_analytics_events
where event = 'ticket_whatsapp_click' and created_at_ms > ...;

-- 国家筛选使用率
select props->>'nation' as nation, count(*) as clicks
from site_analytics_events
where event = 'filter_nation_click' and props->>'action' = 'select'
group by 1 order by clicks desc;
```

---

## 5. 给分析 AI 的扁平导出建议 / Flat export for analysts

导出 CSV 时可拆成列：

1. 表字段：`id, event, visitor_id, session_id, path, referrer, created_at_ms, created_at`
2. 从 `props` 展开常用键：`lang, tab, source, utm_source, utm_medium, utm_campaign, ft_utm_source, ft_ref_channel, ref_channel, filter_city, filter_match, filter_team, ticket_id, post_id, city, nation, action`

PostgreSQL 示例：

```sql
select
  id, event, visitor_id, session_id, path, referrer, created_at_ms,
  props->>'lang' as lang,
  props->>'tab' as tab,
  props->>'utm_source' as utm_source,
  props->>'ft_utm_source' as ft_utm_source,
  props->>'ref_channel' as ref_channel,
  props->>'ft_ref_channel' as ft_ref_channel,
  props
from site_analytics_events
order by created_at_ms desc
limit 10000;
```

---

## 6. 兼容性说明 / Compatibility

- **不要修改**已有 `event` 字符串；新行为用新事件名或新 `props` 键。
- `hero_tab_click` 仍保留在代码常量中，Hero 已移除该 UI，但历史行可继续查询。
- 归因字段为 2026-05 增量；**旧行**无 `utm_*` / `ft_*` 为正常现象。
- 推广链接请带 UTM，例如：`https://okcopa.com/tickets?utm_source=facebook&utm_medium=group&utm_campaign=wc26`
