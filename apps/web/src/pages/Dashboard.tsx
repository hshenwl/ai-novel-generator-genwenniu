import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Typography, Button, List, Tag, Space, Skeleton, Empty, Alert, Divider } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
  EditOutlined,
  PlusOutlined,
  RightCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  ReloadOutlined,
  RobotOutlined,
  OrderedListOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const { Title, Text, Paragraph } = Typography

interface Stats {
  projectCount: number
  chapterCount: number
  characterCount: number
  totalWords: number
}

interface Project {
  id: string
  name: string
  genre: string
  perspective: string
  status: string
  targetWords: number
  createdAt: string
}

interface TodoItem {
  key: string
  label: string
  count: number
  icon: React.ReactNode
  color: string
  link?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ projectCount: 0, chapterCount: 0, characterCount: 0, totalWords: 0 })
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoadError(null)
    Promise.all([
      api.get('/projects/stats').catch(() => null),
      api.get('/projects').catch(() => null),
    ]).then(([statsRes, projectsRes]: any) => {
      if (statsRes) setStats(statsRes as Stats)
      if (projectsRes) {
        const list = (projectsRes.items || projectsRes || [])
          .sort((a: Project, b: Project) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
        setRecentProjects(list)
      }
      // 两个请求都失败了
      if (!statsRes && !projectsRes) {
        setLoadError('无法连接到服务器，请确认后端服务已启动')
      }
    }).catch(() => {
      setLoadError('加载数据时发生错误')
    }).finally(() => setLoading(false))
  }, [])

  // 待办事项
  const todos: TodoItem[] = [
    { key: 'projects', label: '待续写项目', count: stats.projectCount, icon: <BookOutlined />, color: '#1890ff', link: '/projects' },
    { key: 'chapters', label: '章节总数', count: stats.chapterCount, icon: <FileTextOutlined />, color: '#52c41a' },
    { key: 'characters', label: '已创建角色', count: stats.characterCount, icon: <TeamOutlined />, color: '#722ed1' },
    { key: 'words', label: '累计字数', count: stats.totalWords, icon: <EditOutlined />, color: '#fa8c16' },
  ]

  // 快速开始步骤
  const quickSteps = [
    { icon: <PlusOutlined />, label: '新建项目', desc: '创建一个新小说项目', action: () => navigate('/projects') },
    { icon: <RocketOutlined />, label: '世界设定', desc: '搭建世界观和人物设定', action: () => {
      if (recentProjects.length > 0) navigate(`/projects/${recentProjects[0].id}/world-setting`)
    }},
    { icon: <FileTextOutlined />, label: '开始创作', desc: '生成您的第一章内容', action: () => {
      if (recentProjects.length > 0) navigate(`/projects/${recentProjects[0].id}/chapters`)
    }},
  ]

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />

  if (loadError) {
    return (
      <div>
        <Title level={4} style={{ marginBottom: 16 }}>工作台</Title>
        <Alert
          message="加载失败"
          description={loadError}
          type="error"
          showIcon
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              重试
            </Button>
          }
        />
      </div>
    )
  }

  const hasProjects = stats.projectCount > 0

  return (
    <div>
      {/* 顶部欢迎区域 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          欢迎回来
        </Title>
        <Text type="secondary">管理您的小说项目，开启AI创作之旅</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        {todos.map(todo => (
          <Col xs={12} sm={12} lg={6} key={todo.key}>
            <Card
              hoverable
              onClick={() => todo.link && navigate(todo.link)}
              style={{ cursor: todo.link ? 'pointer' : 'default' }}
            >
              <Statistic
                title={todo.label}
                value={todo.count}
                prefix={todo.icon}
                valueStyle={{ color: todo.color }}
                suffix={todo.key === 'words' ? '字' : ''}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {hasProjects ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {/* 最近项目 */}
          <Col xs={24} lg={14}>
            <Card
              title="最近项目"
              extra={<a onClick={() => navigate('/projects')}>查看全部 <RightCircleOutlined /></a>}
            >
              <List
                dataSource={recentProjects}
                renderItem={(proj: Project) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    actions={[
                      <Button size="small" type="link" onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/projects/${proj.id}/chapters`)
                      }}>进入创作</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<BookOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                      title={
                        <Space>
                          {proj.name}
                          <Tag>{proj.genre || '未分类'}</Tag>
                          <Tag color={proj.status === 'active' ? 'green' : 'default'}>
                            {proj.status === 'active' ? '进行中' : proj.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary">
                          {proj.perspective || '未设置视角'} · 目标 {proj.targetWords?.toLocaleString() || '?'}字
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 待办提醒 & 快捷操作 */}
          <Col xs={24} lg={10}>
            <Card title="快捷操作" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block icon={<PlusOutlined />} onClick={() => navigate('/projects')}>
                  新建项目
                </Button>
                <Button block icon={<RobotOutlined />} onClick={() => navigate('/model-configs')}>
                  模型配置
                </Button>
                <Button block icon={<OrderedListOutlined />} onClick={() => navigate('/tasks')}>
                  任务中心
                </Button>
                {recentProjects.length > 0 && (
                  <>
                    <Button block icon={<RocketOutlined />} onClick={() => navigate(`/projects/${recentProjects[0].id}/workflow`)}>
                      查看工作流
                    </Button>
                    <Button block icon={<BulbOutlined />} onClick={() => navigate(`/projects/${recentProjects[0].id}/foreshadows`)}>
                      伏笔追踪
                    </Button>
                  </>
                )}
              </Space>
            </Card>

            {/* 创作提示 */}
            <Card title="创作小贴士">
              <Paragraph>
                <BulbOutlined style={{ color: '#faad14' }} /> 建议创作流程：
              </Paragraph>
              <Text type="secondary">
                ① 世界设定 → ② 小说总纲 → ③ 卷纲 → ④ 章纲 → ⑤ 正文生成 → ⑥ 审核修订 → ⑦ 入库导出
              </Text>
            </Card>
          </Col>
        </Row>
      ) : (
        // 空状态引导
        <Card style={{ marginTop: 24, textAlign: 'center', padding: 40 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={5}>还没有任何项目</Title>
                <Paragraph type="secondary">
                  点击下方按钮开始您的第一篇AI辅助小说创作之旅
                </Paragraph>
              </div>
            }
          >
            <Space direction="vertical" size="small">
              {quickSteps.map((step, idx) => (
                <Button
                  key={step.label}
                  type={idx === 0 ? 'primary' : 'default'}
                  size="large"
                  icon={step.icon}
                  onClick={step.action}
                  block
                >
                  {idx + 1}. {step.label} — {step.desc}
                </Button>
              ))}
            </Space>
          </Empty>
        </Card>
      )}
    </div>
  )
}
