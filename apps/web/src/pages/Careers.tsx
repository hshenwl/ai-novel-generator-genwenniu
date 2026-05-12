import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

interface Career {
  id: string;
  name: string;
  type: string;
  description: string;
  levels: string;
  promotion: string;
  createdAt: string;
}

const CAREER_TYPES = ['修仙', '魔法', '都市', '末世', '游戏', '玄幻', '科幻', '自定义'];

export default function Careers() {
  const { id: projectId } = useParams();
  const [data, setData] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Career | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get(`/careers?projectId=${projectId}`)
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载职业列表失败'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [projectId]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/careers/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/careers', { ...values, projectId });
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
      await api.delete(`/careers/${id}`);
      message.success('已删除');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 100,
      render: (v: string) => <Tag>{v || '未分类'}</Tag>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'action', width: 150,
      render: (_: any, r: Career) => (
        <Space>
          <a onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }}>编辑</a>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="职业管理"
        subtitle="自定义职业和等级体系，适配不同小说类型"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建职业</Button>}
      />
      <Card>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />
      </Card>
      <Modal
        title={editing ? '编辑职业' : '新建职业'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="职业名称" rules={[{ required: true }]}>
            <Input placeholder="例如：修士、法师、觉醒者" />
          </Form.Item>
          <Form.Item name="type" label="体系类型">
            <Select allowClear>
              {CAREER_TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="职业体系的简要说明" />
          </Form.Item>
          <Form.Item name="levels" label="等级体系（每行一个等级）" tooltip="例如修仙：炼气、筑基、金丹、元婴、化神">
            <Input.TextArea rows={5} placeholder="炼气&#10;筑基&#10;金丹&#10;元婴&#10;化神" />
          </Form.Item>
          <Form.Item name="promotion" label="升级条件">
            <Input.TextArea rows={3} placeholder="例如：炼气→筑基需要灵力积累+筑基丹" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
