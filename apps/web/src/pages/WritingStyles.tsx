import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message, Space, Popconfirm, Typography } from 'antd';
import { PlusOutlined, BulbOutlined } from '@ant-design/icons';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Paragraph, Text } = Typography;

interface WritingStyle {
  id: string;
  name: string;
  genre?: string;
  perspective?: string;
  languageStyle?: string;
  paceStyle?: string;
  hookStyle?: string;
  forbiddenExpr?: string;
  sampleText?: string;
  isBuiltin: boolean;
  createdAt: string;
}

const GENRES = ['都市', '玄幻', '脑洞', '修仙', '科幻', '悬疑', '言情', '历史', '末世'];
const PERSPECTIVES = ['第一人称', '第三人称'];

export default function WritingStyles() {
  const [data, setData] = useState<WritingStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WritingStyle | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<WritingStyle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/writing-styles')
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const [recommendOpen, setRecommendOpen] = useState(false);

  const BUILTIN_STYLES = [
    { name: '番茄风第一人称', genre: '都市/玄幻/脑洞', perspective: '第一人称', language: '短句为主，情绪直接，口语化表达，强代入感', pace: '快节奏，每3-5章一个小爽点', hook: '开篇冲突，章末悬念，身份反转', forbidden: '禁止文艺腔、长段设定说明、万能形容词' },
    { name: '起点升级流第三人称', genre: '玄幻/修仙/科幻', perspective: '第三人称', language: '画面感强，战斗描写细腻，等级提升仪式感', pace: '升级驱动，每卷突破一个大境界', hook: '境界突破，宗门大比，秘境探宝', forbidden: '禁止圣母性格，禁止无脑降智' },
    { name: '都市脑洞爽文风', genre: '都市/脑洞', perspective: '第一人称', language: '轻松幽默，吐槽感强，信息量大', pace: '高密度爽点，每章都有新发现', hook: '身份揭秘，能力展示，打脸反转', forbidden: '禁止拖沓，禁止说教' },
    { name: '修仙升级流', genre: '修仙', perspective: '第三人称', language: '古风用语适度，意境描写，仙侠氛围', pace: '稳扎稳打，奇遇推动', hook: '秘境探索，突破瓶颈，宗门危机', forbidden: '禁止现代网络用语' },
    { name: '悬疑强钩子风', genre: '悬疑/推理', perspective: '第一人称', language: '紧凑克制，信息差制造悬念，感官细节', pace: '每章一个线索，层层递进', hook: '谜题设置，真相反转，身份暴露', forbidden: '禁止过早揭示真相，禁止无聊对话' },
    { name: '细腻情绪流', genre: '言情/都市', perspective: '第一人称', language: '内心独白丰富，情绪细腻，环境烘托', pace: '情感推进，矛盾积累后爆发', hook: '误会制造，身份秘密，情感抉择', forbidden: '禁止狗血套路，禁止无脑虐' },
    { name: '轻松吐槽流', genre: '都市/脑洞', perspective: '第一人称', language: '吐槽为主，节奏轻快，搞笑梗密集', pace: '轻松节奏，穿插高能', hook: '反差设定，搞笑误会，突然认真', forbidden: '禁止沉重剧情，禁止说教' },
  ];

  const handleShowRecommend = () => {
    setRecommendOpen(true);
  };

  const handleUseRecommended = (style: typeof BUILTIN_STYLES[0]) => {
    form.setFieldsValue({
      name: style.name,
      genre: style.genre,
      perspective: style.perspective,
      languageStyle: style.language,
      paceStyle: style.pace,
      hookStyle: style.hook,
      forbiddenExpr: style.forbidden,
    });
    setRecommendOpen(false);
    setEditing(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/writing-styles/${editing.id}`, values);
      } else {
        await api.post('/writing-styles', values);
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch { message.error('操作失败'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/writing-styles/${id}`); message.success('已删除'); load(); }
    catch { message.error('删除失败'); }
  };

  const showDetail = (r: WritingStyle) => {
    setDetail(r);
    setDetailOpen(true);
  };

  const columns = [
    { title: '风格名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '适用类型', dataIndex: 'genre', key: 'genre', width: 100, render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
    { title: '视角', dataIndex: 'perspective', key: 'perspective', width: 100 },
    { title: '语言特点', dataIndex: 'languageStyle', key: 'languageStyle', ellipsis: true },
    {
      title: '内置', dataIndex: 'isBuiltin', key: 'isBuiltin', width: 60,
      render: (v: boolean) => v ? <Tag color="blue">内置</Tag> : '-',
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, r: WritingStyle) => (
        <Space>
          <a onClick={() => showDetail(r)}>预览</a>
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
        title="写作风格管理"
        subtitle="创建和管理不同写作风格，用于章节生成"
        extra={
          <Space>
            <Button icon={<BulbOutlined />} onClick={handleShowRecommend}>AI推荐风格</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建风格</Button>
          </Space>
        }
      />
      <Card>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editing ? '编辑写作风格' : '新建写作风格'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="风格名称" rules={[{ required: true }]}>
            <Input placeholder="例如：番茄第一人称爽文风" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="genre" label="适用类型">
              <Select style={{ width: 200 }} allowClear options={GENRES.map(g => ({ label: g, value: g }))} />
            </Form.Item>
            <Form.Item name="perspective" label="叙事视角">
              <Select style={{ width: 160 }} allowClear options={PERSPECTIVES.map(p => ({ label: p, value: p }))} />
            </Form.Item>
          </Space>
          <Form.Item name="languageStyle" label="语言特点">
            <Input.TextArea rows={2} placeholder="短句、强情绪、口语化、画面感..." />
          </Form.Item>
          <Form.Item name="paceStyle" label="节奏特点">
            <Input placeholder="快节奏、强钩子、高爽点" />
          </Form.Item>
          <Form.Item name="hookStyle" label="Hook要求">
            <Input placeholder="开篇Hook、章内Hook、章末Hook的具体要求" />
          </Form.Item>
          <Form.Item name="forbiddenExpr" label="禁用表达">
            <Input.TextArea rows={2} placeholder="禁止套路化、禁止AI腔..." />
          </Form.Item>
          <Form.Item name="sampleText" label="示例文本">
            <Input.TextArea rows={4} placeholder="一段符合作品风格示例文本" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={detail?.name || '风格详情'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {detail && (
          <div>
            <p><Text strong>适用类型：</Text> {detail.genre || '-'}</p>
            <p><Text strong>叙事视角：</Text> {detail.perspective || '-'}</p>
            <p><Text strong>语言特点：</Text> {detail.languageStyle || '-'}</p>
            <p><Text strong>节奏特点：</Text> {detail.paceStyle || '-'}</p>
            <p><Text strong>Hook要求：</Text> {detail.hookStyle || '-'}</p>
            <p><Text strong>禁用表达：</Text> {detail.forbiddenExpr || '-'}</p>
            {detail.sampleText && (
              <>
                <p><Text strong>示例文本：</Text></p>
                <Paragraph style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                  {detail.sampleText}
                </Paragraph>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="AI推荐写作风格"
        open={recommendOpen}
        onCancel={() => setRecommendOpen(false)}
        footer={null}
        width={800}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          以下是系统内置的 7 种经典网文写作风格，选择一个快速创建。您也可以在此基础上自定义修改。
        </Paragraph>
        {BUILTIN_STYLES.map((style, index) => (
          <Card
            key={index}
            size="small"
            style={{ marginBottom: 12, cursor: 'pointer' }}
            hoverable
            onClick={() => handleUseRecommended(style)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space style={{ marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 15 }}>{style.name}</Text>
                  <Tag color="blue">{style.genre}</Tag>
                  <Tag>{style.perspective}</Tag>
                </Space>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                  <div><Text type="secondary">语言：</Text>{style.language}</div>
                  <div><Text type="secondary">节奏：</Text>{style.pace}</div>
                  <div><Text type="secondary">Hook：</Text>{style.hook}</div>
                  <div><Text type="secondary">禁忌：</Text><Text type="danger">{style.forbidden}</Text></div>
                </div>
              </div>
              <Button type="link">使用此风格</Button>
            </div>
          </Card>
        ))}
      </Modal>
    </div>
  );
}
