import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Drawer, Descriptions, Space, Skeleton, Divider, Typography, Progress, Tooltip, Popconfirm, message } from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api, { extractList } from '../services/api';
import ModelSelector from '../components/ModelSelector';

const { Text, Title } = Typography;

interface AuditReport {
  id: string; projectId: string; chapterId: string; totalScore: number;
  dimensionScores: string; issues: string; suggestions: string;
  passStatus: string; auditorModel?: string; createdAt: string;
  chapter?: { id: string; title?: string; chapterNo?: number };
}

interface QualityItem {
  chapterId: string; chapterNo: number; chapterTitle: string;
  totalScore: number; passStatus: string;
  dimensionScores: Record<string, number>;
  issues: string[]; suggestions: string[];
  recommendedRoute: string | null; routeReason: string;
}

const statusColors: Record<string, string> = {
  PASS: 'green', MINOR_REVISE: 'orange', MAJOR_REVISE: 'volcano', REWRITE: 'red', BLOCKED: 'darkred', none: 'default',
};
const statusNames: Record<string, string> = {
  PASS: '通过', MINOR_REVISE: '轻度修改', MAJOR_REVISE: '重大修改', REWRITE: '重写', BLOCKED: '阻塞', none: '未审核',
};

const routeNames: Record<string, { label: string; color: string }> = {
  minor_ai_flavor: { label: '轻度去味', color: 'orange' },
  hook_enhance: { label: '强化Hook', color: 'blue' },
  pace_compress: { label: '压缩节奏', color: 'purple' },
  character_rewrite: { label: '人设重写', color: 'red' },
  setting_conflict: { label: '设定重建', color: 'magenta' },
  outline_mismatch: { label: '大纲重生成', color: 'volcano' },
  full_rewrite: { label: '整章重写', color: 'red' },
};

export default function QualityCenter() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AuditReport[]>([]);
  const [qualityData, setQualityData] = useState<QualityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [detail, setDetail] = useState<AuditReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rewriting, setRewriting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const url = projectId ? `/audit-reports?projectId=${projectId}` : '/audit-reports';
    api.get(url).then((r: any) => setData(extractList(r)))
      .catch(() => setData([])).finally(() => setLoading(false));
  };

  const loadQuality = () => {
    if (!projectId) return;
    api.get(`/quality-center/project/${projectId}`)
      .then((r: any) => setQualityData(Array.isArray(r) ? r : []))
      .catch(() => setQualityData([]));
  };

  useEffect(() => { load(); loadQuality(); }, [projectId]);

  const showDetail = async (id: string) => {
    try {
      const res = await api.get(`/audit-reports/${id}`);
      setDetail(res as unknown as AuditReport);
      setDrawerOpen(true);
    } catch { /* ignore */ }
  };

  const handleQuickRewrite = async (chapterId: string, route?: string) => {
    setRewriting(chapterId);
    try {
      const res: any = await api.post('/quality-center/quick-rewrite', { chapterId, route });
      message.success(`重写已启动：${res.routeReason || '正在重写...'}`);
      if (res.workflowId) {
        navigate(`/projects/${projectId}/workflow`);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || '重写失败');
    } finally {
      setRewriting(null);
    }
  };

  const qualityMap = Object.fromEntries(qualityData.map(q => [q.chapterId, q]));

  const columns = [
    { title: '章节', dataIndex: ['chapter', 'title'], key: 'chapter',
      render: (v: string, r: AuditReport) => r.chapter ? `第${r.chapter.chapterNo}章 ${r.chapter.title || ''}` : '-' },
    { title: '总分', dataIndex: 'totalScore', key: 'totalScore', width: 80,
      render: (v: number) => <Text strong style={{ color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>{v}</Text> },
    { title: '状态', dataIndex: 'passStatus', key: 'passStatus', width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{statusNames[v] || v}</Tag> },
    { title: '重写建议', key: 'route', width: 120,
      render: (_: any, r: AuditReport) => {
        const q = qualityMap[r.chapterId];
        if (!q?.recommendedRoute) return <Text type="secondary">-</Text>;
        const cfg = routeNames[q.recommendedRoute] || { label: q.recommendedRoute, color: 'default' };
        return <Tooltip title={q.routeReason}><Tag color={cfg.color}>{cfg.label}</Tag></Tooltip>;
      },
    },
    { title: '审核模型', dataIndex: 'auditorModel', key: 'auditorModel', width: 140 },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', key: 'action', width: 160,
      render: (_: any, r: AuditReport) => {
        const q = qualityMap[r.chapterId];
        const canRewrite = q?.recommendedRoute && r.passStatus !== 'PASS';
        return (
          <Space>
            <a onClick={() => showDetail(r.id)}>详情</a>
            {canRewrite && (
              <Popconfirm
                title={`确定一键重写？将执行：${routeNames[q.recommendedRoute || '']?.label || q.recommendedRoute}`}
                onConfirm={() => handleQuickRewrite(r.chapterId, q.recommendedRoute || undefined)}
              >
                <Button size="small" type="primary" ghost icon={<ThunderboltOutlined />}
                  loading={rewriting === r.chapterId}>
                  重写
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const passCount = data.filter(d => d.passStatus === 'PASS').length;
  const failCount = data.filter(d => d.passStatus !== 'PASS').length;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.totalScore, 0) / data.length) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {projectId && <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)}>返回</Button>}
          <Title level={4} style={{ margin: 0 }}>剧情质量中心</Title>
        </div>
        <Space>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
          <Button icon={<ReloadOutlined />} onClick={() => { load(); loadQuality(); }}>刷新</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">平均分</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: avgScore >= 80 ? '#52c41a' : avgScore >= 60 ? '#faad14' : '#ff4d4f' }}>
            {avgScore}
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">通过</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{passCount}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">需修改</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: failCount > 0 ? '#ff4d4f' : '#52c41a' }}>{failCount}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">通过率</Text>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {data.length > 0 ? <Progress type="circle" percent={Math.round(passCount / data.length * 100)} size={40} /> : '-'}
          </div>
        </Card>
      </div>

      <Card>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 20 }} size="small" />
      </Card>

      <Drawer title="审核报告详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={560}>
        {detail ? (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="章节">
                {detail.chapter ? `第${detail.chapter.chapterNo}章 ${detail.chapter.title || ''}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="总分">
                <Text strong style={{ fontSize: 20, color: detail.totalScore >= 80 ? '#52c41a' : '#ff4d4f' }}>
                  {detail.totalScore}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[detail.passStatus]}>{statusNames[detail.passStatus]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="审核模型">{detail.auditorModel || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核时间">
                {new Date(detail.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>20维度评分</Divider>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {(() => {
                try { return JSON.stringify(JSON.parse(detail.dimensionScores), null, 2); }
                catch { return detail.dimensionScores; }
              })()}
            </pre>

            <Divider>问题</Divider>
            <pre style={{ background: '#fff2f0', padding: 12, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', color: '#cf1322' }}>
              {detail.issues}
            </pre>

            <Divider>修改建议</Divider>
            <pre style={{ background: '#f6ffed', padding: 12, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', color: '#389e0d' }}>
              {detail.suggestions}
            </pre>

            {(() => {
              const q = qualityMap[detail.chapterId];
              if (!q?.recommendedRoute) return null;
              const cfg = routeNames[q.recommendedRoute] || { label: q.recommendedRoute, color: 'default' };
              return (
                <>
                  <Divider>一键重写</Divider>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Tag color={cfg.color}>{cfg.label}</Tag>
                      <Text type="secondary">{q.routeReason}</Text>
                    </div>
                    <Button type="primary" icon={<ThunderboltOutlined />}
                      loading={rewriting === detail.chapterId}
                      onClick={() => handleQuickRewrite(detail.chapterId, q.recommendedRoute || undefined)}>
                      执行一键重写
                    </Button>
                  </Space>
                </>
              );
            })()}
          </div>
        ) : <Skeleton active />}
      </Drawer>
    </div>
  );
}
