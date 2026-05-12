import { useState, useEffect } from 'react';
import { Card, Typography, Collapse, Tag, Table, Button, Space, Tabs, Alert, Divider, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { FileTextOutlined, SafetyCertificateOutlined, CodeOutlined, BookOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import api, { extractList } from '../services/api';
import { useParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const BUILTIN_AGENTS = [
  { value: 'shared', label: '全局共享' },
  { value: 'planner', label: 'Planner' },
  { value: 'writer', label: 'Writer' },
  { value: 'deep_reader', label: 'DeepReader' },
  { value: 'deep_editor', label: 'DeepEditor' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'reviser', label: 'Reviser' },
  { value: 'settler', label: 'Settler' },
];

export default function AgentRules() {
  const { id: projectId } = useParams();
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState<any[]>([]);
  const [builtinRules, setBuiltinRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    const url = projectId ? `/agent-rules?projectId=${projectId}` : '/agent-rules';
    api.get(url).then((r: any) => setRules(extractList(r)))
      .catch(() => setRules([])).finally(() => setLoading(false));
  };

  const loadBuiltin = () => {
    api.get('/agent-rules/builtin').then((r: any) => setBuiltinRules(Array.isArray(r) ? r : []))
      .catch(() => setBuiltinRules([]));
  };

  useEffect(() => { load(); loadBuiltin(); }, [projectId]);

  const handleAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const handleEdit = (rule: any) => { setEditing(rule); form.setFieldsValue(rule); setModalOpen(true); };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/agent-rules/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/agent-rules', { ...values, projectId: projectId || null });
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/agent-rules/${id}`); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const columns = [
    { title: 'Agent', dataIndex: 'agentName', key: 'agentName', width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '规则名称', dataIndex: 'title', key: 'title', width: 200 },
    { title: '适用范围', dataIndex: 'scope', key: 'scope', width: 120,
      render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
    { title: '类型', key: 'type', width: 80,
      render: (_: any, r: any) => r.isBuiltin ? <Tag color="gold">内置</Tag> : <Tag color="green">自定义</Tag> },
    { title: '标签', dataIndex: 'tags', key: 'tags', width: 200,
      render: (tags: string) => tags ? tags.split(',').map((t: string) => <Tag key={t} color="geekblue">{t}</Tag>) : '-' },
    { title: '操作', key: 'action', width: 120,
      render: (_: any, r: any) => r.isBuiltin ? null : (
        <Space>
          <a onClick={() => handleEdit(r)}>编辑</a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}><SafetyCertificateOutlined /> Agent 规则管理</Title>
          <Text type="secondary">管理七步创作引擎各 Agent 的规则文件和职责定义</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { load(); loadBuiltin(); }}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建规则</Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'rules',
          label: <><FileTextOutlined /> 规则列表</>,
          children: (
            <Card>
              <Table dataSource={rules} columns={columns} rowKey="id" loading={loading}
                pagination={false}
                expandable={{
                  expandedRowRender: (record: any) => (
                    <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: 400, overflow: 'auto' }}>
                        {record.content}
                      </pre>
                    </div>
                  ),
                }}
              />
            </Card>
          ),
        },
        {
          key: 'builtin',
          label: <><CodeOutlined /> 内置规则文件</>,
          children: (
            <Card>
              <Table dataSource={builtinRules} columns={[
                { title: '文件', dataIndex: 'fileName', key: 'fileName', width: 160, render: (v: string) => <Tag color="blue">{v}</Tag> },
                { title: '名称', dataIndex: 'title', key: 'title', width: 200 },
                { title: '范围', dataIndex: 'scope', key: 'scope', width: 120, render: (v: string) => <Tag>{v}</Tag> },
              ]} rowKey="agentName" pagination={false} />
              <Alert style={{ marginTop: 16 }} type="info" message="内置规则文件位于 resources/rules/ 目录，可通过项目管理页面对特定项目覆盖" />
            </Card>
          ),
        },
        {
          key: 'flow',
          label: <><BookOutlined /> 加载流程</>,
          children: (
            <Card>
              <Title level={5}>规则加载机制（5层优先级）</Title>
              <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, fontSize: 14, lineHeight: 2 }}>
                <div>1. <Tag color="red">全局</Tag> <code>rules/shared.md</code> — 铁律、规范、状态机、Hook、防假审核</div>
                <div>2. <Tag color="blue">当前步骤</Tag> 步骤专属规则（如 <code>rules/writer.md</code>）</div>
                <div>3. <Tag color="green">项目级</Tag> 项目自定义规则（可覆盖内置规则）</div>
                <div>4. <Tag color="orange">用户级</Tag> 用户临时要求（当前任务附加）</div>
                <div>5. <Tag color="purple">上下文</Tag> 当前任务上下文（章纲、角色状态、伏笔等）</div>
              </div>
              <Divider />
              <Title level={5}>七步引擎调用链</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                {['Planner', 'Writer', 'DeepReader', 'DeepEditor', 'Auditor', 'Reviser', 'Settler'].map((step, i) => (
                  <span key={step}>
                    <Tag color={['blue','green','cyan','geekblue','red','orange','purple'][i]} style={{ fontSize: 14, padding: '4px 12px' }}>{step}</Tag>
                    {i < 6 && <span style={{ color: '#999', margin: '0 4px' }}>→</span>}
                  </span>
                ))}
              </div>
            </Card>
          ),
        },
      ]} />

      <Modal title={editing ? '编辑规则' : '新建规则'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item label="Agent名称" name="agentName" rules={[{ required: true }]}>
            <Select options={BUILTIN_AGENTS} placeholder="选择Agent" />
          </Form.Item>
          <Form.Item label="规则标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="规则标题" />
          </Form.Item>
          <Form.Item label="适用范围" name="scope">
            <Input placeholder="如：Writer步骤" />
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Input placeholder="逗号分隔，如：Writer,正文,14项自检" />
          </Form.Item>
          <Form.Item label="规则内容" name="content" rules={[{ required: true }]}>
            <TextArea rows={10} placeholder="Markdown格式的规则内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
