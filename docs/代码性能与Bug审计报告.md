# AI小说创作系统 — 代码性能瓶颈与潜在Bug审计报告

> 基于对 30+ 源文件的全面审查
> 审计日期：2026-05-05

---

## 🔴 严重问题（可能导致崩溃、数据丢失或安全漏洞）

### 1. [安全] JWT Secret 硬编码默认值

**文件：** `apps/server/src/modules/auth/auth.module.ts:15`
```typescript
secret: process.env.JWT_SECRET || 'REPLACE-IN-PRODUCTION',
```

**问题：** 当 `JWT_SECRET` 环境变量未设置时，回退到公开字符串 `'REPLACE-IN-PRODUCTION'`。任何人都可以用这个已知secret伪造JWT Token，完全绕过认证。

**严重性：** 🔴 严重安全漏洞

**修复：** 加载时检查，如果环境变量未设置且无合法 secret，应直接抛出错误阻止启动，而不是使用默认值。

---

### 2. [Bug] 七步引擎反馈传播断裂

**文件：** `packages/seven-step-engine/src/agents/index.ts:117`

```typescript
// 3. 深度读者检查（可选）
if (!options?.skipDeepReader) {
  currentInput.step = 'deep_reading';
  output = await this.deepReader.execute(currentInput);
  currentInput.previousOutput = currentInput.previousOutput; // ← 空操作！
  currentInput.feedback = output.content;
}

// 4. 深度编辑检查（可选）
if (!options?.skipDeepEditor) {
  currentInput.step = 'deep_editing';
  output = await this.deepEditor.execute(currentInput);
  currentInput.feedback = output.content; // ← 覆盖了 DeepReader 的反馈！
}
```

**问题：** 
- `currentInput.previousOutput = currentInput.previousOutput` 是空操作，没有意义
- DeepReader 的反馈被 DeepEditor 的输出完全覆盖（第126行）
- Auditor 的输出又覆盖了第159行的 feedback
- 最终 Reviser 只看到 Auditor 的反馈，丢失了 DeepReader 和 DeepEditor 的意见

**严重性：** 🔴 逻辑Bug — DeepReader 和 DeepEditor 功能形同虚设

**修复：** feedback 应该设计为累积制（如数组），而不是单值覆盖。

---

### 3. [Bug] 状态机备用转换逻辑错误

**文件：** `packages/workflow-engine/src/state-machine.ts:118-124`

```typescript
// 检查条件
if (transition.condition && !transition.condition(this.context)) {
  // 查找备用转换
  const alternative = stateTransitions.find(
    t => t.from === this.currentState && t.action === action && t.condition?.(this.context)
  );
  return alternative?.to || null;
}
```

**问题：** "备用转换" 查找逻辑是错的。它在找 **同一个 from+action** 但条件满足的转换——但同一个 (from, action) 组合在转换表中只有一条记录，所以永远是同一个 transition。当条件不满足时，应该返回 null 或抛出错误，而不是幻想有一条不同的记录。

实际上，审计分支（audit_done→settling/revising/writing/planning）使用的是 **相同 action (auditing_complete) + 不同条件** 的机制。但这套逻辑却写成：先匹配第一条（无条件），条件不满足→找另一条→另一个条件也不满足→返回 null。所以实际效果是：**审计完成后状态机永远无法正确转换到下一个状态**。

**严重性：** 🔴 工作流引擎核心逻辑Bug — 审核完成后无法正确进入下一阶段

**修复：** `getNextState` 应先匹配 from+action，再去掉 condition 过滤，检查 condition 是否满足。

---

### 4. [性能] 所有列表查询缺少分页

**涉及文件（14处 findMany 均无 `take/skip`）：**

| 文件 | 查询内容 | 风险 |
|------|---------|------|
| `apps/server/src/modules/chapter/chapter.service.ts:9` | 按卷查章节 | 100章项目正常，但100卷×100章=1万条？ |
| `apps/server/src/modules/chapter-outline/chapter-outline.service.ts:9` | 按卷查章纲 | 同上 |
| `apps/server/src/modules/character/character.service.ts:11` | 查项目角色 | 角色过多时 |
| `apps/server/src/modules/foreshadow/foreshadow.service.ts:11` | 查伏笔 | 百万字小说可能有上百个伏笔 |
| `apps/server/src/modules/hook/hook.service.ts:12` | 查Hook | 同上 |
| `apps/server/src/modules/organization/organization.service.ts:9` | 查组织 | 较少 |
| `apps/server/src/modules/volume/volume.service.ts:9` | 查卷 | 卷数不多 |
| `apps/server/src/modules/workflow/workflow.service.ts:10` | 查工作流 | 批量生成时可能有上千条 |
| `apps/server/src/modules/task/task.service.ts:12` | 查任务 | 后台任务可能堆积 |

**唯一有分页的：** `project.service.ts`（使用 `page/pageSize/take/skip`）

**严重性：** 🔴 严重性能问题 — 随着数据量增长，所有列表查询都会变慢

**修复：** 所有 findMany 增加 `take` 参数，并在 Controller 层增加分页参数。

---

### 5. [内存泄漏] AI Gateway 内存中存储完整调用记录

**文件：** `packages/ai-gateway/src/gateway.ts:22-23, 113-133`

```typescript
private callRecords: CallRecord[] = [];
private maxRecords: number = 1000;
```

每次 AI 调用都在内存中存储完整的 `messages` 内容（包括完整的小说正文！）。对于长篇小说生成，一次工作流就要调用 7 次 AI，一次调用可能携带几千字的上下文。1000 条记录意味着：
- 约 140 次完整七步流程的 AI 调用
- 每条记录包含完整的 prompt 和 response（小说正文）
- 可能消耗 **几百 MB 内存**

**严重性：** 🔴 内存泄漏风险 — 长期运行的服务可能 OOM

**修复：** 
1. 存储时裁剪 messages 正文内容（只保留摘要或元数据）
2. 存入数据库而非内存
3. 或者在大于一定阈值时降级为只存 token 统计

---

### 6. [安全] AI Gateway 全局单例冲突

**文件：** 
- `packages/ai-gateway/src/gateway.ts:308` — 导出全局单例 `aiGateway`
- `apps/server/src/modules/engine/engine.service.ts:27` — `new AIGateway()` 创建另一个实例

**问题：** 存在两个 AIGateway 实例。`EngineService` 在启动时创建并配置了自己的实例，但全局单例 `aiGateway` 无人使用。如果有人误 import 了单例，将得到一个无任何模型注册的空实例，导致 "Provider not registered" 错误。

**严重性：** 🟡 潜在Bug — 导入混淆导致运行时错误

---

## 🟡 严重性能问题

### 7. [前端] Workflow 页面 5 秒轮询无可见性检测

**文件：** `apps/web/src/pages/Workflow.tsx:88-96`

```typescript
pollingRef.current = setInterval(() => {
  fetchWorkflows();
}, 5000);
```

**问题：** 即使用户切换到其他标签页或最小化窗口，轮询依然继续。长时间打开的 Workflow 页面会持续发送 API 请求。

**修复：** 使用 `document.visibilitychange` 事件暂停/恢复轮询，或使用 `Page Visibility API`。

---

### 8. [性能] AI Gateway 全量内存统计循环

**文件：** `packages/ai-gateway/src/gateway.ts:229-273`

`getStats()` 方法遍历整个 `callRecords` 数组来计算统计。当记录达到 1000 条时，每次调用都 O(1000) 的遍历。更关键的是这个方法可能被频繁调用（EngineController 的 `/api/engine/stats` 端点）。

**修复：** 增量更新统计缓存，而不是每次全量遍历。

---

### 9. [前端] Dashboard 两个独立 API 请求无聚合

**文件：** `apps/web/src/pages/Dashboard.tsx:53-59`

```typescript
Promise.all([
  api.get('/projects/stats').catch(() => null),
  api.get('/projects').catch(() => null),
])
```

**问题：** Dashboard 加载需要等两个请求都完成才渲染。`stats` 和 `projects` 可以分别渲染。

**修复：** 使用 `Suspense` 或者分步渲染（先展示 stats 卡片再渲染项目列表）。

---

### 10. [性能] 知识库向量搜索全量加载

**文件：**（推断，需确认）`packages/knowledge-base/src/`

如果向量搜索实现为每次查询时全量加载所有嵌入并计算余弦相似度（而非使用向量索引），将导致 O(n) 的内存和计算开销。

---

## ⚠️ 潜在 Bug 和代码异味

### 11. [Bug] 前端 API 响应拦截器丢数据

**文件：** `apps/web/src/services/api.ts:26`

```typescript
(response) => response.data,
```

**问题：** Axios 拦截器直接返回 `response.data`。当后端 API 返回 `{ items: [...], total: ... }` 这样的包裹结构时，前端代码直接拿到了 `data` 对象。但有的页面期望直接是数组（如 `Character.tsx:18` 的 `r?.items || []`），说明不同 API 的返回结构不一致。如果后端统一改为返回包裹结构，前端会全部报错。

**修复：** 统一后端返回值结构，或在前端保持一致的展开逻辑。

---

### 12. [Bug] WorldSetting 表单字段超过 Prisma 模型

**文件：** `apps/web/src/pages/WorldSetting.tsx`

表单包含 `genre`、`perspective`、`description`、`coolDirections`、`hookDirections`、`customRequirements` 等字段，但 Prisma `WorldSetting` 模型中没有这些字段。后端 `world-setting.service.ts` 用 `...data` 展开保存，Prisma 会静默忽略这些字段。**用户填了但保存不了。**

**修复：** 移除表单中不在 Prisma 模型中的字段，或扩展 Prisma 模型。

---

### 13. [Bug] ChapterEditor 发送的上下文包含未定义变量

**文件：** `apps/web/src/pages/ChapterEditor.tsx:137-148`

```typescript
if (outline) {
  payload.context.characters = (outline.characters || '').split(/[,，、\s]+/).filter(Boolean);
  payload.context.chapterOutline = outline.summary;
  payload.context.chapterOutlineDetail = JSON.stringify(outline);
}
```

当 outline 为 null 时，`payload.context.genre`、`payload.context.perspective` 等字段使用 `values.xxx`，但这些值是从弹窗表单读取的——如果用户没有打开过设置弹窗就点生成，form.validateFields() 会获取默认值，但 form 的初始值只存在于弹窗打开后。**潜在的空值Bug。**

---

### 14. [Bug] 工作流引擎 `resume()` 未实现断点续跑

**文件：** `packages/workflow-engine/src/executor.ts:248-272`

```typescript
async resume(instanceId: string): Promise<WorkflowInstance> {
  // 从最后一个成功的步骤继续
  const lastSuccessfulStep = ...;
  instance.status = lastSuccessfulStep?.step as WorkflowState || 'pending';
  // TODO: 实现断点续跑逻辑
  return instance;
}
```

`resume()` 标记了状态但实际没有继续执行。用户点了"恢复"按钮看到状态变了，但工作流并不会真正继续生成。

**严重性：** 🟡 功能未完整实现 — 恢复后续步骤未执行

---

### 15. [Bug] 审核循环缺少超时保护

**文件：** `packages/seven-step-engine/src/agents/index.ts:130-165`

`maxRevisionRounds` 限制了修订循环次数，但每次 `auditor.execute()` 和 `reviser.execute()` 没有独立超时控制。如果其中一个 Agent 的 AI 调用长时间挂起，整个工作流会卡住。

**修复：** 每个 `agent.execute()` 调用增加超时包装器。

---

### 16. [前端] 各页面缺少 Loading Error 状态区分

当前模式的统一处理：
```typescript
.catch(() => message.error('加载失败'))
```

用户在"加载失败"时只知道出了问题，但不知道是网络错误、服务器错误还是数据为空。正确做法是区分：
- `loading` — 加载中（展示 Skeleton）
- `error` — 报错（展示错误详情 + 重试按钮）
- `empty` — 无数据（展示空状态 + 创建引导）
- `data` — 正常渲染

---

### 17. [Bug] 章节编辑器路由未完全连通

**文件：** `apps/web/src/App.tsx:44`
```typescript
<Route path="/projects/:id/chapters/editor" element={<ChapterEditor />} />
```

Chapters 列表页中"编辑"链接跳转到 `/projects/${id}/chapters/${r.id}/edit`，但路由是 `/projects/:id/chapters/editor`，**路径不匹配**，导致编辑按钮实际不可用。

---

### 18. [安全] 认证模块缺少注册功能

**文件：** `apps/web/src/pages/Login.tsx`

前端只有登录表单没有注册表单。后端 auth controller 是否支持注册？如果是纯本地系统，可能通过初始管理员账号方式创建。如果是这样，**新用户无法自行注册**，这可能是设计约束，但也可能是缺失功能。

---

## 📊 总结与优先级

| 优先级 | 类别 | 数量 | 关键项 |
|--------|------|------|--------|
| 🔴 紧急 | 安全漏洞 | 2 | JWT硬编码、API Key内存存储 |
| 🔴 紧急 | Bug | 4 | 反馈传播断裂、状态机逻辑错、断点续跑、路由不匹配 |
| 🔴 紧急 | 性能 | 2 | 全部分页缺失、内存记录膨胀 |
| 🟡 重要 | 性能 | 3 | 无轮询优化、无增量统计、全量向量搜索 |
| 🟡 重要 | 代码质量 | 4 | 表单字段越界、错误处理粗糙、依赖混乱 |
| ⚠️ 建议 | 代码异味 | 3 | 未使用导入/变量、注释占位、空操作赋值 |

### 最优先修复的 5 项

1. **🔴 JWT Secret 安全漏洞** — 启动时校验，缺失则抛错
2. **🔴 反馈传播断裂** — feedback 改为累积数组
3. **🔴 状态机备用转换逻辑** — 重写 `getNextState` 的条件判断
4. **🟡 列表查询无分页** — 所有 findMany 增加 take/skip
5. **🔴 AI Gateway 内存记录膨胀** — 将 callRecords 写入数据库或裁剪存储内容
