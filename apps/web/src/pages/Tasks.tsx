import { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Drawer, Descriptions, Space, Select, message } from 'antd'
import { ReloadOutlined, StopOutlined, RedoOutlined } from '@ant-design/icons'
import api, { extractList } from '../services/api'
import PageHeader from '../components/PageHeader'

interface Task {
  id: string
  type: string
  status: string
  priority: string
  payload: string
  result?: string
  error?: string
  retryCount: number
  maxRetry: number
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  pending: 'blue',
  running: 'orange',
  completed: 'green',
  failed: 'red',
  cancelled: 'default',
  paused: 'gold',
}

const statusNames: Record<string, string> = {
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  paused: '已暂停',
}

const typeNames: Record<string, string> = {
  world_generation: '世界设定生成',
  outline_generation: '大纲生成',
  volume_generation: '卷纲生成',
  chapter_outline_generation: '章纲生成',
  chapter_generation: '章节生成',
  workflow_run: '工作流运行',
  analysis: '分析任务',
  export: '导出任务',
  knowledge_index: '知识库索引',
}

export default function Tasks() {
  const [data, setData] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Task | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    if (typeFilter) params.append('type', typeFilter)
    const qs = params.toString()
    api.get('/tasks' + (qs ? '?' + qs : ''))
      .then((r: any) => setData(extractList(r)))
      .catch(() => { /* poll silently */ })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [statusFilter, typeFilter])

  const openDetail = (task: Task) => {
    setSelected(task)
    api.get('/tasks/' + task.id)
      .then((r: any) => setSelected(r as Task))
      .catch(() => {})
    setDrawerOpen(true)
  }

  const handleRetry = async (id: string) => {
    try {
      await api.post('/tasks/' + id + '/retry')
      message.success('已提交重试')
      setDrawerOpen(false)
      load()
    } catch {
      message.error('重试失败')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await api.post('/tasks/' + id + '/cancel')
      message.success('已取消')
      setDrawerOpen(false)
      load()
    } catch {
      message.error('取消失败')
    }
  }

  const parsePayload = (payload: string) => {
    try { return JSON.stringify(JSON.parse(payload), null, 2) } catch { return payload }
  }

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 160,
      render: (v: string) => typeNames[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{statusNames[v] || v}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: '重试',
      key: 'retry',
      width: 80,
      render: (_: any, r: Task) => String(r.retryCount) + '/' + String(r.maxRetry),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_: any, r: Task) => (
        <Space size="small">
          <a onClick={() => openDetail(r)}>详情</a>
          {r.status === 'failed' && (
            <a onClick={() => handleRetry(r.id)} style={{ color: '#faad14' }}>重试</a>
          )}
          {(r.status === 'pending' || r.status === 'running') && (
            <a onClick={() => handleCancel(r.id)} style={{ color: '#ff4d4f' }}>取消</a>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="任务中心"
        extra={
          <Space>
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 110 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { label: '等待中', value: 'pending' },
                { label: '运行中', value: 'running' },
                { label: '已完成', value: 'completed' },
                { label: '失败', value: 'failed' },
                { label: '已取消', value: 'cancelled' },
              ]}
            />
            <Select
              allowClear
              placeholder="类型"
              style={{ width: 130 }}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
              options={Object.entries(typeNames).map(([k, v]) => ({ label: v, value: k }))}
            />
            <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          </Space>
        }
      />
      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t: number) => '共 ' + t + ' 条' }}
        />
      </Card>

      <Drawer
        title="任务详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {typeNames[selected.type] || selected.type}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[selected.status]}>
                {statusNames[selected.status] || selected.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{selected.priority}</Descriptions.Item>
            <Descriptions.Item label="重试">{String(selected.retryCount) + '/' + String(selected.maxRetry)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selected.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {selected.startedAt && (
              <Descriptions.Item label="开始时间">
                {new Date(selected.startedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
            {selected.completedAt && (
              <Descriptions.Item label="完成时间">
                {new Date(selected.completedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="参数">
              <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto', margin: 0 }}>
                {parsePayload(selected.payload)}
              </pre>
            </Descriptions.Item>
            {selected.result && (
              <Descriptions.Item label="结果">
                <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto', margin: 0 }}>
                  {selected.result.length > 2000
                    ? selected.result.slice(0, 2000) + '\n...(已截断)'
                    : selected.result}
                </pre>
              </Descriptions.Item>
            )}
            {selected.error && (
              <Descriptions.Item label="错误信息">
                <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto', margin: 0, color: '#ff4d4f' }}>
                  {selected.error}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            {selected?.status === 'failed' && (
              <Button type="primary" icon={<RedoOutlined />} onClick={() => handleRetry(selected.id)}>
                重试
              </Button>
            )}
            {(selected?.status === 'pending' || selected?.status === 'running') && (
              <Button danger icon={<StopOutlined />} onClick={() => handleCancel(selected.id)}>
                取消任务
              </Button>
            )}
          </Space>
        </div>
      </Drawer>
    </div>
  )
}
