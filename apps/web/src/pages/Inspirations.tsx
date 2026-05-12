import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Modal, Form, Input, Select, message, Button, Space, Badge, Tooltip, Typography } from 'antd';
import { PlusOutlined, BulbOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

const inspirationTypes = ['创意', '标题', '开局', '金手指', '反派', '桥段', '世界观', '卖点', 'Hook', '伏笔'];
const typeColors: Record<string, string> = {
  '创意': 'magenta', '标题': 'blue', '开局': 'geekblue', '金手指': 'gold',
  '反派': 'red', '桥段': 'purple', '世界观': 'cyan', '卖点': 'orange',
  'Hook': 'volcano', '伏笔': 'lime',
};

interface Inspiration {
  id: string; type: string; title: string; content: string;
  tags?: string; source?: string; status: string; createdAt: string;
}

export default function Inspirations() {
  const { id: projectId } = useParams();
  const [data, setData] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inspiration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    api.get(`/inspirations?${params}`).then((r: any) => {
      setData(Array.isArray(r) ? r : r?.items || []);
    }).catch(() => message.error('加载灵感失败')).finally(() => setLoading(false));
  };
  useEffect(load, [projectId, typeFilter]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/inspirations/${editing.id}`, values);
      } else {
        await api.post('/inspirations', { ...values, projectId });
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch { message.error('操作失败'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/inspirations/${id}`); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const toggleStatus = async (item: Inspiration) => {
    const newStatus = item.status === 'used' ? 'draft' : 'used';
    try { await api.put(`/inspirations/${item.id}`, { status: newStatus }); load(); }
    catch { message.error('更新状态失败'); }
  };

  const handleAIGenerate = async () => {
    const values = await aiForm.validateFields();
    setAiGenerating(true);
    const hide = message.loading('AI正在生成灵感...', 0);
    try {
      const res: any = await api.post('/engine/chapter/generate', {
        context: {
          task: 'inspiration_generation',
          type: values.type,
          keywords: values.keywords,
          prompt: `请为"${values.type}"类型的网文创作生成5个灵感创意，关键词：${values.keywords || '无'}。每个灵感包含标题和详细描述。`,
        },
        mode: 'quick',
      });
      hide();
      const wf = res?.workflow;
      if (wf?.result) {
        const content = typeof wf.result === 'string' ? wf.result : wf.result.content || JSON.stringify(wf.result);
        form.setFieldsValue({
          type: values.type,
          title: `AI${values.type}灵感`,
          content,
          source: 'AI生成',
        });
        setEditing(null);
        setModalOpen(true);
        message.success('AI已生成灵感，请检查后保存');
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Tag color={typeFilter === 'all' ? 'blue' : undefined} style={{ cursor: 'pointer' }}
            onClick={() => setTypeFilter('all')}>全部</Tag>
          {inspirationTypes.map(t => (
            <Tag key={t} color={typeFilter === t ? typeColors[t] : undefined}
              style={{ cursor: 'pointer' }} onClick={() => setTypeFilter(t)}>{t}</Tag>
          ))}
        </Space>
        <Button icon={<RocketOutlined />} onClick={() => { aiForm.resetFields(); setAiModalOpen(true); }}>AI生成灵感</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); setModalOpen(true);
        }}>新建灵感</Button>
      </div>

      {loading ? <Card loading /> : (
        <Row gutter={[16, 16]}>
          {data.length === 0 && (
            <Col span={24}>
              <Card><div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <BulbOutlined style={{ fontSize: 48, color: '#faad14' }} />
                <p style={{ marginTop: 16 }}>还没有灵感，点击"新建灵感"开始</p>
              </div></Card>
            </Col>
          )}
          {data.map(item => (
            <Col xs={24} sm={12} lg={8} key={item.id}>
              <Card
                size="small"
                title={
                  <Space>
                    <Tag color={typeColors[item.type]}>{item.type}</Tag>
                    <Text strong>{item.title}</Text>
                  </Space>
                }
                extra={
                  <Space>
                    <Tooltip title={item.status === 'used' ? '标记为草稿' : '标记为已使用'}>
                      <CheckCircleOutlined
                        style={{ color: item.status === 'used' ? '#52c41a' : '#d9d9d9', cursor: 'pointer' }}
                        onClick={() => toggleStatus(item)}
                      />
                    </Tooltip>
                    <EditOutlined style={{ cursor: 'pointer' }} onClick={() => {
                      setEditing(item); form.setFieldsValue(item); setModalOpen(true);
                    }} />
                    <DeleteOutlined style={{ cursor: 'pointer', color: '#ff4d4f' }}
                      onClick={() => handleDelete(item.id)} />
                  </Space>
                }
              >
                <Paragraph ellipsis={{ rows: 4 }}>{item.content}</Paragraph>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999' }}>
                  <span>{item.source ? `来源: ${item.source}` : ''}</span>
                  <span>{item.tags}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title={editing ? '编辑灵感' : '新建灵感'} open={modalOpen} width={640}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()} confirmLoading={submitting}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ type: '创意', status: 'draft' }}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              {inspirationTypes.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="给这个灵感起个名字" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="详细描述这个灵感..." />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="逗号分隔，如：都市,爽文" />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Input placeholder="如：阅读笔记、梦中灵感、ChatGPT" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="AI生成灵感"
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        onOk={handleAIGenerate}
        confirmLoading={aiGenerating}
      >
        <Form form={aiForm} layout="vertical" initialValues={{ type: '创意' }}>
          <Form.Item name="type" label="灵感类型" rules={[{ required: true }]}>
            <Select>
              {inspirationTypes.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="keywords" label="关键词">
            <Input placeholder="输入相关关键词，如：都市、重生、系统流" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
