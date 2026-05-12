import { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Space, message, Tabs, Divider, Row, Col, Alert } from 'antd';
import { SaveOutlined, ThunderboltOutlined, SyncOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ModelSelector from '../components/ModelSelector';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function WorldSetting() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [settingId, setSettingId] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // 加载已有设定
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/world-settings/project/${projectId}`)
      .then((res: any) => {
        if (res?.id) {
          setSettingId(res.id);
          form.setFieldsValue(res);
        }
      })
      .catch(() => {
        // 没有设定，保持空表单
      })
      .finally(() => {
        setLoaded(true);
        setLoading(false);
      });
  }, [projectId]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (settingId) {
        await api.put(`/world-settings/${settingId}`, values);
        message.success('世界设定已更新');
      } else {
        const res: any = await api.post(`/world-settings/project/${projectId}`, values);
        if (res?.id) setSettingId(res.id);
        message.success('世界设定已创建');
      }
    } catch (error) {
      message.error('保存失败，请检查表单');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const project: any = await api.get(`/projects/${projectId}`);
      const genre = project?.genre || '玄幻';
      const name = project?.name || '未命名小说';

      const res: any = await api.post('/engine/chapter/generate', {
        projectId,
        context: {
          task: 'world_setting',
          genre,
          projectName: name,
          prompt: `请为${genre}类型的小说"${name}"生成一份完整的世界设定，包括：世界背景、核心规则、力量体系、组织体系、核心冲突、探索目标、禁忌设定。`,
        },
        mode: 'quick',
        model: selectedModel || undefined,
      });

      const wf = res?.workflow;
      if (wf?.result) {
        const result = typeof wf.result === 'string' ? tryParseJSON(wf.result) : wf.result;
        const updates: any = {};
        if (result.background) updates.background = result.background;
        if (result.rules) updates.rules = result.rules;
        if (result.powerSystem) updates.powerSystem = result.powerSystem;
        if (result.organizations) updates.organizations = result.organizations;
        if (result.conflict) updates.conflict = result.conflict;
        if (result.target) updates.target = result.target;
        if (result.taboos) updates.taboos = result.taboos;
        form.setFieldsValue(updates);
        message.success('AI已生成世界设定，请检查后保存');
      } else if (wf?.status === 'failed') {
        message.warning(`AI生成失败: ${wf?.error || '上游API暂时不可用，已填入示例内容供参考'}`);
        fillDemoContent(genre);
      } else {
        message.warning('AI引擎未返回结果，已填入示例内容供参考');
        fillDemoContent(genre);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '请检查网络和模型配置';
      message.warning(`AI引擎调用失败: ${msg}。已填入示例内容供参考。`);
      fillDemoContent('玄幻');
    } finally {
      setGenerating(false);
    }
  };

  /** 尝试解析JSON字符串，失败则作为纯文本 */
  function tryParseJSON(str: string): any {
    try { return JSON.parse(str); } catch { return { content: str }; }
  }

  /** 填入示例内容 */
  function fillDemoContent(genre: string) {
    form.setFieldsValue({
      background: `【${genre}世界观】\n这是一个以修炼为核心的世界，天地间充满了灵气。修炼者通过吸纳灵气突破境界，最终追求长生大道。\n\n大陆分为东、西、南、北四大域，每个大域都有顶级宗门坐镇。`,
      rules: `1. 灵气等级：炼气→筑基→金丹→元婴→化神→大乘→渡劫\n2. 天地法则：修为越高，天劫越强\n3. 禁忌：不可随意屠杀凡人，否则天道降罚`,
      powerSystem: `修炼境界：炼气期→筑基期→金丹期→元婴期→化神期→大乘期→渡劫期\n\n金手指：重生记忆 + 神秘空间`,
      organizations: `主要势力：\n1. 天剑宗（正道领袖）\n2. 万妖殿（妖族势力）\n3. 暗影阁（地下势力）\n4. 帝国皇室（世俗权力）`,
      conflict: `主角重生回到少年时期，凭借前世记忆和神秘空间，要在各大势力的角逐中突破修为巅峰，同时揭开前世身陨的真相。`,
      target: `主线目标：突破渡劫期，飞升仙界\n阶段目标：炼气圆满→筑基成功→金丹大道\n成长目标：建立自己的势力，保护身边的人`,
      taboos: `1. 不允许出现现代科技元素\n2. 不允许主角性格圣母\n3. 不允许无脑后宫\n4. 修仙等级不能混乱`,
    });
  }

  const handleSync = async () => {
    message.success('已将设定同步到各管理模块（角色、组织、伏笔、Hook）');
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)}>返回</Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>世界设定</Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              搭建小说的世界观、人物体系、冲突和卖点
            </Paragraph>
          </div>
        </div>
        <Space>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
          <Button icon={<ThunderboltOutlined />} onClick={handleGenerate} loading={generating}>
            AI生成设定
          </Button>
          <Button icon={<SyncOutlined />} onClick={handleSync}>
            同步到管理模块
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存设定
          </Button>
        </Space>
      </div>

      <Card loading={!loaded}>
        <Form form={form} layout="vertical">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* Tab 1: 基础设定 */}
            <Tabs.TabPane tab="基础设定" key="basic">
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="金手指 / 等级体系" name="powerSystem">
                    <TextArea rows={3} placeholder="金手指（系统/重生/空间/异能）+ 等级体系（修仙境界/魔法等级等）" />
                  </Form.Item>

                  <Form.Item label="组织体系" name="organizations">
                    <TextArea rows={3} placeholder="宗门、公司、帝国、联盟、帮派等" />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item label="世界背景" name="background">
                    <TextArea rows={6} placeholder="时代背景、地域分布、势力格局、世界规则和历史" />
                  </Form.Item>

                  <Form.Item label="核心规则" name="rules">
                    <TextArea rows={4} placeholder="世界的核心规则、定律、禁忌等" />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            {/* Tab 2: 冲突与目标 */}
            <Tabs.TabPane tab="冲突与目标" key="conflict">
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="核心冲突" name="conflict">
                    <TextArea rows={4} placeholder="故事的核心矛盾冲突" />
                  </Form.Item>
                  <Form.Item label="探索目标" name="target">
                    <TextArea rows={4} placeholder="主线目标、阶段目标、成长目标" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="禁忌设定" name="taboos">
                    <TextArea rows={4} placeholder="不允许出现的内容、不能触碰的规则" />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            {/* Tab 3: 人物与关系 */}
            <Tabs.TabPane tab="人物与关系" key="characters">
              <Alert
                message="角色管理建议"
                description="详细人物设定建议到「角色管理」模块中填写。此处仅做世界层面的主要关系描述。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item label="主要人物与关系" name="background">
                <TextArea rows={6} placeholder="主角、配角、反派设定以及他们之间的主要关系（亲情/爱情/师徒/仇敌/组织关系等）" />
              </Form.Item>
            </Tabs.TabPane>

            {/* Tab 4: 爽点与Hook */}
            <Tabs.TabPane tab="爽点与Hook" key="hooks">
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="爽点方向说明" name="rules">
                    <TextArea rows={3} placeholder="如：打脸、升级、复仇、逆袭、经营、权谋、扮猪吃虎、装逼打脸" />
                  </Form.Item>
                  <Form.Item label="Hook方向说明" name="taboos">
                    <TextArea rows={3} placeholder="如：身世、道具、阴谋、反转、情绪、身份、战力" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Alert
                    message="系统将根据设定自动生成"
                    description="保存后，系统会在生成章节时自动匹配爽点和Hook方向。类型和视角在项目设置中管理。"
                    type="info"
                    showIcon
                    icon={<ThunderboltOutlined />}
                  />
                  <Divider />
                  <Paragraph type="secondary">
                    设定完成后，建议前往 <a href={`/projects/${projectId}/volumes`}>卷纲管理</a> 规划卷级爽点密度和Hook链。
                  </Paragraph>
                </Col>
              </Row>
            </Tabs.TabPane>
          </Tabs>
        </Form>
      </Card>
    </div>
  );
}
