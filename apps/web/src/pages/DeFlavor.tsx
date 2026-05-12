import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Drawer, Descriptions, Space, Select, Divider, Typography, message, Input, Tabs } from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, ScanOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api, { extractList } from '../services/api';
import ModelSelector from '../components/ModelSelector';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface RevisionRecord {
  id: string; projectId: string; chapterId: string;
  originalContent: string; revisedContent: string;
  aiDeFlavorModes: string; revisionSummary?: string;
  beforeScore?: number; afterScore?: number;
  createdAt: string;
}

const INTENSITY_OPTIONS = [
  { value: 'light', label: '轻度去味 (A类7种)' },
  { value: 'standard', label: '标准去味 (A+B+C 19种)' },
  { value: 'strong', label: '强力去味 (A+B+C+D+E 29种)' },
];

const CATEGORY_COLORS: Record<string, string> = {
  A: 'red', B: 'orange', C: 'blue', D: 'green', E: 'purple',
};

const CATEGORY_NAMES: Record<string, string> = {
  A: 'A类 句式去味', B: 'B类 叙事去味', C: 'C类 对白去味', D: 'D类 节奏去味', E: 'E类 番茄风增强',
};

export default function DeFlavor() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [detail, setDetail] = useState<RevisionRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modes, setModes] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [intensity, setIntensity] = useState<string>('standard');
  const [content, setContent] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [detectLoading, setDetectLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const url = projectId ? `/revision-records?projectId=${projectId}` : '/revision-records';
    api.get(url).then((r: any) => setData(extractList(r)))
      .catch(() => setData([])).finally(() => setLoading(false));
  };

  const loadModes = async () => {
    try {
      const [modesData, summaryData] = await Promise.all([
        api.get('/deai-flavor/modes'),
        api.get('/deai-flavor/modes/summary'),
      ]);
      setModes(modesData as any);
      setSummary(summaryData as any);
    } catch {}
  };

  useEffect(() => { load(); loadModes(); }, [projectId]);

  const handleDetect = async () => {
    if (!content.trim()) { message.warning('请输入待检测内容'); return; }
    setDetectLoading(true);
    try {
      const res = await api.post('/deai-flavor/detect', { content, intensity });
      setResult(res);
    } catch { message.error('检测失败'); }
    finally { setDetectLoading(false); }
  };

  const handleExecute = async () => {
    if (!content.trim()) { message.warning('请输入待处理内容'); return; }
    setDetectLoading(true);
    try {
      const res = await api.post('/deai-flavor/execute', { content, intensity });
      setResult(res);
      message.success('去味处理完成');
    } catch { message.error('处理失败'); }
    finally { setDetectLoading(false); }
  };

  const columns = [
    { title: '修订前评分', dataIndex: 'beforeScore', key: 'beforeScore', width: 100,
      render: (v: number) => v !== null ? <Text type="danger">{v}</Text> : '-' },
    { title: '修订后评分', dataIndex: 'afterScore', key: 'afterScore', width: 100,
      render: (v: number) => v !== null ? <Text type="success">{v}</Text> : '-' },
    { title: '去味模式', dataIndex: 'aiDeFlavorModes', key: 'aiDeFlavorModes', ellipsis: true,
      render: (v: string) => {
        try {
          const m = JSON.parse(v);
          return Array.isArray(m) ? m.slice(0, 3).map((x: string) => <Tag key={x} style={{ marginBottom: 2 }}>{x}</Tag>) : v;
        } catch { return <Tag>{v}</Tag>; }
      }},
    { title: '修订说明', dataIndex: 'revisionSummary', key: 'revisionSummary', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', key: 'action', width: 80,
      render: (_: any, r: RevisionRecord) => <a onClick={() => { setDetail(r); setDrawerOpen(true); }}>对比</a> },
  ];

  const modeColumns = [
    { title: '类别', dataIndex: 'category', key: 'category', render: (c: string) => <Tag color={CATEGORY_COLORS[c]}>{CATEGORY_NAMES[c]}</Tag> },
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '检测模式', key: 'patterns', width: 90, render: (_: any, r: any) => r.checkPatterns?.length || 0 },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {projectId && <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)}>返回</Button>}
          <div>
            <Title level={4} style={{ margin: 0 }}>AI去味 - 29种模式</Title>
            <Text type="secondary">降低AI生成文本模板感，支持三档强度</Text>
          </div>
        </div>
        <Space>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      </div>

      <Tabs items={[
        {
          key: 'detect',
          label: '检测与去味',
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card title="强度选择">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select value={intensity} onChange={setIntensity} options={INTENSITY_OPTIONS} style={{ width: 400 }} />
                  <Space wrap>
                    {Object.entries(summary).map(([cat, info]: [string, any]) => (
                      <Tag key={cat} color={CATEGORY_COLORS[cat]}>{CATEGORY_NAMES[cat]}: {info.count}种</Tag>
                    ))}
                  </Space>
                </Space>
              </Card>
              <Card title="输入内容">
                <TextArea value={content} onChange={e => setContent(e.target.value)} rows={8}
                  placeholder="粘贴小说正文进行AI味检测..." style={{ marginBottom: 12 }} />
                <Space>
                  <Button icon={<ScanOutlined />} onClick={handleDetect} loading={detectLoading}>仅检测</Button>
                  <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleExecute} loading={detectLoading}>检测+去味</Button>
                </Space>
              </Card>
              {result && (
                <Card title="检测结果">
                  {result.detectedIssues?.length > 0 ? (
                    <>
                      <Title level={5}>检测到 {result.detectedIssues.length} 种AI味问题</Title>
                      {result.detectedIssues.map((issue: any, i: number) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <Tag color={CATEGORY_COLORS[issue.category]}>{issue.category}</Tag>
                          <Text strong>{issue.mode}</Text>
                          <Text type="secondary"> ({issue.matches.length}处)</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>匹配: {issue.matches.join('、')}</Text>
                        </div>
                      ))}
                      <Divider />
                      {result.appliedModes?.length > 0 && <Paragraph><Text strong>已应用去味: </Text>{result.appliedModes.join('、')}</Paragraph>}
                      {result.summary && <Paragraph type="secondary">{result.summary}</Paragraph>}
                    </>
                  ) : <Text type="success">未检测到AI味问题</Text>}
                </Card>
              )}
            </Space>
          ),
        },
        {
          key: 'modes',
          label: '29种模式一览',
          children: (
            <Card>
              <Table dataSource={modes} columns={modeColumns} rowKey="id" size="small" pagination={false} />
            </Card>
          ),
        },
        {
          key: 'records',
          label: '修订记录',
          children: (
            <Card>
              <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="small" />
            </Card>
          ),
        },
      ]} />

      <Drawer title="修订前后对比" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={700}>
        {detail ? (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="修订前评分">{detail.beforeScore ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="修订后评分">{detail.afterScore ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="修订说明" span={2}>{detail.revisionSummary || '-'}</Descriptions.Item>
            </Descriptions>
            <Divider>原文</Divider>
            <pre style={{ background: '#fff2f0', padding: 12, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{detail.originalContent}</pre>
            <Divider>修订后</Divider>
            <pre style={{ background: '#f6ffed', padding: 12, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{detail.revisedContent}</pre>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
