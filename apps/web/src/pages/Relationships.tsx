import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, message, Space, Popconfirm, Tag, Segmented } from 'antd';
import { PlusOutlined, ApartmentOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  description: string;
  isHidden: boolean;
  status: string;
  firstChapter: number;
  lastChapter: number;
  createdAt: string;
}

interface Character {
  id: string;
  name: string;
  role: string;
}

interface GraphNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationType: string;
  isHidden: boolean;
}

const RELATION_TYPES = [
  '父子', '师徒', '恋人', '仇敌', '盟友', '兄弟',
  '姐妹', '主仆', '君臣', '对手', '合作', '暗恋',
  '叛徒', '卧底', '领袖', '成员', '隐藏关系',
];

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  dead: 'red',
};

const EDGE_COLORS: Record<string, string> = {
  '父子': '#52c41a', '师徒': '#1890ff', '恋人': '#eb2f96', '仇敌': '#f5222d',
  '盟友': '#52c41a', '兄弟': '#722ed1', '姐妹': '#722ed1', '主仆': '#fa8c16',
  '君臣': '#13c2c2', '对手': '#f5222d', '合作': '#52c41a', '暗恋': '#eb2f96',
  '叛徒': '#f5222d', '卧底': '#faad14', '领袖': '#1890ff', '成员': '#2f54eb',
};

const ROLE_COLORS: Record<string, string> = {
  protagonist: '#1890ff', antagonist: '#f5222d', supporting: '#52c41a',
  minor: '#faad14', mentor: '#722ed1', rival: '#eb2f96',
};

function RelationGraph({ nodes, edges, characters }: { nodes: Character[]; edges: Relationship[]; characters: Character[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const W = 800, H = 500;

  useEffect(() => {
    if (nodes.length === 0) return;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) * 0.35;
    const initialized: GraphNode[] = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
    });
    setGraphNodes(initialized);
  }, [nodes]);

  useEffect(() => {
    if (graphNodes.length === 0 || dragging) return undefined;
    let frame: number;
    const simulate = () => {
      const next = graphNodes.map(n => ({ ...n, vx: 0, vy: 0 }));
      const k = 0.01;
      for (let i = 0; i < next.length; i++) {
        for (let j = i + 1; j < next.length; j++) {
          let dx = next[j].x - next[i].x;
          let dy = next[j].y - next[i].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = (80 * 80) / dist;
          const fx = (dx / dist) * repulse * k;
          const fy = (dy / dist) * repulse * k;
          next[i].vx -= fx; next[i].vy -= fy;
          next[j].vx += fx; next[j].vy += fy;
        }
      }
      for (const e of edges) {
        const si = next.findIndex(n => n.id === e.sourceId);
        const ti = next.findIndex(n => n.id === e.targetId);
        if (si < 0 || ti < 0) continue;
        const dx = next[ti].x - next[si].x;
        const dy = next[ti].y - next[si].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const attract = (dist - 120) * 0.005;
        const fx = (dx / dist) * attract;
        const fy = (dy / dist) * attract;
        next[si].vx += fx; next[si].vy += fy;
        next[ti].vx -= fx; next[ti].vy -= fy;
      }
      for (const n of next) {
        n.vx += (W / 2 - n.x) * 0.001;
        n.vy += (H / 2 - n.y) * 0.001;
      }
      const damp = 0.85;
      const updated = next.map(n => ({
        ...n,
        x: Math.max(40, Math.min(W - 40, n.x + n.vx * damp)),
        y: Math.max(30, Math.min(H - 30, n.y + n.vy * damp)),
      }));
      setGraphNodes(updated);
      frame = requestAnimationFrame(simulate);
    };
    frame = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(frame);
  }, [graphNodes.length, dragging, edges]);

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const node = graphNodes.find(n => n.id === id);
    if (!node) return;
    setDragging(id);
    setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  }, [graphNodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    setGraphNodes(prev => prev.map(n => n.id === dragging ? { ...n, x, y } : n));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const nodeMap = Object.fromEntries(graphNodes.map(n => [n.id, n]));

  if (graphNodes.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>暂无角色数据，请先创建角色</div>;
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: W, border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#999" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const s = nodeMap[e.sourceId];
        const t = nodeMap[e.targetId];
        if (!s || !t) return null;
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / dist * 12, ny = dx / dist * 12;
        return (
          <g key={i}>
            <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={EDGE_COLORS[e.relationType] || '#999'}
              strokeWidth={e.isHidden ? 1 : 2}
              strokeDasharray={e.isHidden ? '4,4' : undefined}
              strokeOpacity={0.6}
            />
            <rect x={mx + nx - 16} y={my + ny - 9} width={32} height={18} rx={4}
              fill="white" stroke={EDGE_COLORS[e.relationType] || '#ccc'} strokeWidth={1} />
            <text x={mx + nx} y={my + ny + 4} textAnchor="middle" fontSize={11}
              fill={EDGE_COLORS[e.relationType] || '#666'}>
              {e.relationType}
            </text>
          </g>
        );
      })}
      {graphNodes.map(n => {
        const color = ROLE_COLORS[n.role] || '#1890ff';
        return (
          <g key={n.id}
            style={{ cursor: dragging === n.id ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handleMouseDown(n.id, e)}
          >
            <circle cx={n.x} cy={n.y} r={20} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />
            <text x={n.x} y={n.y - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#333">
              {n.name.length > 4 ? n.name.slice(0, 4) : n.name}
            </text>
            <text x={n.x} y={n.y + 10} textAnchor="middle" fontSize={9} fill="#999">
              {n.role}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Relationships() {
  const { id: projectId } = useParams();
  const [data, setData] = useState<Relationship[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: Character[]; edges: Relationship[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Relationship | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<string>('table');
  const [form] = Form.useForm();

  const loadCharacters = () => {
    api.get(`/characters/project/${projectId}`)
      .then((r: any) => setCharacters(extractList(r)))
      .catch(() => {});
  };

  const load = () => {
    setLoading(true);
    api.get(`/character-relationships?projectId=${projectId}`)
      .then((r: any) => setData(extractList(r)))
      .catch(() => message.error('加载关系列表失败'))
      .finally(() => setLoading(false));
  };

  const loadGraph = () => {
    api.get(`/character-relationships/graph?projectId=${projectId}`)
      .then((r: any) => setGraphData(r))
      .catch(() => {});
  };

  useEffect(() => { load(); loadCharacters(); loadGraph(); }, [projectId]);

  const getCharacterName = (id: string) => {
    const c = characters.find(c => c.id === id);
    return c ? c.name : id.substring(0, 8);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/character-relationships/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/character-relationships', { ...values, projectId });
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      load();
      loadGraph();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/character-relationships/${id}`);
      message.success('已删除');
      load();
      loadGraph();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '源角色', dataIndex: 'sourceId', key: 'sourceId', render: (v: string) => getCharacterName(v) },
    { title: '关系', dataIndex: 'relationType', key: 'relationType', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '目标角色', dataIndex: 'targetId', key: 'targetId', render: (v: string) => getCharacterName(v) },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '隐藏', dataIndex: 'isHidden', key: 'isHidden', width: 60,
      render: (v: boolean) => v ? <Tag color="orange">隐藏</Tag> : '-',
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v === 'active' ? '活跃' : v}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'action', width: 150,
      render: (_: any, r: Relationship) => (
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
        title="关系图谱"
        subtitle="管理角色之间的复杂关系"
        extra={
          <Space>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'table', label: <><UnorderedListOutlined /> 列表</> },
                { value: 'graph', label: <><ApartmentOutlined /> 图谱</> },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建关系</Button>
          </Space>
        }
      />

      {viewMode === 'table' && (
        <Card>
          <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />
        </Card>
      )}

      {viewMode === 'graph' && (
        <Card title="角色关系图谱" extra={<Button size="small" onClick={loadGraph}>刷新</Button>}>
          {graphData ? (
            <RelationGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              characters={characters}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <ApartmentOutlined style={{ fontSize: 48, color: '#ccc' }} />
              <div style={{ marginTop: 12, color: '#999' }}>加载图谱数据中...</div>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(EDGE_COLORS).filter(([t]) => data.some(d => d.relationType === t)).map(([type, color]) => (
              <Tag key={type} color={color}>{type}</Tag>
            ))}
          </div>
        </Card>
      )}

      <Modal
        title={editing ? '编辑关系' : '新建关系'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="sourceId" label="源角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select showSearch placeholder="搜索并选择角色" filterOption={(input, option) =>
              (option?.children as any)?.toString().toLowerCase().includes(input.toLowerCase())
            }>
              {characters.map(c => <Select.Option key={c.id} value={c.id}>{c.name} ({c.role})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="relationType" label="关系类型" rules={[{ required: true }]}>
            <Select showSearch>
              {RELATION_TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="targetId" label="目标角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select showSearch placeholder="搜索并选择角色" filterOption={(input, option) =>
              (option?.children as any)?.toString().toLowerCase().includes(input.toLowerCase())
            }>
              {characters.map(c => <Select.Option key={c.id} value={c.id}>{c.name} ({c.role})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="关系描述">
            <Input.TextArea rows={2} placeholder="可选的补充说明" />
          </Form.Item>
          <Form.Item name="isHidden" label="隐藏关系" valuePropName="checked" tooltip="隐藏关系仅在关系图谱中标记，不会在角色详情中显示">
            <Switch />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="firstChapter" label="起始章节">
              <InputNumber min={0} style={{ width: 150 }} placeholder="第几章" />
            </Form.Item>
            <Form.Item name="lastChapter" label="结束章节">
              <InputNumber min={0} style={{ width: 150 }} placeholder="第几章" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
