import { useState, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Dropdown, Avatar, theme } from 'antd'
import {
  BookOutlined,
  ProjectOutlined,
  SettingOutlined,
  DatabaseOutlined,
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  RobotOutlined,
  OrderedListOutlined,
  CodeOutlined,
  ImportOutlined,
  BulbOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'

const { Header, Sider, Content } = AntLayout

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '工作台' },
  { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
  { key: '/hot-rank-analysis', icon: <FireOutlined />, label: '热榜分析' },
  { key: '/model-configs', icon: <RobotOutlined />, label: '模型配置' },
  { key: '/tasks', icon: <OrderedListOutlined />, label: '任务中心' },
  { key: '/prompt-templates', icon: <CodeOutlined />, label: '提示词工坊' },
  { key: '/agent-rules', icon: <SafetyCertificateOutlined />, label: 'Agent规则' },
  { key: '/inspirations', icon: <BulbOutlined />, label: '灵感模式' },
  { key: '/knowledge', icon: <DatabaseOutlined />, label: '知识库' },
  { key: '/import-export', icon: <ImportOutlined />, label: '导入导出' },
  { key: '/log-center', icon: <FileTextOutlined />, label: '日志中心' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const userMenuItems = [
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else if (key === 'settings') {
      navigate('/settings')
    }
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <BookOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          {!collapsed && <span style={{ marginLeft: 8, fontSize: 16, fontWeight: 'bold' }}>AI小说</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            AI小说创作系统
          </div>
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.nickname || user?.username || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 24,
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          minHeight: 280,
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}