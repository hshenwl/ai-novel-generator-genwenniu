"use strict";
// ============================================================
// AI小说创作系统 - 核心常量定义
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION = exports.UPLOAD_CONFIG = exports.KNOWLEDGE_CATEGORIES = exports.AI_PROVIDERS = exports.AI_DE_FLAVOR_MODES = exports.FORESHADOW_TYPES = exports.HOOK_TYPES = exports.CHARACTER_ROLES = exports.NARRATIVE_PERSPECTIVES = exports.NOVEL_GENRES = exports.AUDIT_DIMENSIONS = exports.AUDIT_RESULTS = exports.SEVEN_STEP_AGENTS = exports.WORKFLOW_STEPS = exports.DEFAULT_PORT = exports.APP_VERSION = exports.APP_NAME = void 0;
// 应用配置
exports.APP_NAME = 'AI小说创作系统';
exports.APP_VERSION = '0.1.0';
exports.DEFAULT_PORT = 18765;
// 工作流步骤
exports.WORKFLOW_STEPS = {
    PLANNING: 'planning',
    PLANNED: 'planned',
    WRITING: 'writing',
    WRITTEN: 'written',
    DEEP_READING: 'deep_reading',
    DEEP_READ_DONE: 'deep_read_done',
    DEEP_EDITING: 'deep_editing',
    DEEP_EDIT_DONE: 'deep_edit_done',
    AUDITING: 'auditing',
    AUDIT_DONE: 'audit_done',
    REVISION: 'revision',
    REVISED: 'revised',
    SETTLING: 'settling',
    COMPLETED: 'completed',
};
// 七步创作引擎步骤名称
exports.SEVEN_STEP_AGENTS = {
    PLANNER: 'Planner',
    WRITER: 'Writer',
    DEEP_READER: 'DeepReader',
    DEEP_EDITOR: 'DeepEditor',
    AUDITOR: 'Auditor',
    REVISER: 'Reviser',
    SETTLER: 'Settler',
};
// 审核状态
exports.AUDIT_RESULTS = {
    PASS: 'pass',
    MINOR_REVISE: 'minor_revise',
    MAJOR_REVISE: 'major_revise',
    REWRITE: 'rewrite',
    BLOCKED: 'blocked',
};
// 20维度审核
exports.AUDIT_DIMENSIONS = [
    { key: 'chapter_outline_match', name: '章纲符合度', maxScore: 5 },
    { key: 'continuity', name: '前后连贯性', maxScore: 5 },
    { key: 'perspective_consistency', name: '视角一致性', maxScore: 5 },
    { key: 'character_consistency', name: '人设一致性', maxScore: 5 },
    { key: 'character_voice', name: '人物声音', maxScore: 5 },
    { key: 'protagonist_empathy', name: '主角代入感', maxScore: 5 },
    { key: 'core_conflict', name: '核心冲突', maxScore: 5 },
    { key: 'emotion_curve', name: '情绪曲线', maxScore: 5 },
    { key: 'cool_point_strength', name: '爽点强度', maxScore: 5 },
    { key: 'hook_strength', name: 'Hook强度', maxScore: 5 },
    { key: 'foreshadow_management', name: '伏笔管理', maxScore: 5 },
    { key: 'world_consistency', name: '世界观一致性', maxScore: 5 },
    { key: 'pacing', name: '节奏控制', maxScore: 5 },
    { key: 'info_density', name: '信息密度', maxScore: 5 },
    { key: 'dialogue_naturalness', name: '对白自然度', maxScore: 5 },
    { key: 'ai_trace', name: 'AI痕迹', maxScore: 5 },
    { key: 'style_consistency', name: '文风一致性', maxScore: 5 },
    { key: 'commercial_readability', name: '商业可读性', maxScore: 5 },
    { key: 'word_count', name: '字数达标', maxScore: 5 },
    { key: 'risk_items', name: '风险项', maxScore: 5 },
];
// 小说类型
exports.NOVEL_GENRES = [
    '玄幻', '都市', '脑洞', '修仙', '科幻',
    '悬疑', '言情', '历史', '末世', '其他',
];
// 叙事视角
exports.NARRATIVE_PERSPECTIVES = ['第一人称', '第三人称'];
// 角色类型
exports.CHARACTER_ROLES = ['主角', '配角', '反派', '导师', '路人'];
// Hook类型
exports.HOOK_TYPES = [
    { key: 'opening', name: '开篇Hook', description: '开头吸引点' },
    { key: 'in_chapter', name: '章内Hook', description: '中段持续期待点' },
    { key: 'ending', name: '章末Hook', description: '结尾追读点' },
    { key: 'character', name: '人物Hook', description: '人物身份、秘密、反差' },
    { key: 'item', name: '道具Hook', description: '神秘物品、金手指' },
    { key: 'identity', name: '身世Hook', description: '主角过去、血脉、身份' },
    { key: 'conspiracy', name: '阴谋Hook', description: '背后势力、隐藏真相' },
    { key: 'emotion', name: '情绪Hook', description: '愤怒、委屈、复仇、期待' },
    { key: 'cool_point', name: '爽点Hook', description: '即将打脸、升级、反杀' },
];
// 伏笔类型
exports.FORESHADOW_TYPES = [
    '身份', '道具', '秘密', '能力', '关系', '世界观',
];
// AI去味模式
exports.AI_DE_FLAVOR_MODES = {
    // A. 句式去味
    SENTENCE: {
        remove_summary_tone: '去总结腔',
        remove_parallel_tone: '去排比腔',
        remove_mechanical_transition: '去机械转折',
        remove_not_but_pattern: '去"不是……而是……"',
        remove_over_explanation: '去过度解释',
        remove_generic_adjectives: '去万能形容词',
        remove_template_psychology: '去模板化心理描写',
    },
    // B. 叙事去味
    NARRATIVE: {
        add_immediate_action: '增加即时动作',
        add_protagonist_senses: '增加主角感官',
        add_scene_details: '增加现场细节',
        reduce_narrator_explanation: '减少旁白解释',
        reduce_setting_explanation: '减少设定说明',
        reduce_empty_discussion: '减少空泛议论',
        enhance_scene_pressure: '增强场景压迫感',
    },
    // C. 对白去味
    DIALOGUE: {
        colloquialize: '对白口语化',
        remove_speech_style: '去除演讲式对白',
        add_interruptions: '增加打断、停顿、反问',
        add_character_habits: '增加人物专属说话习惯',
        fix_voice_homogenization: '修复角色声音趋同',
    },
    // D. 节奏去味
    PACING: {
        compress_draggy_paragraphs: '压缩拖沓段落',
        advance_conflict: '前移冲突',
        strengthen_chapter_hook: '强化章末Hook',
        strengthen_cool_point: '强化爽点兑现',
        reduce_invalid_transitions: '减少无效过渡',
    },
    // E. 番茄风增强
    TOMATO_STYLE: {
        enhance_first_person_empathy: '强化第一人称代入',
        enhance_emotion_reaction: '强化"我"的情绪反应',
        enhance_short_sentence_impact: '增强短句冲击力',
        enhance_reader_expectation: '增强读者期待',
        enhance_continuous_reading: '增强连续追读感',
    },
};
// AI模型提供商
exports.AI_PROVIDERS = [
    { key: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { key: 'anthropic', name: 'Anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
    { key: 'google', name: 'Google', models: ['gemini-pro', 'gemini-ultra'] },
    { key: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
    { key: 'zhipu', name: '智谱', models: ['glm-4', 'glm-3-turbo'] },
    { key: 'tongyi', name: '通义', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
    { key: 'ollama', name: 'Ollama', models: [] }, // 动态获取
    { key: 'custom', name: '自定义', models: [] },
];
// 知识库分类
exports.KNOWLEDGE_CATEGORIES = [
    { key: 'tutorials', name: '写作教程', description: '叙述、节奏、伏笔、心理等' },
    { key: 'techniques', name: '技法与大纲', description: '写作技法和大纲方法' },
    { key: 'plots', name: '剧情参考资料', description: '剧情案例和分析' },
    { key: 'characters', name: '人物描写素材', description: '人物描写素材' },
    { key: 'world', name: '世界观与设定', description: '世界观构建和设定' },
    { key: 'scenes', name: '场景写法', description: '场景描写技巧' },
    { key: 'reference', name: '阅读与拆解', description: '作品拆解和分析' },
    { key: 'operations', name: '运营与文案', description: '运营和文案技巧' },
    { key: 'concepts', name: '概念与指令', description: 'AI写作概念和指令' },
    { key: 'case_studies', name: '案例分析', description: '深度案例分析' },
];
// 文件上传配置
exports.UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_EXTENSIONS: ['.txt', '.md', '.docx', '.pdf'],
};
// 分页配置
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
};
