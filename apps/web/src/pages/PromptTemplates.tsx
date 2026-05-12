import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message, Space, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, RocketOutlined } from '@ant-design/icons';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  description?: string;
  variables?: string;
  tags?: string;
  isBuiltin: boolean;
  score?: number;
  usageCount: number;
  createdAt: string;
}

const CATEGORIES = ['大纲', '卷纲', '章纲', '正文', '审核', '润色', '灵感', '去味'];
const CATEGORY_COLORS: Record<string, string> = {
  '大纲': 'blue', '卷纲': 'cyan', '章纲': 'geekblue',
  '正文': 'green', '审核': 'red', '润色': 'orange',
  '灵感': 'purple', '去味': 'magenta',
};

export default function PromptTemplates() {
  const [data, setData] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    const url = filterCategory ? `/prompt-templates?category=${filterCategory}` : '/prompt-templates';
    api.get(url)
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filterCategory]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/prompt-templates/${editing.id}`, values);
      } else {
        await api.post('/prompt-templates', values);
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch { message.error('操作失败'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/prompt-templates/${id}`); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const handleAIGenerate = async () => {
    const values = await aiForm.validateFields();
    setAiGenerating(true);
    const hide = message.loading('AI正在生成提示词...', 0);
    try {
      const res: any = await api.post('/engine/chapter/generate', {
        context: {
          task: 'prompt_generation',
          category: values.category,
          description: values.description,
          prompt: `请为"${values.category}"类型生成一个高质量的AI提示词模板，功能描述：${values.description}。返回纯文本格式的提示词内容。`,
        },
        mode: 'quick',
      });
      hide();
      const wf = res?.workflow;
      if (wf?.result) {
        const content = typeof wf.result === 'string' ? wf.result : wf.result.content || JSON.stringify(wf.result);
        form.setFieldsValue({
          name: `${values.category}生成模板`,
          category: values.category,
          content,
          description: values.description,
        });
        setEditing(null);
        setModalOpen(true);
        message.success('AI已生成提示词，请检查后保存');
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

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 180 },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 100,
      render: (v: string) => <Tag color={CATEGORY_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: '内容预览', dataIndex: 'content', key: 'content', ellipsis: true, width: 300 },
    { title: '标签', dataIndex: 'tags', key: 'tags', width: 150, render: (v: string) => v?.split(',').map((t: string) => <Tag key={t}>{t.trim()}</Tag>) },
    { title: '使用次数', dataIndex: 'usageCount', key: 'usageCount', width: 80 },
    {
      title: '操作', key: 'action', width: 150,
      render: (_: any, r: PromptTemplate) => (
        <Space>
          <a onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }}>编辑</a>
          {!r.isBuiltin && (
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete(r.id)}>
              <a style={{ color: 'red' }}>删除</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="提示词工坊"
        subtitle="管理和复用 AI 提示词模板"
        extra={
          <Space>
            <Button icon={<RocketOutlined />} onClick={() => { aiForm.resetFields(); setAiModalOpen(true); }}>AI生成提示词</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建模板</Button>
          </Space>
        }
      />
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="按分类筛选"
            allowClear
            style={{ width: 200 }}
            value={filterCategory}
            onChange={setFilterCategory}
            options={CATEGORIES.map(c => ({ label: c, value: c }))}
          />
        </div>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal
        title={editing ? '编辑提示词模板' : '新建提示词模板'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="例如：番茄风章纲生成模板" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={CATEGORIES.map(c => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="content" label="提示词内容" rules={[{ required: true }]}>
            <Input.TextArea rows={10} placeholder="输入提示词模板内容，使用 {{变量名}} 作为占位符" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="简短描述这个模板的用途" />
          </Form.Item>
          <Form.Item name="tags" label="标签" tooltip="逗号分隔，例如：番茄风,爽文,第一章">
            <Input placeholder="逗号分隔多个标签" />
          </Form.Item>
          <Form.Item name="variables" label="变量列表" tooltip={'JSON数组格式，例如：["title","genre"]'}>
            <Input placeholder={'["title","genre","style"]'} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="AI生成提示词"
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        onOk={handleAIGenerate}
        confirmLoading={aiGenerating}
      >
        <Form form={aiForm} layout="vertical">
          <Form.Item name="category" label="提示词分类" rules={[{ required: true }]}>
            <Select options={CATEGORIES.map(c => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="description" label="功能描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="描述这个提示词要实现什么功能，例如：生成番茄风第一章章纲" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
