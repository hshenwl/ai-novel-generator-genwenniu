import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Space, Popconfirm, Drawer, Descriptions, Typography, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Text, Paragraph } = Typography;

interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  gender?: string;
  age?: string;
  organization?: string;
  profession?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  goals?: string;
  fears?: string;
  characterVoice?: string;
  status: string;
  firstAppear?: number;
  lastAppear?: number;
  createdAt: string;
  updatedAt: string;
}

const ROLE_OPTIONS = [
  { label: '主角', value: '主角' },
  { label: '配角', value: '配角' },
  { label: '反派', value: '反派' },
  { label: '导师', value: '导师' },
  { label: '伙伴', value: '伙伴' },
  { label: '其他', value: '其他' },
];

const GENDER_OPTIONS = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '其他', value: '其他' },
];

const STATUS_OPTIONS = [
  { label: '存活', value: 'active' },
  { label: '受伤', value: 'injured' },
  { label: '死亡', value: 'dead' },
  { label: '失踪', value: 'missing' },
];

const ROLE_COLORS: Record<string, string> = {
  '主角': 'gold',
  '配角': 'blue',
  '反派': 'red',
  '导师': 'green',
  '伙伴': 'cyan',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  injured: 'orange',
  dead: 'red',
  missing: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  active: '存活',
  injured: '受伤',
  dead: '死亡',
  missing: '失踪',
};

export default function Characters() {
  const { id } = useParams();
  const [data, setData] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<Character | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.get(`/characters/project/${id}`)
      .then((r: any) => setData(extractList(r)))
      .catch(() => { setLoadError(true); message.error('加载角色失败'); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/characters/${editing.id}`, values);
      } else {
        await api.post('/characters', { ...values, projectId: id });
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

  const handleDelete = async (cid: string) => {
    try {
      await api.delete(`/characters/${cid}`);
      message.success('已删除');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  const showDetail = (record: Character) => {
    setDetail(record);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: '角色名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (v: string, r: Character) => (
        <a onClick={() => showDetail(r)}>{v}</a>
      ),
    },
    {
      title: '身份',
      dataIndex: 'role',
      key: 'role',
      width: 90,
      render: (v: string) => (
        <Tag color={ROLE_COLORS[v] || 'default'}>{v || '未设定'}</Tag>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (v: string) => v || '-',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      width: 60,
      render: (v: string) => v || '-',
    },
    {
      title: '所属组织',
      dataIndex: 'organization',
      key: 'organization',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: '首次出场',
      dataIndex: 'firstAppear',
      key: 'firstAppear',
      width: 90,
      render: (v: number) => v ? `第${v}章` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, r: Character) => (
        <Space>
          <Tooltip title="查看详情">
            <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)} />
          </Tooltip>
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
        title="角色管理"
        subtitle={`共 ${data.length} 个角色`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
            新建角色
          </Button>
        }
      />
      <Card>
        {loadError ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p>加载失败</p>
            <Button onClick={load}>重试</Button>
          </div>
        ) : (
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个角色` }}
          />
        )}
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editing ? '编辑角色' : '新建角色'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* 基本信息 */}
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="姓名、称号、外号" />
          </Form.Item>
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="role" label="身份" style={{ flex: 1 }}>
              <Select options={ROLE_OPTIONS} placeholder="选择身份" />
            </Form.Item>
            <Form.Item name="gender" label="性别" style={{ flex: 1 }}>
              <Select options={GENDER_OPTIONS} placeholder="选择性别" />
            </Form.Item>
            <Form.Item name="age" label="年龄" style={{ flex: 1 }}>
              <Input placeholder="实际年龄/外貌年龄" />
            </Form.Item>
          </Space>
          <Form.Item name="status" label="当前状态">
            <Select options={STATUS_OPTIONS} placeholder="选择状态" />
          </Form.Item>

          {/* 组织信息 */}
          <Form.Item name="organization" label="所属组织">
            <Input placeholder="宗门、公司、家族、势力" />
          </Form.Item>
          <Form.Item name="profession" label="职业等级">
            <Input placeholder="修仙境界、魔法等级、职位等" />
          </Form.Item>

          {/* 描述信息 */}
          <Form.Item name="appearance" label="外貌特征">
            <Input.TextArea rows={2} placeholder="身高、气质、标志物等" />
          </Form.Item>
          <Form.Item name="personality" label="性格特点">
            <Input.TextArea rows={2} placeholder="冷静、冲动、腹黑等" />
          </Form.Item>
          <Form.Item name="background" label="背景故事">
            <Input.TextArea rows={3} placeholder="角色过去经历" />
          </Form.Item>

          {/* 动机信息 */}
          <Form.Item name="goals" label="目标动机">
            <Input.TextArea rows={2} placeholder="想要什么" />
          </Form.Item>
          <Form.Item name="fears" label="恐惧弱点">
            <Input.TextArea rows={2} placeholder="害怕什么" />
          </Form.Item>

          {/* 声音 */}
          <Form.Item name="characterVoice" label="人物声音">
            <Input.TextArea rows={2} placeholder="说话方式、口头禅、语气特点" />
          </Form.Item>

          {/* 出场章节 */}
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="firstAppear" label="首次出场章节" style={{ flex: 1 }}>
              <InputNumber min={1} placeholder="第几章" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="lastAppear" label="最后出场章节" style={{ flex: 1 }}>
              <InputNumber min={1} placeholder="第几章" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title={detail?.name || '角色详情'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        {detail && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="角色名">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="身份">
              <Tag color={ROLE_COLORS[detail.role] || 'default'}>{detail.role || '未设定'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="性别">{detail.gender || '-'}</Descriptions.Item>
            <Descriptions.Item label="年龄">{detail.age || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLORS[detail.status] || 'default'}>{STATUS_LABELS[detail.status] || detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="所属组织">{detail.organization || '-'}</Descriptions.Item>
            <Descriptions.Item label="职业等级">{detail.profession || '-'}</Descriptions.Item>
            <Descriptions.Item label="外貌特征"><Paragraph style={{ margin: 0 }}>{detail.appearance || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="性格特点"><Paragraph style={{ margin: 0 }}>{detail.personality || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="背景故事"><Paragraph style={{ margin: 0 }}>{detail.background || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="目标动机"><Paragraph style={{ margin: 0 }}>{detail.goals || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="恐惧弱点"><Paragraph style={{ margin: 0 }}>{detail.fears || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="人物声音"><Paragraph style={{ margin: 0 }}>{detail.characterVoice || '-'}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="首次出场">{detail.firstAppear ? `第${detail.firstAppear}章` : '-'}</Descriptions.Item>
            <Descriptions.Item label="最后出场">{detail.lastAppear ? `第${detail.lastAppear}章` : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(detail.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{new Date(detail.updatedAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
