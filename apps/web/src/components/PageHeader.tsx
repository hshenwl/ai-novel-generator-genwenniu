import React from 'react'
import { Typography, Space, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'

const { Title, Text } = Typography

interface Props {
  title: string
  subtitle?: string
  extra?: React.ReactNode
  /** 返回目标路径，若不传则自动返回项目详情 */
  backTo?: string
  /** 设为 true 隐藏返回按钮 */
  noBack?: boolean
}

const PageHeader: React.FC<Props> = ({ title, subtitle, extra, backTo, noBack }) => {
  const navigate = useNavigate()
  const { id: projectId } = useParams()

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
    } else if (projectId) {
      navigate(`/projects/${projectId}`)
    } else {
      navigate(-1)
    }
  }

  return (
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!noBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{ padding: '4px 8px' }}
          >
            返回
          </Button>
        )}
        <div>
          <Title level={3} style={{ margin: 0 }}>{title}</Title>
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
      </div>
      {extra && <Space>{extra}</Space>}
    </div>
  )
}

export default PageHeader
