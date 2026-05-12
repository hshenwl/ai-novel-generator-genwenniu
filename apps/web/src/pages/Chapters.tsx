import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, message, Empty, Select, Space, Typography, Popconfirm, Statistic, Row, Col, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

interface Chapter {
  id: string;
  volumeId: string;
  chapterOutlineId?: string;
  chapterNo: number;
  title?: string;
  content: string;
  wordCount: number;
  version: number;
  status: string;
  auditScore?: number;
  publishedAt?: string;
  createdAt: string;
}

interface Volume {
  id: string;
  title: string;
  orderIndex: number;
}

const statusColors: Record<string, string> = {
  draft: 'default', review: 'processing', published: 'success', revising: 'warning', blocked: 'error',
};
const statusLabels: Record<string, string> = {
  draft: '草稿', review: '审核中', published: '已发布', revising: '修订中', blocked: '阻塞',
};

export default function Chapters() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    api.get(`/volumes/project/${projectId}`).then((r: any) => {
      const vols = extractList<Volume>(r);
      setVolumes(vols);
      if (vols.length > 0 && !selectedVolumeId) {
        setSelectedVolumeId(vols[0].id);
      }
    });
  }, [projectId]);

  useEffect(() => {
    if (!selectedVolumeId) { setChapters([]); return; }
    setLoading(true);
    api.get(`/chapters/volume/${selectedVolumeId}`)
      .then((r: any) => setChapters(extractList<Chapter>(r)))
      .catch(() => message.error('加载章节失败'))
      .finally(() => setLoading(false));
  }, [selectedVolumeId]);

  const handleDelete = async (chapterId: string) => {
    try {
      await api.delete(`/chapters/${chapterId}`);
      message.success('已删除');
      if (selectedVolumeId) {
        const r: any = await api.get(`/chapters/volume/${selectedVolumeId}`);
        setChapters(extractList<Chapter>(r));
      }
    } catch { message.error('删除失败'); }
  };

  const totalWords = chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);
  const publishedCount = chapters.filter(c => c.status === 'published').length;
  const avgScore = chapters.filter(c => c.auditScore).reduce((sum, c, _, arr) => sum + (c.auditScore || 0) / arr.length, 0);

  const columns = [
    { title: '章节', dataIndex: 'chapterNo', key: 'chapterNo', width: 70, sorter: (a: Chapter, b: Chapter) => a.chapterNo - b.chapterNo },
    { title: '标题', dataIndex: 'title', key: 'title', width: 200,
      render: (v: string, r: Chapter) => (
        <a onClick={() => navigate(`/projects/${projectId}/chapters/${r.id}/edit`)}>
          {v || `第${r.chapterNo}章`}
        </a>
      ) },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag> },
    { title: '字数', dataIndex: 'wordCount', key: 'wordCount', width: 90,
      render: (v: number) => <Text>{(v || 0).toLocaleString()}</Text> },
    { title: '审核分', dataIndex: 'auditScore', key: 'auditScore', width: 80,
      render: (v?: number) => v ? (
        <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v.toFixed(1)}</Tag>
      ) : <Text type="secondary">-</Text> },
    { title: '版本', dataIndex: 'version', key: 'version', width: 60 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110, render: (v: string) => v?.slice(0, 10) },
    { title: '操作', key: 'action', width: 140, render: (_: any, r: Chapter) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/projects/${projectId}/chapters/${r.id}/edit`)} />
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="章节管理"
        subtitle={selectedVolumeId ? `${chapters.length} 章` : '请先选择卷'}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/projects/${projectId}/chapters/new/edit`)}>
            写新章节
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>选择卷：</Text>
          <Select
            style={{ width: 300 }}
            placeholder="选择要查看的卷"
            value={selectedVolumeId}
            onChange={setSelectedVolumeId}
            options={volumes.map(v => ({ label: `${v.title} (第${v.orderIndex}卷)`, value: v.id }))}
          />
        </Space>
      </Card>

      {selectedVolumeId && chapters.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="总章数" value={chapters.length} prefix={<FileTextOutlined />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="已发布" value={publishedCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="总字数" value={totalWords} suffix="字" /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="平均审核分" value={avgScore ? avgScore.toFixed(1) : '-'} valueStyle={{ color: avgScore >= 80 ? '#52c41a' : '#faad14' }} /></Card>
          </Col>
        </Row>
      )}

      <Card>
        <Table
          dataSource={chapters}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={chapters.length > 20 ? { pageSize: 20 } : false}
          locale={{
            emptyText: selectedVolumeId ? (
              <Empty description="该卷暂无章节" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" onClick={() => navigate(`/projects/${projectId}/chapter-outlines?volumeId=${selectedVolumeId}`)}>
                  去创建章纲
                </Button>
              </Empty>
            ) : <Empty description="请先选择卷" />,
          }}
        />
      </Card>
    </div>
  );
}
