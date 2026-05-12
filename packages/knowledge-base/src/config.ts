// ============================================================
// 知识库系统 - 场景推荐配置
// ============================================================

import { CreationScenario, ScenarioConfig } from './types';

// 场景推荐策略映射
export const scenarioRecommendation: Record<CreationScenario, ScenarioConfig> = {
  '世界设定': {
    directories: ['world/', 'reference/'],
    keywords: ['世界观', '设定', '力量体系', '组织', '规则', '禁忌'],
    priority: 1
  },
  '卷纲生成': {
    directories: ['techniques/', 'plots/', 'world/'],
    keywords: ['大纲', '卷纲', '剧情', '结构', '主线', '冲突'],
    priority: 1
  },
  '章纲生成': {
    directories: ['tutorials/', 'techniques/', 'plots/'],
    keywords: ['章纲', '爽点', 'Hook', '伏笔', '节奏', '情绪'],
    priority: 1
  },
  '正文生成': {
    directories: ['scenes/', 'characters/', 'tutorials/'],
    keywords: ['场景', '人物', '对白', '心理', '描写', '叙述'],
    priority: 1
  },
  '人物塑造': {
    directories: ['characters/', 'tutorials/'],
    keywords: ['人设', '性格', '动机', '弧光', '声音', '成长'],
    priority: 1
  },
  '伏笔设计': {
    directories: ['tutorials/', 'techniques/', 'plots/'],
    keywords: ['伏笔', '埋设', '回收', '铺垫', '揭示'],
    priority: 1
  },
  '爽点设计': {
    directories: ['operations/', 'plots/', 'reference/'],
    keywords: ['爽点', '打脸', '升级', '奖励', '反转', '复仇'],
    priority: 1
  },
  'AI去味': {
    directories: ['tutorials/', 'characters/', 'reference/'],
    keywords: ['AI痕迹', '总结腔', '对白', '叙事', '去味'],
    priority: 1
  },
  '审核': {
    directories: ['reference/', 'tutorials/', 'techniques/'],
    keywords: ['质量', '连贯性', '人设', '逻辑', '审核'],
    priority: 1
  }
};

// 知识库目录分类
export const knowledgeCategories = {
  tutorials: {
    path: 'tutorials/',
    name: '写作教程',
    description: '叙述技巧、节奏控制、伏笔技法、心理描写、对白技巧、场景构建',
    files: 6
  },
  techniques: {
    path: 'techniques/',
    name: '技法与大纲',
    description: '大纲结构、卷纲规划、章纲设计、爽点设计、Hook设置、人物弧光',
    files: 6
  },
  plots: {
    path: 'plots/',
    name: '剧情参考资料',
    description: '都市脑洞、玄幻升级、修仙、悬疑、末世、系统文剧情库',
    files: 7
  },
  characters: {
    path: 'characters/',
    name: '人物描写素材',
    description: '主角人设模板、配角人设模板、反派人设模板、人物关系模板',
    files: 4
  },
  world: {
    path: 'world/',
    name: '世界观与设定',
    description: '都市/玄幻/修仙/末世世界观、力量体系、组织设定、职业等级、金手指、禁忌设定',
    files: 9
  },
  scenes: {
    path: 'scenes/',
    name: '场景写法',
    description: '场景描写技巧',
    files: 1
  },
  reference: {
    path: 'reference/',
    name: '阅读与拆解',
    description: '番茄风特点、起点风特点、爽文结构、追读技巧等',
    files: 12
  },
  operations: {
    path: 'operations/',
    name: '运营与文案',
    description: '热榜分析、标题优化、简介优化等',
    files: 15
  },
  concepts: {
    path: 'concepts/',
    name: '核心概念',
    description: '各类小说创作的核心概念与理论',
    files: 510
  },
  entities: {
    path: 'entities/',
    name: '实体资源',
    description: '小说创作实体资源与模板',
    files: 15
  },
  case_studies: {
    path: 'case_studies/',
    name: '案例分析',
    description: '成功小说案例分析与拆解',
    files: 14
  }
};

// Agent步骤对应的知识库读取策略
export const agentKnowledgeStrategy = {
  planner: {
    primary: ['tutorials/', 'techniques/', 'world/'],
    secondary: ['reference/', 'operations/'],
    maxFiles: 5,
    maxTokens: 4000
  },
  writer: {
    primary: ['scenes/', 'characters/', 'tutorials/'],
    secondary: ['plots/'],
    maxFiles: 3,
    maxTokens: 3000
  },
  deepReader: {
    primary: ['reference/', 'tutorials/'],
    secondary: ['characters/'],
    maxFiles: 2,
    maxTokens: 2000
  },
  deepEditor: {
    primary: ['operations/', 'reference/', 'techniques/'],
    secondary: ['tutorials/'],
    maxFiles: 3,
    maxTokens: 2000
  },
  auditor: {
    primary: ['tutorials/', 'techniques/'],
    secondary: ['reference/'],
    maxFiles: 2,
    maxTokens: 2000
  },
  reviser: {
    primary: ['tutorials/', 'characters/'],
    secondary: ['reference/'],
    maxFiles: 3,
    maxTokens: 2000
  },
  settler: {
    primary: [],
    secondary: [],
    maxFiles: 0,
    maxTokens: 0
  }
};
