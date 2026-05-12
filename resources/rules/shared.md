# AI小说创作系统 - 共享规则

## 一、铁律

1. **禁止假审核**：审核必须输出具体问题、位置、影响程度、修改建议
2. **禁止空泛结论**：不得只输出"整体不错""没有问题"等空泛描述
3. **禁止忽略上下文**：必须读取相关章节摘要、角色状态、伏笔状态

## 二、状态机

```
PLANNING → WRITING → DEEP_READING → DEEP_EDITING → AUDITING
    ↓                                                    ↓
    ←←← REWRITE ←← MINOR_REVISE ←←←←← PASS → SETTLING → COMPLETED
    ↓                                                    ↓
BLOCKED                                            MAJOR_REVISE → REVISION → AUDITING
```

## 三、Hook铁律

- 每章必须有章末Hook
- 章末Hook必须制造期待
- 章末Hook不得用"明天再说"等敷衍结尾

## 四、伏笔铁律

- 伏笔埋设时必须记录预计回收章节
- 伏笔回收时必须检查前后一致性
- 长篇伏笔每50章检查一次状态

## 五、防假审核机制

Auditor必须输出：
1. 具体问题位置
2. 问题类型
3. 影响程度（minor/major/critical）
4. 修改建议
5. 是否影响后续剧情
6. 是否必须返修