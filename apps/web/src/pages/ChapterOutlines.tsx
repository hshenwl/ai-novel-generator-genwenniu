import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, message, Popconfirm, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, RocketOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import ModelSelector from '../components/ModelSelector';

const { Text } = Typography;
const { TextArea } = Input;

interface Volume {
  id: string;
  title: string;
  orderIndex: number;
}

interface ChapterOutline {
  id: string;
  chapterNo: number;
  title: string;
  summary: string;
  conflict: string;
  openingHook: string;
  endingHook: string;
  inChapterHook: string;
  coolPoints: string;
  emotionalPoint: string;
  foreshadows: string;
  characters: string;
  scenes: string;
  status: string;
}

export default function ChapterOutlines() {
  const { id: projectId } = useParams();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState<string>('');
  const [outlines, setOutlines] = useState<ChapterOutline[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterOutline | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [form] = Form.useForm();

  // 加载卷列表
  useEffect(() => {
    api.get(`/volumes/project/${projectId}`).then((res: any) => {
      const list = Array.isArray(res) ? res : res?.items || [];
      setVolumes(list);
      if (list.length > 0 && !selectedVolumeId) {
        setSelectedVolumeId(list[0].id);
      }
    });
  }, [projectId]);

  // 加载章纲
  const loadOutlines = () => {
    if (!selectedVolumeId) return;
    setLoading(true);
    api.get(`/chapter-outlines/volume/${selectedVolumeId}`)
      .then((res: any) => setOutlines(Array.isArray(res) ? res : []))
      .catch(() => message.error('加载章纲失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOutlines();
  }, [selectedVolumeId]);

  const selectedVolume = volumes.find(v => v.id === selectedVolumeId);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/chapter-outlines/${editing.id}`, values);
        message.success('章纲已更新');
      } else {
        await api.post('/chapter-outlines', { ...values, projectId, volumeId: selectedVolumeId });
        message.success('章纲已创建');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadOutlines();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (outlineId: string) => {
    try {
      await api.delete(`/chapter-outlines/${outlineId}`);
      message.success('章纲已删除');
      loadOutlines();
    } catch {
      message.error('删除失败');
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    if (outlines.length > 0) {
      const maxNo = Math.max(...outlines.map(o => o.chapterNo));
      form.setFieldsValue({ chapterNo: maxNo + 1 });
    } else {
      form.setFieldsValue({ chapterNo: 1 });
    }
    setModalOpen(true);
  };

  const handleAIGenerateOutlines = async () => {
    if (!selectedVolumeId) { message.warning('请先选择卷'); return; }
    setGenerating(true);
    const hide = message.loading('AI正在批量生成章纲...', 0);
    try {
      const startNo = outlines.length > 0 ? Math.max(...outlines.map(o => o.chapterNo)) + 1 : 1;
      const res: any = await api.post('/engine/chapter/generate', {
        projectId,
        context: {
          task: 'chapter_outline_generate',
          projectId,
          volumeId: selectedVolumeId,
          startChapterNo: startNo,
          count: 5,
        },
        mode: 'quick',
        model: selectedModel || undefined,
      });
      hide();
      if (res?.workflow?.result?.outlines && Array.isArray(res.workflow.result.outlines)) {
        // 批量创建章纲
        for (const outline of res.workflow.result.outlines) {
          try {
            await api.post('/chapter-outlines', {
              ...outline,
              projectId,
              volumeId: selectedVolumeId,
            });
          } catch { /* skip duplicates */ }
        }
        loadOutlines();
        message.success(`AI已生成 ${res.workflow.result.outlines.length} 条章纲`);
      } else if (res?.workflow?.result) {
        message.info('AI已生成内容，但格式无法自动解析。请手动添加章纲。');
      } else {
        message.info('AI引擎未连接，请先在模型配置中添加AI模型');
      }
    } catch {
      hide();
      message.error('AI生成失败，请检查模型配置');
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (outline: ChapterOutline) => {
    setEditing(outline);
    form.setFieldsValue(outline);
    setModalOpen(true);
  };

  const columns = [
    {
      title: '章序',
      dataIndex: 'chapterNo',
      key: 'chapterNo',
      width: 70,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 160,
      render: (text: string, record: ChapterOutline) => (
        <Text strong>{text || `第${record.chapterNo}章`}</Text>
      ),
    },
    {
      title: '剧情梗概',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: '冲突',
      dataIndex: 'conflict',
      key: 'conflict',
      width: 100,
      ellipsis: true,
      render: (v: string) => v ? <Tag color="red">{v}</Tag> : '-',
    },
    {
      title: '开篇Hook',
      dataIndex: 'openingHook',
      key: 'openingHook',
      width: 100,
      ellipsis: true,
      render: (v: string) => v ? <Tag color="green">{v}</Tag> : '-',
    },
    {
      title: '章末Hook',
      dataIndex: 'endingHook',
      key: 'endingHook',
      width: 100,
      ellipsis: true,
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : <Tag color="red">缺失</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => {
        const colors: Record<string, string> = { draft: 'default', ready: 'green', done: 'blue' };
        const names: Record<string, string> = { draft: '草稿', ready: '就绪', done: '已完成' };
        return <Tag color={colors[v] || 'default'}>{names[v] || v}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ChapterOutline) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除此章纲?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="章纲管理"
        subtitle="每卷的章节大纲，为正文生成提供结构化输入"
        extra={
          <Space>
            <Select
              value={selectedVolumeId}
              onChange={setSelectedVolumeId}
              placeholder="选择卷"
              style={{ width: 200 }}
              options={volumes.map(v => ({
                label: `第${v.orderIndex}卷 · ${v.title}`,
                value: v.id,
              }))}
            />
            <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
            <Button icon={<RocketOutlined />} onClick={handleAIGenerateOutlines} loading={generating} disabled={!selectedVolumeId}>
              AI批量生成章纲
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedVolumeId}>
              新建章纲
            </Button>
          </Space>
        }
      />

      <Card>
        {selectedVolume ? (
          <Table
            dataSource={outlines}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 900 }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <p>请先创建卷后再管理章纲</p>
          </div>
        )}
      </Card>

      <Modal
        title={editing ? '编辑章纲' : '新建章纲'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="chapterNo" label="章节编号" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="title" label="章节标题" style={{ flex: 1 }}>
              <Input placeholder="留空则自动编号" />
            </Form.Item>
            <Form.Item name="status" label="状态" initialValue="draft">
              <Select style={{ width: 100 }}>
                <Select.Option value="draft">草稿</Select.Option>
                <Select.Option value="ready">就绪</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="summary" label="剧情梗概">
            <TextArea rows={3} placeholder="本章主要事件" />
          </Form.Item>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="conflict" label="核心冲突" style={{ flex: 1 }}>
              <Input placeholder="冲突点" />
            </Form.Item>
            <Form.Item name="emotionalPoint" label="情绪爆点" style={{ flex: 1 }}>
              <Input placeholder="愤怒/期待/震惊等" />
            </Form.Item>
            <Form.Item name="coolPoints" label="爽点设计" style={{ flex: 1 }}>
              <Input placeholder="打脸/升级/奖励等" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="openingHook" label="开篇Hook" style={{ flex: 1 }}>
              <Input placeholder="开头吸引点" />
            </Form.Item>
            <Form.Item name="inChapterHook" label="章内Hook" style={{ flex: 1 }}>
              <Input placeholder="中段持续期待点" />
            </Form.Item>
            <Form.Item name="endingHook" label="章末Hook" style={{ flex: 1 }}>
              <Input placeholder="结尾追读点（必填）" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="characters" label="出场角色" style={{ flex: 1 }}>
              <Input placeholder="角色名，逗号分隔" />
            </Form.Item>
            <Form.Item name="scenes" label="场景地点" style={{ flex: 1 }}>
              <Input placeholder="主要场景" />
            </Form.Item>
            <Form.Item name="foreshadows" label="伏笔" style={{ flex: 1 }}>
              <Input placeholder="埋设/回收伏笔" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
