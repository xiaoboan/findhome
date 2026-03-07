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
| **房源大表格** | 主界面即表格，所有房源信息一目了然，支持排序/搜索/标签筛选 |
| **表格内编辑** | 切换编辑模式，直接在表格里修改数据，支持自定义列 |
| **看房记录** | 结构化备注（分类标签 + 文字 + 照片），时间轴展示 |
| **多房源对比** | 勾选2-3套，一键进入对比模式，关键字段对齐，差异高亮 |
| **AI分析** | 自动生成优缺点、适合人群、议价建议（待接入） |

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Next.js 16 | 全栈框架（App Router） |
| shadcn/ui + Tailwind CSS v4 | UI 组件库 |
| Lucide React | 图标 |
| next-themes | 主题切换（亮色/暗色/极简） |
| pnpm | 包管理 |
| Vercel | 部署平台 |
| Supabase（待接入） | 数据库 + 用户认证 |
| Vercel AI SDK（待接入） | AI 对比分析 |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

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
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 主页面
│   └── globals.css             # 全局样式
├── components/
│   ├── find-home/              # 业务组件
│   │   ├── header.tsx          # 顶部导航
│   │   ├── property-table.tsx  # 房源大表格
│   │   ├── property-detail.tsx # 详情面板
│   │   ├── property-compare.tsx# 对比面板
│   │   └── floating-action-button.tsx
│   └── ui/                     # shadcn/ui 组件
├── lib/
│   ├── mock-data.ts            # 示例数据
│   └── utils.ts
├── types/
│   └── property.ts             # 类型定义
└── hooks/                      # 自定义 Hooks
```

## 开发计划

- [x] 产品规划 & 技术方案
- [x] 前端 MVP（表格 + 编辑 + 对比 + 详情）
- [ ] 接入 Supabase 数据库，数据持久化
- [ ] 用户认证（Supabase Auth）
- [ ] AI 对比分析（Vercel AI SDK + OpenAI）
- [ ] 图片上传（Supabase Storage）
- [ ] 导出 Excel/PDF
- [ ] 移动端适配优化

## License

MIT
