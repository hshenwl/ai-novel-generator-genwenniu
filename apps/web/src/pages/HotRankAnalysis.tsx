import { useState } from 'react';
import { Card, Button, Typography, Select, Tag, Space, Spin, Divider, message, Alert, Form, Input, Modal, SelectProps } from 'antd';
import { FireOutlined, RocketOutlined, BulbOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const PLATFORMS: SelectProps['options'] = [
  { label: '番茄小说', value: 'fanqie' },
  { label: '起点中文网', value: 'qidian' },
  { label: '七猫小说', value: 'qimao' },
];

const ANALYSIS_TYPES: SelectProps['options'] = [
  { label: '热门题材分析', value: 'genre_trend' },
  { label: '标题特征分析', value: 'title_pattern' },
  { label: '简介特征分析', value: 'intro_pattern' },
  { label: '主角特点分析', value: 'character_type' },
  { label: '爽点结构分析', value: 'cool_point' },
  { label: 'Hook结构分析', value: 'hook_structure' },
];

export default function HotRankAnalysis() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<string>('fanqie');
  const [analysisType, setAnalysisType] = useState<string>('genre_trend');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<{ model: string; duration: number; tokens: number } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [projectForm] = Form.useForm();

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setResultMeta(null);
    try {
      const res: any = await api.post('/hot-rank/analyze', { platform, analysisType });
      setResult(res.content || res);
      if (res.model) {
        setResultMeta({ model: res.model, duration: res.duration, tokens: res.usage?.totalTokens || 0 });
      }
      message.success('分析完成');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        message.error('请先登录后再使用分析功能');
      } else if (status === 503 || err?.message?.includes('network')) {
        message.warning('AI服务暂时不可用，请检查模型配置');
      } else {
        message.error('分析失败：' + (err?.response?.data?.message || err?.message || '未知错误'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <FireOutlined style={{ color: '#ff4d4f' }} /> 热榜分析
        </Title>
        <Text type="secondary">分析热门网文平台榜单趋势，发现创作灵感和市场方向</Text>
      </div>

      <Alert
        message="合规说明"
        description="本功能基于AI模型对网文市场趋势进行分析推理，不抓取任何平台数据，不复制原文内容。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title="分析配置" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>目标平台</Text>
            <Select
              style={{ width: 200 }}
              value={platform}
              onChange={setPlatform}
              options={PLATFORMS}
            />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>分析维度</Text>
            <Select
              style={{ width: 200 }}
              value={analysisType}
              onChange={setAnalysisType}
              options={ANALYSIS_TYPES}
            />
          </div>
          <div style={{ paddingTop: 22 }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleAnalyze}
              loading={loading}
              disabled={loading}
              size="large"
            >
              开始分析
            </Button>
          </div>
        </Space>
      </Card>

      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">正在调用AI分析{PLATFORMS.find(p => p.value === platform)?.label}榜单数据...</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>首次调用可能需要10-30秒，请耐心等待</Text>
            </div>
          </div>
        </Card>
      )}

      {result && !loading && (
        <Card
          title={<><BulbOutlined /> 分析报告</>}
          extra={
            <Space>
              <Tag color="green">分析完成</Tag>
              {resultMeta && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {resultMeta.model} | {Math.round(resultMeta.duration / 1000)}s | {resultMeta.tokens} tokens
                </Text>
              )}
            </Space>
          }
        >
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14 }}>
            {result}
          </div>
          <Divider />
          <Space>
            <Button
              icon={<RocketOutlined />}
              onClick={() => {
                setCreateModalOpen(true);
                projectForm.setFieldsValue({
                  genre: PLATFORMS.find(p => p.value === platform)?.label || '',
                  description: `基于${PLATFORMS.find(p => p.value === platform)?.label}${ANALYSIS_TYPES.find(a => a.value === analysisType)?.label}结果创建`,
                });
              }}
            >
              基于分析创建项目
            </Button>
            <Button onClick={() => { setResult(null); setResultMeta(null); }}>
              重新分析
            </Button>
          </Space>
        </Card>
      )}

      {!result && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <FireOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>
              <Text type="secondary">选择平台和分析维度，点击"开始分析"查看热榜趋势</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>分析由AI模型驱动，需先在"模型配置"中配置可用模型</Text>
            </div>
          </div>
        </Card>
      )}

      <Modal
        title="基于分析结果创建项目"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={async () => {
          try {
            const values = await projectForm.validateFields();
            const payload = {
              name: values.name,
              genre: values.genre,
              perspective: values.perspective || '第三人称',
              description: values.description,
              targetWords: Number(values.targetWords) || 500000,
            };
            const res: any = await api.post('/projects', payload);
            message.success('项目创建成功！');
            setCreateModalOpen(false);
            if (res?.id) {
              navigate(`/projects/${res.id}/world-setting`);
            } else {
              navigate('/projects');
            }
          } catch {
            message.error('创建失败，请检查填写内容');
          }
        }}
        okText="创建项目"
        width={600}
      >
        <Form form={projectForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="输入小说项目名称" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="genre" label="小说类型">
              <Select options={PLATFORMS.map(p => ({ label: p.label, value: p.label }))} />
            </Form.Item>
            <Form.Item name="perspective" label="叙事视角" initialValue="第三人称">
              <Select options={[{ label: '第一人称', value: '第一人称' }, { label: '第三人称', value: '第三人称' }]} />
            </Form.Item>
          </div>
          <Form.Item name="targetWords" label="目标字数" initialValue={500000}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={3} placeholder="项目描述..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
