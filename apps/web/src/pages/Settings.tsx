import { useEffect, useState } from 'react';
import { Card, Table, Tag, Form, Input, Select, Button, Space, Modal, message, Popconfirm, Typography, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  isDefault: boolean;
  hasApiKey: boolean;
  apiKey?: string | null;
}

const PROVIDER_OPTIONS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Claude (Anthropic)', value: 'claude' },
  { label: 'Gemini (Google)', value: 'gemini' },
  { label: '通义千问', value: 'tongyi' },
  { label: '智谱 GLM', value: 'zhipu' },
  { label: '文心一言', value: 'wenxin' },
  { label: 'Ollama (本地)', value: 'ollama' },
  { label: 'OpenAI 兼容接口', value: 'custom' },
];

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'green',
  deepseek: 'blue',
  claude: 'purple',
  gemini: 'orange',
  tongyi: 'cyan',
  zhipu: 'geekblue',
  wenxin: 'red',
  ollama: 'default',
  custom: 'lime',
};

export default function Settings() {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadConfigs = () => {
    setLoading(true);
    api.get('/model-configs').then((r: any) => setConfigs(Array.isArray(r) ? r : r?.items || []))
      .catch(() => message.error('加载模型配置失败'))
      .finally(() => setLoading(false));
  };

  useEffect(loadConfigs, []);

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      provider: 'openai',
      maxTokens: 4096,
      temperature: 0.7,
    });
    setModalVisible(true);
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      ...config,
      apiKey: '', // 不预填API Key
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/model-configs/${id}`);
      message.success('模型配置已删除');
      loadConfigs();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.post(`/model-configs/${id}/set-default`);
      message.success('已设为默认模型');
      loadConfigs();
    } catch {
      message.error('设置失败');
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // 清除空的API Key（编辑不修改时）
      const payload = { ...values };
      if (!payload.apiKey) delete payload.apiKey;

      if (editingConfig) {
        await api.put(`/model-configs/${editingConfig.id}`, payload);
        message.success('模型配置已更新');
      } else {
        await api.post('/model-configs', payload);
        message.success('模型配置已创建');
      }
      setModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      loadConfigs();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ModelConfig) => (
        <Space>
          {record.isDefault && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (v: string) => <Tag color={PROVIDER_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '模型ID',
      dataIndex: 'modelId',
      key: 'modelId',
      width: 160,
    },
    {
      title: 'API Key',
      dataIndex: 'hasApiKey',
      key: 'hasApiKey',
      width: 100,
      render: (v: boolean) => v
        ? <Tag color="green" icon={<KeyOutlined />}>已配置</Tag>
        : <Tag color="red">未配置</Tag>,
    },
    {
      title: '参数',
      key: 'params',
      width: 120,
      render: (_: any, record: ModelConfig) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.maxTokens ? `${record.maxTokens} tokens` : ''}
          {record.temperature ? ` / T${record.temperature}` : ''}
        </Text>
      ),
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 80,
      render: (v: boolean) => v ? <Tag color="blue">默认</Tag> : '',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: ModelConfig) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          {!record.isDefault && (
            <>
              <Button size="small" type="primary" ghost onClick={() => handleSetDefault(record.id)}>
                设为默认
              </Button>
              <Popconfirm title="确认删除此模型配置?" onConfirm={() => handleDelete(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="系统设置"
        subtitle="AI模型配置、API Key管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增模型
          </Button>
        }
      />

      {/* AI模型配置 */}
      <Card title="AI模型配置" style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          配置AI模型用于章节生成、审核和修订。支持多模型分别配置，可设置默认模型。
        </Text>
        <Table
          dataSource={configs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* 提示词工坊入口 */}
      <Card title="提示词工坊" style={{ marginBottom: 16 }}>
        <Space direction="vertical">
          <Text>
            AI创作引擎使用预置提示词（Prompt）来控制每个Agent的行为。
            高级用户可以在此自定义和优化提示词模板。
          </Text>
          <Button icon={<SettingOutlined />} disabled>
            提示词工坊（即将开放）
          </Button>
        </Space>
      </Card>

      {/* 编辑器与导出设置 */}
      <Card title="编辑器设置">
        <Space direction="vertical">
          <Text>编辑器字体大小、默认创作参数等个性化设置即将开放。</Text>
          <Button disabled>编辑偏好设置（即将开放）</Button>
        </Space>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingConfig ? '编辑模型配置' : '新增模型配置'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingConfig(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：GPT-4, DeepSeek Chat" />
          </Form.Item>

          <Form.Item name="provider" label="模型提供商" rules={[{ required: true }]}>
            <Select options={PROVIDER_OPTIONS} />
          </Form.Item>

          <Form.Item name="modelId" label="模型ID" rules={[{ required: true, message: '请输入模型ID' }]}>
            <Input placeholder="如：gpt-4, deepseek-chat, claude-3-opus" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label={
              <Space>
                <span>API Key</span>
                {editingConfig && <Tag>留空则不修改</Tag>}
              </Space>
            }
          >
            <Input.Password
              placeholder={editingConfig ? '留空保持原值' : '输入API Key'}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item name="baseUrl" label="自定义API地址">
            <Input placeholder="可选，如 http://127.0.0.1:11434/v1" />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item name="maxTokens" label="最大Token">
              <InputNumber min={256} max={128000} style={{ width: 150 }} />
            </Form.Item>

            <Form.Item name="temperature" label="温度 (0-2)">
              <InputNumber min={0} max={2} step={0.1} style={{ width: 120 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
