import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message, Space, Popconfirm, Drawer, Descriptions, Typography } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Paragraph } = Typography;

interface Org {
  id: string;
  projectId: string;
  name: string;
  type?: string;
  alignment?: string;
  description?: string;
  structure?: string;
  goals?: string;
  resources?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_OPTIONS = [
  { label: '宗门', value: '宗门' },
  { label: '家族', value: '家族' },
  { label: '帝国', value: '帝国' },
  { label: '公司', value: '公司' },
  { label: '联盟', value: '联盟' },
  { label: '帮派', value: '帮派' },
  { label: '国家', value: '国家' },
  { label: '组织', value: '组织' },
  { label: '其他', value: '其他' },
];

const ALIGNMENT_OPTIONS = [
  { label: '正派', value: '正派' },
  { label: '反派', value: '反派' },
  { label: '中立', value: '中立' },
  { label: '灰色', value: '灰色' },
];

const ALIGNMENT_COLORS: Record<string, string> = {
  '正派': 'green',
  '反派': 'red',
  '中立': 'blue',
  '灰色': 'orange',
};

const STATUS_OPTIONS = [
  { label: '活跃', value: 'active' },
  { label: '已解散', value: 'dissolved' },
  { label: '隐藏', value: 'hidden' },
];

const STATUS_LABELS: Record<string, string> = {
  active: '活跃',
  dissolved: '已解散',
  hidden: '隐藏',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  dissolved: 'default',
  hidden: 'orange',
};

export default function Organizations() {
  const { id } = useParams();
  const [data, setData] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<Org | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get(`/organizations/project/${id}`)
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载组织失败'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/organizations/${editing.id}`, values);
      } else {
        await api.post('/organizations', { ...values, projectId: id });
      }
      message.success(editing ? '更新成功' : '创建成功');
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

  const handleDelete = async (oid: string) => {
    try {
      await api.delete(`/organizations/${oid}`);
      message.success('已删除');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  const showDetail = (record: Org) => {
    setDetail(record);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: '组织名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (v: string, r: Org) => <a onClick={() => showDetail(r)}>{v}</a>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v: string) => v ? <Tag>{v}</Tag> : '-',
    },
    {
      title: '阵营',
      dataIndex: 'alignment',
      key: 'alignment',
      width: 80,
      render: (v: string) => v ? <Tag color={ALIGNMENT_COLORS[v] || 'default'}>{v}</Tag> : '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_LABELS[v] || v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, r: Org) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)} />
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
        title="组织管理"
        subtitle={`共 ${data.length} 个组织`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
            新建组织
          </Button>
        }
      />
      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个组织` }}
        />
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editing ? '编辑组织' : '新建组织'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="组织名称" rules={[{ required: true, message: '请输入组织名称' }]}>
            <Input placeholder="宗门、势力、公司名称" />
          </Form.Item>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="type" label="组织类型" style={{ flex: 1 }}>
              <Select options={TYPE_OPTIONS} placeholder="选择类型" />
            </Form.Item>
            <Form.Item name="alignment" label="阵营属性" style={{ flex: 1 }}>
              <Select options={ALIGNMENT_OPTIONS} placeholder="选择阵营" />
            </Form.Item>
          </Space>
          <Form.Item name="status" label="状态">
            <Select options={STATUS_OPTIONS} placeholder="选择状态" />
          </Form.Item>
          <Form.Item name="description" label="组织描述">
            <Input.TextArea rows={3} placeholder="组织简介、核心使命" />
          </Form.Item>
          <Form.Item name="structure" label="组织结构">
            <Input.TextArea rows={3} placeholder="领袖、长老、成员层级" />
          </Form.Item>
          <Form.Item name="goals" label="组织目标">
            <Input.TextArea rows={2} placeholder="核心利益和目标" />
          </Form.Item>
          <Form.Item name="resources" label="资源能力">
            <Input.TextArea rows={2} placeholder="财富、武力、技术、情报等" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title={detail?.name || '组织详情'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        {detail && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="组织名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="组织类型">{detail.type || '-'}</Descriptions.Item>
            <Descriptions.Item label="阵营属性">
              {detail.alignment ? <Tag color={ALIGNMENT_COLORS[detail.alignment] || 'default'}>{detail.alignment}</Tag> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLORS[detail.status] || 'default'}>{STATUS_LABELS[detail.status] || detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="组织描述"><Paragraph style={{ margin: 0 }}>{detail.description || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="组织结构"><Paragraph style={{ margin: 0 }}>{detail.structure || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="组织目标"><Paragraph style={{ margin: 0 }}>{detail.goals || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="资源能力"><Paragraph style={{ margin: 0 }}>{detail.resources || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(detail.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{new Date(detail.updatedAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
