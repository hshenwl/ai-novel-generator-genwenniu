import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Tag, Typography, Table, Button, Space, Select, message, Alert, Descriptions, Tooltip, Progress } from 'antd';
import {
  LineChartOutlined, ThunderboltOutlined, ReloadOutlined,
  ExperimentOutlined, CheckCircleOutlined, WarningOutlined, RocketOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const { Title, Text } = Typography;

interface TrendData { date: string; avgScore: number; minScore: number; maxScore: number; count: number; }
interface ModelData { model: string; avgScore: number; avgRevisions: number; totalCost: number; count: number; taskScores: Record<string, { avg: number; count: number }>; }
interface DimData { dimension: string; avgScore: number; minScore: number; maxScore: number; count: number; }
interface OptimalParams { modelName?: string; temperature?: number; maxTokens?: number; workflowMode?: string; maxRevisionRounds?: number; bottleneckDims?: string[]; confidence: number; dataSource: string; }
interface FeedbackRecord { id: string; taskType: string; modelName?: string; totalScore?: number; passStatus?: string; revisionRounds: number; createdAt: string; }

const taskTypeNames: Record<string, string> = {
  world_setting: '世界设定', outline: '总纲', outline_generate: '总纲',
  volume: '卷纲', volume_generation: '卷纲',
  chapter_outline: '章纲', chapter: '正文', chapter_generation: '正文',
  audit: '审核', revision: '润色',
  world_setting_generation: '世界设定', prompt_generation: '提示词', inspiration_generation: '灵感',
};

const passColors: Record<string, string> = {
  pass: 'green', minor_revise: 'orange', major_revise: 'volcano', rewrite: 'red', blocked: 'darkred',
};

export default function TuningDashboard() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [models, setModels] = useState<ModelData[]>([]);
  const [dimensions, setDimensions] = useState<DimData[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [optimal, setOptimal] = useState<OptimalParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskType, setTaskType] = useState<string>('chapter');
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const [t, m, d, f, o] = await Promise.all([
        api.get(`/engine/tuning/trends?days=${days}`),
        api.get('/engine/tuning/models'),
        api.get('/engine/tuning/dimensions'),
        api.get('/engine/tuning/feedback?limit=20'),
        api.get(`/engine/tuning/params?taskType=${taskType}`),
      ]);
      setTrends(Array.isArray(t) ? t : []);
      setModels(Array.isArray(m) ? m : []);
      setDimensions(Array.isArray(d) ? d : []);
      setFeedback(Array.isArray(f) ? f : []);
      setOptimal(o as unknown as OptimalParams);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [taskType, days]);

  const avgScore = trends.length > 0 ? trends.reduce((s, t) => s + t.avgScore, 0) / trends.length : 0;
  const totalFeedback = trends.reduce((s, t) => s + t.count, 0);
  const bestModel = models.length > 0 ? models.reduce((a, b) => a.avgScore > b.avgScore ? a : b) : null;

  return (
    <div>
      <PageHeader
        title="调参仪表盘"
        subtitle="AI 生成质量监控与自动参数优化"
        extra={
          <Space>
            <Select value={taskType} onChange={setTaskType} style={{ width: 140 }}
              options={Object.entries(taskTypeNames).map(([k, v]) => ({ label: v, value: k }))} />
            <Select value={days} onChange={setDays} style={{ width: 100 }}
              options={[{ label: '7天', value: 7 }, { label: '30天', value: 30 }, { label: '90天', value: 90 }]} />
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
          </Space>
        }
      />

      {/* 概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="平均质量分" value={avgScore.toFixed(1)} prefix={<LineChartOutlined />} valueStyle={{ color: avgScore >= 7 ? '#52c41a' : avgScore >= 5 ? '#faad14' : '#ff4d4f' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="总生成次数" value={totalFeedback} prefix={<ExperimentOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="最优模型" value={bestModel?.model || '暂无数据'} prefix={<ThunderboltOutlined />} valueStyle={{ fontSize: 16 }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="置信度" value={((optimal?.confidence || 0) * 100).toFixed(0) + '%'} prefix={<CheckCircleOutlined />} valueStyle={{ color: (optimal?.confidence || 0) >= 0.5 ? '#52c41a' : '#faad14' }} /></Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 推荐参数 */}
        <Col span={8}>
          <Card title={<><RocketOutlined /> 推荐参数</>} size="small" style={{ marginBottom: 16 }}>
            {optimal ? (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="数据来源">
                  <Tag color={optimal.dataSource === 'historical' ? 'green' : optimal.dataSource === 'override' ? 'blue' : 'default'}>
                    {optimal.dataSource === 'historical' ? '历史学习' : optimal.dataSource === 'override' ? '手动覆盖' : '默认值'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="推荐模型">{optimal.modelName || '自动选择'}</Descriptions.Item>
                <Descriptions.Item label="温度">{optimal.temperature ?? '默认'}</Descriptions.Item>
                <Descriptions.Item label="最大Token">{optimal.maxTokens ?? '默认'}</Descriptions.Item>
                <Descriptions.Item label="工作流模式">{optimal.workflowMode ?? '默认'}</Descriptions.Item>
                <Descriptions.Item label="修订轮次">{optimal.maxRevisionRounds ?? '默认'}</Descriptions.Item>
              </Descriptions>
            ) : <Text type="secondary">加载中...</Text>}
          </Card>

          {/* 瓶颈维度 */}
          {optimal?.bottleneckDims && optimal.bottleneckDims.length > 0 && (
            <Card title={<><WarningOutlined /> 瓶颈维度</>} size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                {optimal.bottleneckDims.map(dim => (
                  <Tag key={dim} color="volcano">{dim}</Tag>
                ))}
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>系统将针对这些低分维度优化提示词</Text>
              </div>
            </Card>
          )}
        </Col>

        {/* 模型对比 */}
        <Col span={16}>
          <Card title="模型对比" size="small" style={{ marginBottom: 16 }}>
            <Table
              dataSource={models}
              rowKey="model"
              loading={loading}
              size="small"
              pagination={false}
              columns={[
                { title: '模型', dataIndex: 'model', key: 'model', render: (v: string) => <Tag>{v}</Tag> },
                { title: '平均分', dataIndex: 'avgScore', key: 'avgScore', sorter: (a: ModelData, b: ModelData) => a.avgScore - b.avgScore,
                  render: (v: number) => <Text strong style={{ color: v >= 7 ? '#52c41a' : v >= 5 ? '#faad14' : '#ff4d4f' }}>{v.toFixed(2)}</Text> },
                { title: '平均修订', dataIndex: 'avgRevisions', key: 'avgRevisions', render: (v: number) => v.toFixed(1) },
                { title: '总花费', dataIndex: 'totalCost', key: 'totalCost', render: (v: number) => `¥${v.toFixed(4)}` },
                { title: '次数', dataIndex: 'count', key: 'count' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 维度雷达 */}
        <Col span={12}>
          <Card title="维度分析（低分优先）" size="small" style={{ marginBottom: 16 }}>
            {dimensions.length > 0 ? (
              <Table dataSource={dimensions.slice(0, 10)} rowKey="dimension" size="small" pagination={false}
                columns={[
                  { title: '维度', dataIndex: 'dimension', key: 'dimension', width: 120 },
                  { title: '平均分', dataIndex: 'avgScore', key: 'avgScore', render: (v: number) => (
                    <Tooltip title={`最低 ${dimensions.find(d => d.dimension === dimensions[0]?.dimension)?.minScore?.toFixed(1)} / 最高 ${dimensions.find(d => d.dimension === dimensions[0]?.dimension)?.maxScore?.toFixed(1)}`}>
                      <Progress percent={v * 10} size="small" strokeColor={v >= 7 ? '#52c41a' : v >= 5 ? '#faad14' : '#ff4d4f'} format={() => v.toFixed(1)} />
                    </Tooltip>
                  )},
                  { title: '样本数', dataIndex: 'count', key: 'count', width: 60 },
                ]}
              />
            ) : <Text type="secondary">暂无维度数据</Text>}
          </Card>
        </Col>

        {/* 最近反馈 */}
        <Col span={12}>
          <Card title="最近生成记录" size="small" style={{ marginBottom: 16 }}>
            <Table
              dataSource={feedback}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 8 }}
              columns={[
                { title: '类型', dataIndex: 'taskType', key: 'taskType', width: 80,
                  render: (v: string) => <Tag>{taskTypeNames[v] || v}</Tag> },
                { title: '分数', dataIndex: 'totalScore', key: 'totalScore', width: 70,
                  render: (v: number | null) => v !== null && v !== undefined ? <Text strong style={{ color: v >= 7 ? '#52c41a' : '#faad14' }}>{v.toFixed(1)}</Text> : '-' },
                { title: '状态', dataIndex: 'passStatus', key: 'passStatus', width: 80,
                  render: (v: string) => v ? <Tag color={passColors[v]}>{v}</Tag> : '-' },
                { title: '修订', dataIndex: 'revisionRounds', key: 'revisionRounds', width: 50 },
                { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140,
                  render: (v: string) => new Date(v).toLocaleString('zh-CN') },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 质量趋势 */}
      {trends.length > 0 && (
        <Card title="质量趋势" size="small">
          <Table dataSource={trends} rowKey="date" size="small" pagination={false}
            columns={[
              { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
              { title: '平均分', dataIndex: 'avgScore', key: 'avgScore',
                render: (v: number) => <Text strong style={{ color: v >= 7 ? '#52c41a' : v >= 5 ? '#faad14' : '#ff4d4f' }}>{v.toFixed(2)}</Text> },
              { title: '最低', dataIndex: 'minScore', key: 'minScore', render: (v: number) => v.toFixed(1) },
              { title: '最高', dataIndex: 'maxScore', key: 'maxScore', render: (v: number) => v.toFixed(1) },
              { title: '次数', dataIndex: 'count', key: 'count' },
            ]}
          />
        </Card>
      )}

      {trends.length === 0 && !loading && (
        <Card>
          <Alert
            message="暂无反馈数据"
            description="系统会在每次 AI 生成（世界设定、总纲、章纲、正文等）完成后自动采集质量数据。随着使用次数增加，调参仪表盘将展示质量趋势和优化建议。"
            type="info"
            showIcon
          />
        </Card>
      )}
    </div>
  );
}
