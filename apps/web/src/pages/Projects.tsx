import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, message, Typography, Popconfirm, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { projectService, Project, CreateProjectDto } from '../services/projectService'
import { extractList, extractErrorMessage } from '../services/api'

const { Title } = Typography
const { TextArea } = Input

const genres = [
  '玄幻', '都市', '脑洞', '修仙', '科幻', '悬疑', '言情', '历史', '末世', '其他'
]

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await projectService.findAll()
      setProjects(extractList(res))
    } catch (error) {
      const msg = extractErrorMessage(error, '获取项目列表失败')
      setError(msg)
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreate = () => {
    setEditingProject(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    form.setFieldsValue(project)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await projectService.remove(id)
      message.success('删除成功')
      fetchProjects()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      // 确保 targetWords 是数字
      const payload = { ...values };
      if (payload.targetWords !== undefined && payload.targetWords !== null) {
        payload.targetWords = Number(payload.targetWords) || 500000;
      }
      if (editingProject) {
        await projectService.update(editingProject.id, payload)
        message.success('更新成功')
      } else {
        await projectService.create(payload)
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchProjects()
    } catch (error) {
      message.error(editingProject ? '更新失败' : '创建失败')
    }
  }

  const columns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', render: (text: string, record: Project) => (
      <a onClick={() => navigate(`/projects/${record.id}`)}>{text}</a>
    )},
    { title: '类型', dataIndex: 'genre', key: 'genre' },
    { title: '叙事视角', dataIndex: 'perspective', key: 'perspective' },
    { title: '目标字数', dataIndex: 'targetWords', key: 'targetWords', render: (v: number) => v?.toLocaleString() },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => v?.slice(0, 10) },
    { title: '操作', key: 'actions', render: (_: any, record: Project) => (
      <Space>
        <Button icon={<FolderOpenOutlined />} onClick={() => navigate(`/projects/${record.id}`)} />
        <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>项目管理</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchProjects} loading={loading}>刷新</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建项目</Button>
      </div>
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={fetchProjects}>重试</Button>}
        />
      )}
      <Table columns={columns} dataSource={projects} rowKey="id" loading={loading} />
      
      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="genre" label="小说类型">
            <Select options={genres.map(g => ({ label: g, value: g }))} />
          </Form.Item>
          <Form.Item name="perspective" label="叙事视角">
            <Select options={[{ label: '第一人称', value: '第一人称' }, { label: '第三人称', value: '第三人称' }]} />
          </Form.Item>
          <Form.Item name="targetWords" label="目标字数">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>{editingProject ? '更新' : '创建'}</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}