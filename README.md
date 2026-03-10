# 寻家 Find Home

> 让每一次看房都有迹可循

购房决策辅助工具 -- 一张可编辑的房源对比大表格，替代你看房时的 Excel 和备忘录。

## 解决什么问题

- 看了几十套房，信息散落在收藏夹、备忘录、Excel 各处，无法高效对比
- 贝壳/链家的收藏只是浏览历史，无法编辑数据、添加自己的备注
- "主卧西晒"、"房东急售可砍价"这些关键信息没地方结构化沉淀

## 核心功能

| 功能 | 说明 |
| --- | --- |
| **房源大表格** | 主界面即表格，所有房源信息一目了然，首列封面缩略图，支持排序/搜索/标签筛选 |
| **房号记录** | 记录栋数及房间号（如39-1201），独立列展示，详情页标题旁括号显示 |
| **房源链接** | 关联安居客、贝壳等平台房源链接，一键跳转查看完整信息，粘贴分享文本自动提取链接 |
| **表格内编辑** | 切换编辑模式，直接在表格里修改数据，支持自定义列，编辑按钮切换为"完成编辑"明确退出 |
| **列设置** | 拖拽排序调整列顺序，开启列自动靠前，拖拽表头边界调整列宽，隐藏内部字段（房源ID），配置自动持久化 |
| **看房记录** | 结构化备注（文字 + 照片上传），时间轴展示 |
| **多房源对比** | 勾选2-3套，一键进入对比模式，关键字段对齐，差异高亮，移动端支持多选后手动确认对比 |
| **截图识别** | 支持多张截图批量识别，AI 并行提取房源数据自动入库，后台执行不阻塞操作，悬浮按钮进度徽标，失败可重试，工具栏快捷入口（截图识别 + 手动添加）+ 空状态引导 |
| **地图定位** | 接入高德地图，通过小区名+城市自动 POI 搜索定位，城市选择器（自动检测+持久化），同小区多房源扇形展开+列表选择，坐标缓存到数据库，QPS 限流 |
| **AI分析** | 自动生成优缺点、适合人群、议价建议（待接入） |
| **封面图** | 从顶部截取展示（适配竖版截图），点击全屏查看完整图片 |
| **PWA 支持** | 可添加到手机桌面，全屏运行无地址栏，原生 App 体验 |

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Next.js 16 | 全栈框架（App Router） |
| shadcn/ui + Tailwind CSS v4 | UI 组件库 |
| Lucide React | 图标 |
| next-themes | 主题切换（亮色/暗色/极简） |
| pnpm | 包管理 |
| Vercel | 部署平台 |
| Supabase | 数据库 + 用户认证（用户名注册/登录）+ 图片存储 |
| AI 多模态模型 | 截图识别提取房源数据（兼容 OpenAI 格式接口，可切换供应商） |
| 高德地图 JS API | 房源地图定位与展示（POI 搜索、标注、信息窗口） |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

### Supabase 配置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中执行 `supabase/schema.sql` 建表
3. 在项目根目录创建 `.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### AI 截图识别配置

在 `.env.local` 中追加（兼容 OpenAI 格式的任意供应商，切换只需改这三行）：

```
AI_BASE_URL=https://api.siliconflow.cn/v1
AI_API_KEY=your-api-key
AI_MODEL=Qwen/Qwen2.5-VL-72B-Instruct
```

### 高德地图配置

在 `.env.local` 中追加（[高德开放平台](https://lbs.amap.com/) 注册申请 Web端 JS API Key）：

```
NEXT_PUBLIC_AMAP_KEY=your-amap-key
NEXT_PUBLIC_AMAP_SECRET=your-amap-secret
```

新用户注册后会自动生成 6 条示例房源（带封面图和 `is_demo` 标记），可在界面中一键清除，不影响用户自建数据。示例图片存放在 `public/demo/` 下，随项目部署，不占 Supabase Storage。

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/xiaoboan/findhome.git
cd findhome

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

### 部署

推送到 GitHub 后，Vercel 自动构建部署。

## 项目结构

```
findhome/
├── app/                        # 页面
│   ├── api/parse-screenshot/   # AI 截图识别 API Route
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 主页面
│   └── globals.css             # 全局样式
├── components/
│   ├── find-home/              # 业务组件
│   │   ├── login-page.tsx     # 登录/注册页
│   │   ├── header.tsx          # 顶部导航
│   │   ├── property-table.tsx  # 房源大表格
│   │   ├── property-detail.tsx # 详情面板
│   │   ├── property-compare.tsx# 对比面板
│   │   ├── property-map.tsx   # 地图视图（高德地图）
│   │   └── floating-action-button.tsx  # 悬浮按钮（手动添加/截图识别）
│   └── ui/                     # shadcn/ui 组件
├── lib/
│   ├── ai.ts                  # AI 截图识别（前端调用）
│   ├── amap.ts                # 高德地图加载与 POI 搜索
│   ├── supabase.ts            # Supabase 客户端
│   ├── storage.ts             # 图片上传/删除（Supabase Storage）
│   ├── db-transforms.ts       # 数据库字段映射
│   └── utils.ts
├── types/
│   └── property.ts             # 类型定义
├── hooks/
│   └── use-properties.ts       # 房源数据 Hook
└── supabase/
    └── schema.sql              # 数据库建表 SQL
```

## 开发计划

- [x] 产品规划 & 技术方案
- [x] 前端 MVP（表格 + 编辑 + 对比 + 详情）
- [x] 接入 Supabase 数据库，数据持久化
- [x] 用户认证（Supabase Auth 用户名+密码登录）
- [x] 注册自动生成示例数据，支持一键清除
- [ ] AI 对比分析（Vercel AI SDK + OpenAI）
- [x] 截图识别自动录入房源（AI 多模态模型）
- [x] 图片上传（Supabase Storage）
- [x] 移动端适配（手机竖屏全屏详情/对比弹窗、响应式表头）
- [x] 地图定位（高德地图 POI 搜索，坐标缓存）
- [x] PWA 支持（添加到桌面，全屏运行）
- [ ] 导出 Excel/PDF

## License

MIT
