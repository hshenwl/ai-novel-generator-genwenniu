import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, message, Space, Popconfirm, Tag, Select, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, RocketOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';
import ModelSelector from '../components/ModelSelector';

const { TextArea } = Input;
const { Text } = Typography;

interface Volume {
  id: string;
  projectId: string;
  orderIndex: number;
  title: string;
  description?: string;
  outline?: string;
  targetChapterCount: number;
  targetWordsPerChapter: number;
  status: string;
  createdAt: string;
}

export default function Volumes() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Volume | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [aiForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get(`/volumes/project/${projectId}`)
      .then((res: any) => setVolumes(extractList<Volume>(res)))
      .catch(() => message.error('加载卷列表失败'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [projectId]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        const updatePayload = { ...values };
        if (updatePayload.orderIndex) updatePayload.orderIndex = Number(updatePayload.orderIndex);
        if (updatePayload.targetChapterCount) updatePayload.targetChapterCount = Number(updatePayload.targetChapterCount) || 50;
        if (updatePayload.targetWordsPerChapter) updatePayload.targetWordsPerChapter = Number(updatePayload.targetWordsPerChapter) || 2500;
        await api.put(`/volumes/${editing.id}`, updatePayload);
      } else {
        const payload = { ...values, projectId };
        if (payload.orderIndex) payload.orderIndex = Number(payload.orderIndex);
        if (payload.targetChapterCount) payload.targetChapterCount = Number(payload.targetChapterCount) || 50;
        if (payload.targetWordsPerChapter) payload.targetWordsPerChapter = Number(payload.targetWordsPerChapter) || 2500;
        await api.post('/volumes', payload);
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch { message.error('操作失败'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (volumeId: string) => {
    try { await api.delete(`/volumes/${volumeId}`); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const handleAIGenerate = async () => {
    const values = await aiForm.validateFields();
    setAiGenerating(true);
    const hide = message.loading('AI正在生成卷纲...', 0);
    try {
      const res: any = await api.post('/engine/chapter/generate', {
        projectId,
        context: {
          task: 'volume_generation',
          volumeCount: Number(values.volumeCount) || 3,
          chapterCount: Number(values.chapterCount) || 50,
          wordCount: Number(values.wordCount) || 2500,
          prompt: `请生成${values.volumeCount || 3}卷的小说卷纲，每卷${values.chapterCount || 50}章，每章${values.wordCount || 2500}字。请返回JSON格式的卷纲列表。`,
        },
        mode: 'quick',
        model: selectedModel || undefined,
      });
      hide();
      const wf = res?.workflow;
      if (wf?.result) {
        message.success('AI已生成卷纲，请检查后保存');
        load();
      } else if (wf?.status === 'failed') {
        message.error(`AI生成失败: ${wf?.error || '上游API暂时不可用'}`);
      } else {
        message.warning('AI引擎未返回结果，请稍后重试');
      }
      setAiModalOpen(false);
    } catch (err: any) {
      hide();
      message.error(`AI生成失败: ${err?.response?.data?.message || err?.message || '请检查网络'}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'default', active: 'processing', completed: 'success', archived: 'warning',
  };
  const statusLabels: Record<string, string> = {
    draft: '草稿', active: '进行中', completed: '已完成', archived: '已归档',
  };

  const columns = [
    { title: '顺序', dataIndex: 'orderIndex', key: 'orderIndex', width: 70, sorter: (a: Volume, b: Volume) => a.orderIndex - b.orderIndex },
    { title: '卷名', dataIndex: 'title', key: 'title', width: 200,
      render: (text: string, record: Volume) => (
        <a onClick={() => navigate(`/projects/${projectId}/chapter-outlines?volumeId=${record.id}`)}>
          <BookOutlined style={{ marginRight: 4 }} />{text}
        </a>
      ) },
    { title: '目标章节数', dataIndex: 'targetChapterCount', key: 'targetChapterCount', width: 110,
      render: (v: number) => <Text>{v || 50} 章</Text> },
    { title: '每章字数', dataIndex: 'targetWordsPerChapter', key: 'targetWordsPerChapter', width: 110,
      render: (v: number) => <Text>{(v || 2500).toLocaleString()} 字</Text> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      render: (v: string) => v?.slice(0, 10) },
    { title: '操作', key: 'action', width: 150, render: (_: any, r: Volume) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }} />
        <Popconfirm title="确认删除该卷及所有章节？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="卷纲管理"
        subtitle={`共 ${volumes.length} 卷`}
        extra={
          <Space>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
            <Button icon={<RocketOutlined />} onClick={() => { aiForm.resetFields(); setAiModalOpen(true); }}>AI生成卷纲</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建卷</Button>
          </Space>
        }
      />
      <Card>
        <Table dataSource={volumes} columns={columns} rowKey="id" loading={loading} pagination={false}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: 8 }}>
                {record.description && <p><Text type="secondary">描述：</Text>{record.description}</p>}
                {record.outline && <p><Text type="secondary">卷纲：</Text><span style={{ whiteSpace: 'pre-wrap' }}>{record.outline}</span></p>}
              </div>
            ),
          }}
        />
      </Card>
      <Modal
        title={editing ? '编辑卷' : '新建卷'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="title" label="卷名" rules={[{ required: true }]}><Input placeholder="例：第一卷 初入修仙界" /></Form.Item>
            <Form.Item name="orderIndex" label="顺序号" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="targetChapterCount" label="目标章节数" initialValue={50}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="targetWordsPerChapter" label="每章目标字数" initialValue={2500}><InputNumber min={500} step={500} style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="status" label="状态" initialValue="draft">
            <Select options={[
              { label: '草稿', value: 'draft' },
              { label: '进行中', value: 'active' },
              { label: '已完成', value: 'completed' },
              { label: '已归档', value: 'archived' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="卷描述"><TextArea rows={2} placeholder="本卷的主要内容和目标..." /></Form.Item>
          <Form.Item name="outline" label="卷纲详情"><TextArea rows={6} placeholder="本卷的详细大纲，包括主线推进、关键事件、爽点安排等..." /></Form.Item>
        </Form>
      </Modal>
      <Modal
        title="AI生成卷纲"
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        onOk={handleAIGenerate}
        confirmLoading={aiGenerating}
      >
        <Form form={aiForm} layout="vertical" initialValues={{ volumeCount: 3, chapterCount: 50, wordCount: 2500 }}>
          <Form.Item name="volumeCount" label="生成卷数" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="chapterCount" label="每卷章节数">
            <InputNumber min={1} max={500} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="wordCount" label="每章字数">
            <InputNumber min={500} max={10000} step={500} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
