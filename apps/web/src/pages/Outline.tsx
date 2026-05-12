import { useEffect, useState } from 'react';
import { Card, Input, Button, message, Skeleton, Tabs, Typography, Divider, Tag, Space } from 'antd';
import { SaveOutlined, EditOutlined, BookOutlined, ThunderboltOutlined, RocketOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import ModelSelector from '../components/ModelSelector';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

export default function Outline() {
  const { id } = useParams();
  const [outlineId, setOutlineId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [activeTab, setActiveTab] = useState('edit');

  // 表单字段
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [mainPlot, setMainPlot] = useState('');
  const [coreConflict, setCoreConflict] = useState('');

  useEffect(() => {
    api.get(`/outlines/project/${id}`).then((res: any) => {
      if (res?.id) {
        setOutlineId(res.id);
        setContent(res.content || '');
        setSummary(res.summary || '');
        setMainPlot(res.mainPlot || '');
        setCoreConflict(res.coreConflict || '');
      }
    }).catch(() => message.error('加载大纲失败'))
    .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { content, summary, mainPlot, coreConflict };
      if (outlineId) {
        await api.put(`/outlines/${outlineId}`, payload);
      } else {
        const res: any = await api.post(`/outlines/project/${id}`, payload);
        if (res?.id) setOutlineId(res.id);
      }
      message.success('保存成功');
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    const hide = message.loading('AI正在生成小说总纲...', 0);
    try {
      const res: any = await api.post('/engine/chapter/generate', {
        projectId: id,
        context: { task: 'outline_generate', projectId: id },
        mode: 'quick',
        model: selectedModel || undefined,
      });
      hide();
      const wf = res?.workflow;
      if (wf?.result) {
        const result = typeof wf.result === 'string' ? { content: wf.result } : wf.result;
        if (result.content) setContent(result.content);
        if (result.summary) setSummary(result.summary);
        if (result.mainPlot) setMainPlot(result.mainPlot);
        if (result.coreConflict) setCoreConflict(result.coreConflict);
        message.success('AI已生成总纲，请检查后保存');
      } else if (wf?.status === 'failed') {
        const err = wf?.error || '未知错误';
        message.error(`AI生成失败: ${err}`);
        // 降级：直接调用简单生成
        try {
          const simple: any = await api.post('/engine/chapter/generate', {
            projectId: id,
            context: { task: 'outline_generate', projectId: id, prompt: '直接生成小说总纲' },
            mode: 'quick',
            model: selectedModel || undefined,
          });
          if (simple?.workflow?.result) {
            const r = typeof simple.workflow.result === 'string' ? { content: simple.workflow.result } : simple.workflow.result;
            if (r.content) setContent(r.content);
            message.info('已使用简化模式生成');
          }
        } catch { /* ignore fallback error */ }
      } else {
        message.warning('AI引擎未返回结果，请稍后重试');
      }
    } catch (err: any) {
      hide();
      const msg = err?.response?.data?.message || err?.message || '请检查网络和模型配置';
      message.error(`AI生成失败: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Skeleton active />;

  return (
    <div>
      <PageHeader
        title="小说总纲"
        subtitle="定义小说的核心剧情、主线冲突和整体走向"
        extra={
          <Space>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
            <Button icon={<RocketOutlined />} loading={generating} onClick={handleAIGenerate}>
              AI生成总纲
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
          </Space>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'edit',
            label: <><EditOutlined /> 编辑大纲</>,
            children: (
              <div>
                <Card title="总纲正文" style={{ marginBottom: 16 }}>
                  <TextArea
                    rows={16}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="在此编写小说总纲，包含主线剧情走向、主要事件、人物发展轨迹等..."
                    style={{ fontFamily: 'Microsoft YaHei', fontSize: 14, lineHeight: 1.8 }}
                  />
                </Card>

                <Card title="核心要素" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>剧情摘要</Text>
                      <TextArea
                        rows={4}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="简要概述小说的核心故事线..."
                      />
                    </div>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>核心冲突</Text>
                      <TextArea
                        rows={4}
                        value={coreConflict}
                        onChange={(e) => setCoreConflict(e.target.value)}
                        placeholder="小说的核心矛盾冲突是什么..."
                      />
                    </div>
                  </div>
                  <Divider />
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>主线剧情</Text>
                  <TextArea
                    rows={6}
                    value={mainPlot}
                    onChange={(e) => setMainPlot(e.target.value)}
                    placeholder="详细描述主线剧情的发展脉络、关键转折点..."
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'preview',
            label: <><BookOutlined /> 预览</>,
            children: (
              <Card>
                {content || summary || mainPlot || coreConflict ? (
                  <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>小说总纲</Title>

                    {summary && (
                      <Card type="inner" title="剧情摘要" style={{ marginBottom: 16 }}>
                        <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>{summary}</Paragraph>
                      </Card>
                    )}

                    {coreConflict && (
                      <Card type="inner" title={<><ThunderboltOutlined /> 核心冲突</>} style={{ marginBottom: 16 }}>
                        <Tag color="red" style={{ fontSize: 14, padding: '4px 12px', marginBottom: 12 }}>冲突</Tag>
                        <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>{coreConflict}</Paragraph>
                      </Card>
                    )}

                    {mainPlot && (
                      <Card type="inner" title="主线剧情" style={{ marginBottom: 16 }}>
                        <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>{mainPlot}</Paragraph>
                      </Card>
                    )}

                    {content && (
                      <Card type="inner" title="总纲详情" style={{ marginBottom: 16 }}>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.8 }}>{content}</div>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    <BookOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div><Text type="secondary">还没有编写总纲，请在编辑标签页中开始创作</Text></div>
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
