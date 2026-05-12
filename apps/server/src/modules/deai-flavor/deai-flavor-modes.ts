import { FlavorMode, FlavorCategory } from './deai-flavor.types';

const MODES: FlavorMode[] = [
  // ===== A类: 句式去味 (7种) =====
  { id: 'A1', category: 'A', name: '去总结腔', description: '消除"总的来说"、"综上所述"、"不难发现"等总结性句式', checkPatterns: ['总的来说', '综上所述', '不难发现', '由此可见', '总而言之', '简而言之', '换句话说', '一言以蔽之'], rewriteGuidance: '将总结句改为具体行动或情绪反应，删除空洞总结' },
  { id: 'A2', category: 'A', name: '去排比腔', description: '消除三段式排比，AI最爱用的"三个并列"句式', checkPatterns: ['既.*又.*还', '不仅.*而且.*更', '一方面.*另一方面.*再一方面', '一是.*二是.*三是'], rewriteGuidance: '保留最有力的一个，其余删除或改为不同节奏的表达' },
  { id: 'A3', category: 'A', name: '去机械转折', description: '消除"然而"、"但是"开头的机械转折', checkPatterns: ['然而，?', '但是，?', '不过，?', '可是，?'], rewriteGuidance: '转折应融入行动或情绪，而非单独成句' },
  { id: 'A4', category: 'A', name: '去"不是…而是…"', description: '消除AI最爱用的对比句式', checkPatterns: ['不是.*而是', '并非.*而是', '与其.*不如'], rewriteGuidance: '改为直接行动或内心独白，不做对比解释' },
  { id: 'A5', category: 'A', name: '去过度解释', description: '消除"这意味着"、"也就是说"等解释性过渡', checkPatterns: ['这意味着', '也就是说', '这表明', '这说明', '这意味着', '换言之'], rewriteGuidance: '删除解释句，让读者自己理解' },
  { id: 'A6', category: 'A', name: '去万能形容词', description: '消除"深邃的"、"温暖的"、"坚定的"等万能形容词', checkPatterns: ['深邃的', '温暖的', '坚定的', '温柔的', '沉重的', '冰冷的', '炽热的', '无尽的', '独特的'], rewriteGuidance: '用具体感官细节替代抽象形容词' },
  { id: 'A7', category: 'A', name: '去模板化心理描写', description: '消除"一股X涌上心头"、"心中涌起"等模板心理描写', checkPatterns: ['一股.*涌上心头', '心中涌起', '内心.*翻涌', '心.*一沉', '心.*一紧', '不禁.*起来', '情不自禁'], rewriteGuidance: '用身体反应或行动代替心理描写模板' },

  // ===== B类: 叙事去味 (7种) =====
  { id: 'B1', category: 'B', name: '+即时动作', description: '将静态描述转为即时动作', checkPatterns: ['他站在', '她坐在', '房间里', '空气中'], rewriteGuidance: '人物在做事情，而不是在状态中' },
  { id: 'B2', category: 'B', name: '+主角感官', description: '增加主角五感体验', checkPatterns: [], rewriteGuidance: '加入视觉/听觉/触觉/嗅觉/味觉的即时感受' },
  { id: 'B3', category: 'B', name: '+现场细节', description: '增加现场具象细节', checkPatterns: [], rewriteGuidance: '补充环境中的具体物品、光线、声音等细节' },
  { id: 'B4', category: 'B', name: '-旁白解释', description: '删除上帝视角的旁白解释', checkPatterns: ['其实', '事实上', '实际上', '要知道', '众所周知'], rewriteGuidance: '删除旁白解释，信息通过角色行动/对白传达' },
  { id: 'B5', category: 'B', name: '-设定说明', description: '删除大段设定说明', checkPatterns: ['设定如下', '规则是', '体系为'], rewriteGuidance: '设定融入情节和行动中，不做独立说明' },
  { id: 'B6', category: 'B', name: '-空泛议论', description: '删除空泛的人生议论', checkPatterns: ['人生.*就是', '生活.*从来', '这个世界.*总是', '有时候'], rewriteGuidance: '删除议论，用角色经历和选择体现主题' },
  { id: 'B7', category: 'B', name: '+场景压迫感', description: '增加紧迫感和压迫感', checkPatterns: [], rewriteGuidance: '加入时间压力、空间限制、威胁逼近等压迫元素' },

  // ===== C类: 对白去味 (5种) =====
  { id: 'C1', category: 'C', name: '口语化', description: '对白改为口语表达', checkPatterns: ['我认为', '因此', '综上所述', '显而易见', '毫无疑问'], rewriteGuidance: '对白用口语/俚语/短句，像真人说话' },
  { id: 'C2', category: 'C', name: '去演讲式', description: '消除长篇大论式对白', checkPatterns: [], rewriteGuidance: '对白每句不超过30字，拆分长对白' },
  { id: 'C3', category: 'C', name: '+打断/停顿/反问', description: '增加对白中的打断、停顿、反问', checkPatterns: [], rewriteGuidance: '加入"——"、"…"、"？"等打断停顿，增加对白张力' },
  { id: 'C4', category: 'C', name: '+人物专属说话习惯', description: '不同角色有不同的语言习惯', checkPatterns: [], rewriteGuidance: '为角色设计口头禅、语气词、句式偏好' },
  { id: 'C5', category: 'C', name: '修复角色声音趋同', description: '不同角色说话太像，需区分', checkPatterns: [], rewriteGuidance: '根据角色身份/性格/教育程度，调整用语和句式' },

  // ===== D类: 节奏去味 (5种) =====
  { id: 'D1', category: 'D', name: '压缩拖沓', description: '删除无推进作用的冗余段落', checkPatterns: [], rewriteGuidance: '删除不推进情节、不展现人物、不制造氛围的段落' },
  { id: 'D2', category: 'D', name: '前移冲突', description: '冲突不要拖到章末才出现', checkPatterns: [], rewriteGuidance: '把冲突前移到章节前1/3处' },
  { id: 'D3', category: 'D', name: '强化章末Hook', description: '章尾必须有强悬念', checkPatterns: [], rewriteGuidance: '章末设置未解之谜/新威胁/反转/重大决定' },
  { id: 'D4', category: 'D', name: '强化爽点兑现', description: '前章承诺的爽点要及时兑现', checkPatterns: [], rewriteGuidance: '检查并兑现前文埋设的读者期待' },
  { id: 'D5', category: 'D', name: '减少无效过渡', description: '删除"过了几天"、"时间飞逝"等无效过渡', checkPatterns: ['过了.*天', '时间飞逝', '转眼间', '日子一天天过去'], rewriteGuidance: '用具体事件标记时间流逝，不做空洞过渡' },

  // ===== E类: 番茄风增强 (5种) =====
  { id: 'E1', category: 'E', name: '+第一人称代入', description: '强化"我"的即时体验', checkPatterns: [], rewriteGuidance: '增加"我"的感官/情绪/行动，让读者即主角' },
  { id: 'E2', category: 'E', name: '+"我"情绪反应', description: '增加主角的情绪即时反应', checkPatterns: [], rewriteGuidance: '每个事件后加"我"的即时情绪反应' },
  { id: 'E3', category: 'E', name: '+短句冲击力', description: '关键处用短句增强冲击力', checkPatterns: [], rewriteGuidance: '重要转折/震惊/决心处用1-5字短句' },
  { id: 'E4', category: 'E', name: '+读者期待', description: '制造读者对下一章的期待', checkPatterns: [], rewriteGuidance: '章末暗示更大挑战/未解之谜/新机遇' },
  { id: 'E5', category: 'E', name: '+连续追读感', description: '章节间有连续追读动力', checkPatterns: [], rewriteGuidance: '章末设置必须看下一章才能解答的悬念' },
];

export function getAllModes(): FlavorMode[] {
  return MODES;
}

export function getModesByCategory(category: FlavorCategory): FlavorMode[] {
  return MODES.filter(m => m.category === category);
}

export function getModesByIntensity(intensity: 'light' | 'standard' | 'strong'): FlavorMode[] {
  const categoryMap: Record<string, FlavorCategory[]> = {
    light: ['A'],
    standard: ['A', 'B', 'C'],
    strong: ['A', 'B', 'C', 'D', 'E'],
  };
  const categories = categoryMap[intensity] || categoryMap.standard;
  return MODES.filter(m => categories.includes(m.category));
}

export function detectIssues(content: string, modes: FlavorMode[]): Array<{ mode: FlavorMode; matches: string[] }> {
  const results: Array<{ mode: FlavorMode; matches: string[] }> = [];
  for (const mode of modes) {
    const matches: string[] = [];
    for (const pattern of mode.checkPatterns) {
      try {
        const regex = new RegExp(pattern, 'g');
        const found = content.match(regex);
        if (found) matches.push(...found);
      } catch {}
    }
    if (matches.length > 0) {
      results.push({ mode, matches: [...new Set(matches)] });
    }
  }
  return results;
}
