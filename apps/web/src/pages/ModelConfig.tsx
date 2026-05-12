import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  isDefault: boolean;
  createdAt: string;
}

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Google', value: 'google' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Ollama', value: 'ollama' },
  { label: '通义千问', value: 'qwen' },
  { label: '智谱', value: 'zhipu' },
  { label: '文心一言', value: 'ernie' },
  { label: '自定义', value: 'custom' },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'green',
  anthropic: 'orange',
  google: 'blue',
  deepseek: 'purple',
  ollama: 'default',
};

export default function ModelConfig() {
  const [data, setData] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/model-configs')
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载模型配置失败'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/model-configs/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/model-configs', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      load();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/model-configs/${id}`);
      message.success('已删除');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.post(`/model-configs/${id}/set-default`);
      message.success('已设为默认');
      load();
    } catch {
      message.error('设置默认失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    {
      title: '提供商', dataIndex: 'provider', key: 'provider', width: 120,
      render: (v: string) => <Tag color={PROVIDER_COLORS[v] || 'default'}>{PROVIDERS.find(p => p.value === v)?.label || v}</Tag>,
    },
    { title: '模型ID', dataIndex: 'modelId', key: 'modelId', ellipsis: true },
    {
      title: '默认', dataIndex: 'isDefault', key: 'isDefault', width: 80,
      render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : '-',
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, r: ModelConfig) => (
        <Space>
          {!r.isDefault && <a onClick={() => handleSetDefault(r.id)}>设为默认</a>}
          <a onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }}>编辑</a>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ provider: 'openai', maxTokens: 4096, temperature: 0.7 });
    setModalOpen(true);
  };

  return (
    <div>
      <PageHeader title="AI模型配置" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加模型</Button>} />
      <Card>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />
      </Card>
      <Modal
        title={editing ? '编辑模型配置' : '添加模型配置'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="例如：GPT-4o 创作" />
          </Form.Item>
          <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
            <Select options={PROVIDERS} />
          </Form.Item>
          <Form.Item name="modelId" label="模型ID" rules={[{ required: true }]} tooltip="例如：gpt-4o、claude-3-opus、deepseek-chat">
            <Input placeholder="gpt-4o / claude-3-opus / deepseek-chat" />
          </Form.Item>
          <Form.Item name="apiKey" label="API密钥">
            <Input.Password placeholder="留空则使用系统默认" />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL" tooltip="自定义 API 地址，留空使用提供商默认">
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="maxTokens" label="最大 Token">
              <InputNumber min={256} max={128000} step={1024} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="temperature" label="温度">
              <InputNumber min={0} max={2} step={0.1} style={{ width: 120 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
