import { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Timeline, Progress, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, ArrowLeftOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api, { extractList } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Foreshadow {
  id: string;
  name: string;
  type: string;
  description: string;
  plantedChapter?: number;
  expectedChapter?: number;
  resolvedChapter?: number | null;
  status: string;
  importance: string;
  relatedCharacters?: string[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

const Foreshadows: React.FC = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [foreshadows, setForeshadows] = useState<Foreshadow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingForeshadow, setEditingForeshadow] = useState<Foreshadow | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchForeshadows(); }, [projectId]);

  const fetchForeshadows = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(`/foreshadows/project/${projectId}`);
      setForeshadows(extractList(res));
    } catch { message.error('获取伏笔列表失败'); }
    finally { setLoading(false); }
  };

  const handleAdd = () => {
    setEditingForeshadow(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (foreshadow: Foreshadow) => {
    setEditingForeshadow(foreshadow);
    form.setFieldsValue(foreshadow);
    setModalVisible(true);
  };

  const handleResolve = async (foreshadow: Foreshadow) => {
    try {
      await api.post(`/foreshadows/${foreshadow.id}/resolve`, {});
      message.success(`伏笔「${foreshadow.name}」已标记为回收`);
      fetchForeshadows();
    } catch { message.error('回收操作失败'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/foreshadows/${id}`);
      message.success('删除成功');
      fetchForeshadows();
    } catch { message.error('删除失败'); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingForeshadow) {
        await api.put(`/foreshadows/${editingForeshadow.id}`, values);
      } else {
        await api.post('/foreshadows', { ...values, projectId, status: 'planted' });
      }
      message.success('保存成功');
      setModalVisible(false);
      fetchForeshadows();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('保存失败');
    }
  };

  const getStatusTag = (status: string) => {
    const cfg: Record<string, { color: string; text: string }> = {
      planted: { color: 'processing', text: '待回收' },
      partial: { color: 'warning', text: '部分回收' },
      resolved: { color: 'success', text: '已回收' },
      abandoned: { color: 'default', text: '已废弃' },
    };
    const c = cfg[status] || cfg.planted;
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getImportanceTag = (importance: string) => {
    const colors: Record<string, string> = { core: 'red', important: 'orange', normal: 'default' };
    const texts: Record<string, string> = { core: '核心', important: '重要', normal: '普通' };
    return <Tag color={colors[importance]}>{texts[importance] || importance}</Tag>;
  };

  const totalChapters = 100;
  const stats = {
    total: foreshadows.length,
    resolved: foreshadows.filter(f => f.status === 'resolved').length,
    planted: foreshadows.filter(f => f.status === 'planted').length,
    overdue: foreshadows.filter(f => f.status === 'planted' && (f.expectedChapter || 0) < totalChapters * 0.5).length,
  };

  const columns = [
    {
      title: '伏笔名称', dataIndex: 'name', key: 'name',
      render: (name: string, record: Foreshadow) => (
        <Space>{getImportanceTag(record.importance)}<Text strong>{name}</Text></Space>
      ),
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (t: string) => <Tag>{t}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, width: 200 },
    { title: '埋设', dataIndex: 'plantedChapter', key: 'plantedChapter', width: 60, render: (c: number) => c ? `第${c}章` : '-' },
    { title: '预计回收', dataIndex: 'expectedChapter', key: 'expectedChapter', width: 80, render: (c: number) => c ? `第${c}章` : '-' },
    { title: '实际回收', dataIndex: 'resolvedChapter', key: 'resolvedChapter', width: 80, render: (c: number | null) => c ? `第${c}章` : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (s: string) => getStatusTag(s) },
    {
      title: '进度', key: 'progress', width: 100,
      render: (_: any, record: Foreshadow) => {
        if (record.status === 'resolved') return <Progress percent={100} size="small" />;
        const exp = record.expectedChapter || 100;
        const progress = Math.min(100, Math.round((totalChapters / exp) * 100));
        return <Progress percent={progress} size="small" status={progress > 80 ? 'exception' : 'active'} />;
      },
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_: any, record: Foreshadow) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          {record.status === 'planted' && (
            <Button size="small" type="primary" ghost onClick={() => handleResolve(record)}>回收</Button>
          )}
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)}>返回</Button>
          <Title level={3} style={{ margin: 0 }}>伏笔时间线</Title>
        </div>
        <Space>
          <Text type="secondary">完成：{stats.resolved}/{stats.total}{stats.total > 0 ? ` (${Math.round(stats.resolved / stats.total * 100)}%)` : ''}</Text>
          <Button icon={<ReloadOutlined />} onClick={fetchForeshadows}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增伏笔</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1 }}><Text type="secondary">伏笔总数</Text><Title level={2} style={{ margin: 0 }}>{stats.total}</Title></Card>
        <Card size="small" style={{ flex: 1 }}><Text type="secondary">待回收</Text><Title level={2} style={{ margin: 0, color: '#1890ff' }}>{stats.planted}</Title></Card>
        <Card size="small" style={{ flex: 1 }}><Text type="secondary">已回收</Text><Title level={2} style={{ margin: 0, color: '#52c41a' }}>{stats.resolved}</Title></Card>
        <Card size="small" style={{ flex: 1 }}><Text type="secondary">可能超期</Text><Title level={2} style={{ margin: 0, color: stats.overdue > 0 ? '#ff4d4f' : '#52c41a' }}>{stats.overdue}</Title></Card>
      </div>

      {foreshadows.filter(f => f.status === 'planted').length > 0 && (
        <Card title="伏笔时间线" style={{ marginBottom: 16 }}>
          <Timeline
            items={foreshadows
              .filter(f => f.status === 'planted')
              .sort((a, b) => (a.expectedChapter || 0) - (b.expectedChapter || 0))
              .slice(0, 5)
              .map(f => ({
                color: f.importance === 'core' ? 'red' : f.importance === 'important' ? 'orange' : 'blue',
                children: (
                  <div>
                    <Text strong>{f.name}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      第{f.plantedChapter || '?'}章埋设 → 预计第{f.expectedChapter || '?'}章回收
                    </Text>
                    <br />
                    <Text type="secondary">{f.description}</Text>
                  </div>
                ),
              }))}
          />
        </Card>
      )}

      <Card>
        <Table columns={columns} dataSource={foreshadows} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal title={editingForeshadow ? '编辑伏笔' : '新增伏笔'} open={modalVisible} onCancel={() => setModalVisible(false)} onOk={handleSubmit} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item label="伏笔名称" name="name" rules={[{ required: true }]}><Input placeholder="伏笔名称" /></Form.Item>
          <Form.Item label="类型" name="type">
            <Select>
              <Select.Option value="身份">身份</Select.Option>
              <Select.Option value="秘密">秘密</Select.Option>
              <Select.Option value="能力">能力</Select.Option>
              <Select.Option value="关系">关系</Select.Option>
              <Select.Option value="道具">道具</Select.Option>
              <Select.Option value="背景">背景</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="重要程度" name="importance">
            <Select>
              <Select.Option value="core">核心（必须回收）</Select.Option>
              <Select.Option value="important">重要</Select.Option>
              <Select.Option value="normal">普通</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="描述" name="description"><TextArea rows={3} placeholder="伏笔内容描述" /></Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item label="埋设章节" name="plantedChapter" style={{ width: 120 }}><Input type="number" placeholder="第几章" /></Form.Item>
            <Form.Item label="预计回收章节" name="expectedChapter" style={{ width: 120 }}><Input type="number" placeholder="第几章" /></Form.Item>
          </Space>
          <Form.Item label="关联角色" name="relatedCharacters"><Select mode="tags" placeholder="输入角色名称" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Foreshadows;
