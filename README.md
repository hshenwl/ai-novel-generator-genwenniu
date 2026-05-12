# 耕文牛 — AI小说生成软件

> 🐂 **耕文牛**：一款本地优先、云端兼容的 AI 小说工业化创作平台，让每个人都能像专业作家一样创作长篇小说。

---

## 📖 项目简介

耕文牛（原 ai-novel-studio）是一款基于 AI 的长篇小说创作生产力工具，采用**七步专业创作引擎**，从世界观规划到正文生成、审核修订、最终定稿，全流程覆盖。支持 Windows 10+ 本地部署，数据完全存储在本地，无需担心隐私泄露。

---欢迎加入QQ交流群：857756751，共同交流完善软件

## ✨ 核心特性

### 🔄 七步专业创作引擎

```
Planner（规划）→ Writer（写作）→ DeepReader（深度阅读）→ DeepEditor（深度编辑）→ Auditor（审核）→ Reviser（修订）→ Settler（定稿）
```

每个环节由独立的 AI Agent 负责，设有 120 秒超时保护和自动重试机制，支持状态机条件路由和反馈累积传播。

### 📚 知识库双模式检索

- **SQLite FTS5 全文检索** — 轻量级，零额外依赖，适合本地使用
- **Ollama 向量检索** — 语义理解更强，支持本地嵌入模型

内置 1100+ 篇写作教程、技法、案例拆解等专业知识，覆盖概念、人物描写、世界观设定、剧情素材等多个维度。

### 🤖 多模型 AI 网关

支持多 Provider 降级链，当主模型不可用时自动切换备选模型：

- **OpenAI 兼容接口** — GPT-4o、GPT-3.5 等
- **Anthropic Claude** — Claude 3 Opus / Sonnet / Haiku
- **DeepSeek** — DeepSeek Chat / Coder
- **Gemini (Google)** — Gemini Pro / Exp
- **通义千问 / 智谱 GLM / 文心一言** — 国产大模型
- **Ollama (本地)** — 零成本离线推理

### 📋 完整的创作管理

| 功能模块 | 说明 |
|---------|------|
| 项目管理 | 创建和管理多个小说项目 |
| 大纲管理 | 世界观、主线、支线规划 |
| 卷管理 | 分卷结构管理 |
| 章节大纲 | 细粒度章节规划 |
| 角色管理 | 角色档案、关系网络、状态追踪 |
| 组织/势力 | 世界观中的组织和势力体系 |
| 世界观设定 | 地图、规则、设定集 |
| 伏笔管理 | 伏笔埋设与回收追踪 |
| 钩子/悬念 | 章末钩子设计 |
| 写作风格 | 多风格预设（番茄风、爽文风等） |
| 提示词模板 | 自定义和复用 AI 提示词 |
| 质量中心 | 综合质量评估与改进 |
| 去 AI 味 | 消除 AI 生成文本的痕迹 |
| 热榜分析 | 网文热榜趋势分析 |
| 导出 | 支持 DOCX / TXT 格式导出 |

### 🔐 安全设计

- JWT 认证 + 全局守卫
- API Key 使用 AES-256-GCM 加密存储
- JWT Secret 使用 128 字符强随机密钥
- 所有敏感配置通过环境变量管理，代码中无硬编码密钥

---

## 🛠 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite 5 + Ant Design 5 + Zustand |
| 后端 | NestJS 10 + TypeScript + Prisma ORM |
| 数据库 | SQLite (本地) → PostgreSQL (云端) |
| 任务队列 | SQLite 队列 → Redis / BullMQ |
| 文件存储 | 本地文件 → S3 / COS / OSS |
| AI 网关 | OpenAI 兼容 + Anthropic + DeepSeek + Ollama |
| 包管理 | pnpm 8 (monorepo 工作区) |
| 代码规范 | ESLint + Prettier + EditorConfig |

---

## 📁 项目结构

```
耕文牛/
├── apps/
│   ├── web/                 # 前端 React 应用 (30+ 页面)
│   ├── server/              # 后端 NestJS 应用 (29 个模块)
│   └── launcher/            # Windows 桌面启动器
├── packages/
│   ├── shared/              # 共享类型、常量、工具函数
│   ├── ai-gateway/          # AI 模型网关 (多 Provider 降级链)
│   ├── seven-step-engine/   # 七步创作引擎 (7 个 Agent)
│   ├── workflow-engine/     # 工作流引擎 (状态机 + 事件驱动)
│   ├── knowledge-base/      # 知识库系统 (FTS5 + 向量检索)
│   └── exporter/            # 导出工具 (DOCX / TXT)
├── resources/rules/         # Agent 规则文件 (8 个)
├── knowledge/               # 内置知识库 (1100+ 文件)
├── api/                     # 本地 AI 服务代理 (Flask)
├── deploy/local-win/        # Windows 部署脚本
├── scripts/                 # 构建工具脚本
└── docs/                    # 文档
```

---

## 🚀 快速开始

### 系统要求

- **操作系统**：Windows 10 或更高版本（64 位）
- **Node.js**：18.0 或更高版本
- **内存**：4GB 以上（推荐 8GB）
- **磁盘**：2GB 以上可用空间

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/gengwen-niu.git
cd gengwen-niu

# 2. 安装 pnpm（如未安装）
npm install -g pnpm

# 3. 安装依赖
pnpm install

# 4. 配置环境变量
#    复制 .env.example 为 .env，并生成强随机密钥：
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
#    将输出的密钥分别填入 JWT_SECRET 和 APP_SECRET

# 5. 生成数据库模型并同步结构
pnpm db:generate
pnpm db:push

# 6. 启动开发服务器
pnpm dev
```

启动后访问：
- **前端界面**：http://localhost:5173
- **后端 API**：http://127.0.0.1:18765
- **API 文档**：http://127.0.0.1:18765/api/docs

### 生产构建

```bash
# 构建所有模块
pnpm build

# 一键构建 Windows 发布包
deploy\local-win\build.bat

# 打包为安装程序
node scripts\package-installer.js
```

---

## ⚙️ 配置说明

### 环境变量 (.env)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APP_MODE` | 运行模式：local / cloud | `local` |
| `PORT` | 服务端口 | `18765` |
| `DATABASE_URL` | 数据库连接 | `file:./data/novel.db` |
| `JWT_SECRET` | JWT 签名密钥（必须替换） | `replace-with-strong-random-secret` |
| `APP_SECRET` | 应用加密密钥（必须替换） | `replace-with-strong-random-app-secret` |
| `KNOWLEDGE_PATH` | 知识库路径 | `./knowledge` |
| `KNOWLEDGE_RETRIEVAL_MODE` | 检索模式：fts / vector | `fts` |
| `OPENAI_API_KEY` | OpenAI API Key（可选） | 空 |
| `ANTHROPIC_API_KEY` | Anthropic API Key（可选） | 空 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（可选） | 空 |

### AI 模型配置

启动后在 **系统设置** 页面中配置 AI 模型：

1. 点击「新增模型」
2. 选择提供商（OpenAI / DeepSeek / Claude / Gemini / Ollama 等）
3. 填入模型 ID 和 API Key
4. 可设置默认模型，支持多模型切换

本地 Ollama 用户可直接使用，无需 API Key。

---

## 📊 数据库

使用 Prisma ORM + SQLite，包含 **29 张数据表**：

- `Project` — 项目
- `Outline` — 大纲
- `Volume` — 卷
- `ChapterOutline` — 章节大纲
- `Chapter` — 章节正文
- `Character` — 角色
- `CharacterRelationship` — 角色关系
- `Organization` — 组织/势力
- `WorldSetting` — 世界观设定
- `Foreshadow` — 伏笔
- `Hook` — 钩子/悬念
- `WritingStyle` — 写作风格
- `PromptTemplate` — 提示词模板
- `AgentRule` — Agent 规则
- `ModelConfig` — AI 模型配置
- `AuditReport` — 审核报告
- `RevisionRecord` — 修订记录
- `Workflow` — 工作流
- `Task` — 异步任务
- `KnowledgeFile` — 知识库文件
- `User` — 用户
- ... 等

启用 WAL 模式优化并发读写性能。

---

## 🏗 架构设计

### 工作流引擎

- **自定义状态机** + 事件驱动架构
- **并发限制器**：最多同时运行 5 个工作流
- **实例清理**：1 小时自动过期
- **重试策略**：每步 2 次重试，指数退避

### AI Gateway 降级链

```
指定模型 → 其他注册模型 → Flask 本地服务 → Ollama
```

429 限流时快速失败，自动切换到下一个可用模型。

### 知识库系统

- FTS5 虚拟表存储相对路径
- `knowledge_files` 表存储绝对路径
- 搜索时从 FTS5 获取结果，通过 `filename` + `category` 反查
- 中文搜索使用 `unicode61` tokenizer
- 降级方案：`LIKE` + `substr` 截取片段

---

## 🔧 开发命令

```bash
pnpm dev              # 启动开发服务器（前后端并行）
pnpm build            # 构建所有模块
pnpm start:prod       # 启动生产版本
pnpm db:push          # 同步数据库结构
pnpm db:studio        # 打开 Prisma Studio (可视化数据库管理)
pnpm lint             # 代码检查
pnpm db:generate      # 生成 Prisma 客户端
pnpm db:migrate       # 数据库迁移
pnpm setup            # 一键初始化 (install + db:generate + db:push)
```

---

## 🔒 安全说明

- **所有 API 密钥已从源代码中移除**，需通过环境变量或系统设置页面配置
- `.env` 文件已被 `.gitignore` 排除，不会提交到仓库
- 首次运行前，请务必生成并配置强随机的 `JWT_SECRET` 和 `APP_SECRET`
- API Key 使用 AES-256-GCM 加密后存储在数据库中

---

## 🗺 路线图

- [x] 七步创作引擎
- [x] 知识库双模式检索
- [x] 多模型 AI 网关
- [x] 29 个业务模块
- [x] Windows 本地部署
- [ ] 云端 SaaS 版本
- [ ] 私有化部署支持
- [ ] 多用户协作
- [ ] 提示词工坊（社区共享）
- [ ] 移动端适配

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

> 🐂 **耕文牛** — 耕耘文字，牛气冲天。用 AI 解放创作力。
