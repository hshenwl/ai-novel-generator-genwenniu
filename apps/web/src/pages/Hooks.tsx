import { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, message, Typography, Timeline, Progress, Select, Tooltip, Button, Modal, Form, Input, InputNumber, Popconfirm } from 'antd';
import { useParams } from 'react-router-dom';
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, AimOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;
const { TextArea } = Input;

interface Hook {
  id: string;
  name: string;
  type: string;
  description: string;
  strengthScore: number | null;
  status: string;
  expectedResolve: number | null;
  actualResolve: number | null;
  relatedCharacters: string | null;
  createdAt: string;
  chapterId?: string | null;
}

const typeConfig: Record<string, { color: string; text: string }> = {
  chapter_begin: { color: 'green', text: '章首' },
  chapter_middle: { color: 'orange', text: '章内' },
  chapter_end: { color: 'blue', text: '章末' },
  volume: { color: 'purple', text: '卷' },
  character: { color: 'cyan', text: '人物' },
  item: { color: 'gold', text: '道具' },
  identity: { color: 'magenta', text: '身世' },
  conspiracy: { color: 'red', text: '阴谋' },
  emotion: { color: 'volcano', text: '情绪' },
  cool_point: { color: 'lime', text: '爽点' },
};

const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  new: { color: 'processing', text: '新增', icon: <ClockCircleOutlined /> },
  active: { color: 'processing', text: '延续中', icon: <AimOutlined /> },
  resolved: { color: 'success', text: '已兑现', icon: <CheckCircleOutlined /> },
  expired: { color: 'default', text: '已失效', icon: <WarningOutlined /> },
};

export default function Hooks() {
  const { id: projectId } = useParams();
  const [data, setData] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [editingHook, setEditingHook] = useState<Hook | null>(null);
  const [resolvingHook, setResolvingHook] = useState<Hook | null>(null);
  const [form] = Form.useForm();
  const [resolveForm] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    api.get(`/hooks/project/${projectId}`)
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载Hook列表失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const filteredData = data.filter(h => {
    if (typeFilter !== 'all' && h.type !== typeFilter) return false;
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: data.length,
    new: data.filter(h => h.status === 'new').length,
    active: data.filter(h => h.status === 'active').length,
    resolved: data.filter(h => h.status === 'resolved').length,
    noScore: data.filter(h => !h.strengthScore || h.strengthScore < 5).length,
  };

  const unfulfilled = data
    .filter(h => h.status !== 'resolved' && h.status !== 'expired')
    .sort((a, b) => (a.expectedResolve || 999) - (b.expectedResolve || 999));

  const getStrengthBar = (score: number | null) => {
    if (score === null || score === undefined) return <Text type="secondary">未评分</Text>;
    const color = score >= 8 ? '#52c41a' : score >= 5 ? '#faad14' : '#ff4d4f';
    return <Progress percent={score * 10} size="small" strokeColor={color} format={() => `${score}/10`} />;
  };

  const handleAdd = () => {
    setEditingHook(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (hook: Hook) => {
    setEditingHook(hook);
    form.setFieldsValue({
      name: hook.name,
      type: hook.type,
      description: hook.description,
      strengthScore: hook.strengthScore,
      status: hook.status,
      expectedResolve: hook.expectedResolve,
      relatedCharacters: hook.relatedCharacters,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingHook) {
        await api.put(`/hooks/${editingHook.id}`, { ...values, projectId });
      } else {
        await api.post('/hooks', { ...values, projectId, status: values.status || 'new' });
      }
      message.success('保存成功');
      setModalVisible(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('保存失败');
    }
  };

  const handleResolveOpen = (hook: Hook) => {
    setResolvingHook(hook);
    resolveForm.resetFields();
    resolveForm.setFieldsValue({ chapter: hook.expectedResolve || undefined });
    setResolveModalVisible(true);
  };

  const handleResolveSubmit = async () => {
    if (!resolvingHook) return;
    try {
      const values = await resolveForm.validateFields();
      await api.post(`/hooks/${resolvingHook.id}/resolve`, { chapter: values.chapter });
      message.success(`Hook「${resolvingHook.name}」已兑现`);
      setResolveModalVisible(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('兑现操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/hooks/${id}`);
      message.success('删除成功');
      fetchData();
    } catch { message.error('删除失败'); }
  };

  const columns = [
    {
      title: 'Hook名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Hook) => (
        <Space>
          <Text strong>{name}</Text>
          {!record.strengthScore || record.strengthScore < 5 ? (
            <Tooltip title="强度评分偏低，建议优化">
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          ) : record.strengthScore >= 8 ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : null}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const cfg = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '强度',
      dataIndex: 'strengthScore',
      key: 'strengthScore',
      width: 120,
      render: (score: number | null) => getStrengthBar(score),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const cfg = statusConfig[status] || { color: 'default', text: status, icon: null };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '预计兑现',
      dataIndex: 'expectedResolve',
      key: 'expectedResolve',
      width: 90,
      render: (v: number | null) => v ? `第${v}章` : '-',
    },
    {
      title: '实际兑现',
      dataIndex: 'actualResolve',
      key: 'actualResolve',
      width: 90,
      render: (v: number | null) => v ? `第${v}章` : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Hook) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          {record.status !== 'resolved' && record.status !== 'expired' && (
            <Button size="small" type="primary" ghost onClick={() => handleResolveOpen(record)}>兑现</Button>
          )}
          <Popconfirm title="确定删除此Hook？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Hook管理" subtitle="追踪章节Hook的设计、强度与兑现" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增Hook</Button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">Hook总数</Text>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.total}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">新增/延续</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>{stats.new + stats.active}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">已兑现</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{stats.resolved}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">强度不足</Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: stats.noScore > 0 ? '#faad14' : '#52c41a' }}>
            {stats.noScore}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }} size="small">
        <Space>
          <Text type="secondary">类型筛选：</Text>
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 120 }}>
            <Select.Option value="all">全部类型</Select.Option>
            {Object.entries(typeConfig).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.text}</Select.Option>
            ))}
          </Select>

          <Text type="secondary" style={{ marginLeft: 16 }}>状态筛选：</Text>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}>
            <Select.Option value="all">全部状态</Select.Option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.text}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }} title="未兑现Hook时间线">
        {unfulfilled.length > 0 ? (
          <Timeline
            items={unfulfilled.slice(0, 10).map(h => ({
              color: h.status === 'new' ? 'blue' : h.status === 'active' ? 'orange' : 'gray',
              children: (
                <div>
                  <Text strong>{h.name}</Text>
                  <Tag style={{ marginLeft: 8 }} color={typeConfig[h.type]?.color || 'default'}>
                    {typeConfig[h.type]?.text || h.type}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {h.expectedResolve ? `预计第${h.expectedResolve}章兑现` : '未规划兑现时间'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 13 }}>{h.description}</Text>
                </div>
              ),
            }))}
          />
        ) : (
          <Text type="secondary">所有Hook已兑现或已失效</Text>
        )}
        {unfulfilled.length > 10 && (
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            还有 {unfulfilled.length - 10} 个未兑现Hook...
          </Text>
        )}
      </Card>

      <Card>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingHook ? '编辑Hook' : '新增Hook'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Hook名称" name="name" rules={[{ required: true, message: '请输入Hook名称' }]}>
            <Input placeholder="Hook名称" />
          </Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="选择Hook类型">
              {Object.entries(typeConfig).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.text}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="Hook描述" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item label="强度评分(1-10)" name="strengthScore">
              <InputNumber min={1} max={10} placeholder="1-10" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="预计兑现章节" name="expectedResolve">
              <InputNumber min={1} placeholder="第几章" style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item label="状态" name="status">
            <Select placeholder="选择状态">
              {Object.entries(statusConfig).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.text}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="关联角色" name="relatedCharacters">
            <Input placeholder="角色名称，逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`兑现Hook：${resolvingHook?.name || ''}`}
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        onOk={handleResolveSubmit}
        width={400}
      >
        <Form form={resolveForm} layout="vertical">
          <Form.Item label="实际兑现章节" name="chapter" rules={[{ required: true, message: '请输入兑现章节' }]}>
            <InputNumber min={1} placeholder="第几章兑现" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
