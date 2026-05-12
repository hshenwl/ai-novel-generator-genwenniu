import { useState } from 'react'
import { Form, Input, Button, Card, message, Tabs } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const onLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res: any = await api.post('/auth/login', values)
      if (res.success) {
        login(res.token, res.user)
        message.success('登录成功')
        navigate('/')
      } else {
        message.error(res.message || '登录失败')
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: { username: string; password: string; email?: string; nickname?: string }) => {
    setLoading(true)
    try {
      const res: any = await api.post('/auth/register', values)
      if (res.success) {
        login(res.token, res.user)
        message.success('注册成功')
        navigate('/')
      } else {
        message.error(res.message || '注册失败')
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>AI小说创作系统</h1>
          <p style={{ color: '#666' }}>本地优先 · 云端兼容</p>
        </div>
        <Tabs
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={onLogin} size="large">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={onRegister} size="large">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少3个字符' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '至少8个字符' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码（至少8位）" />
                  </Form.Item>
                  <Form.Item name="nickname">
                    <Input prefix={<UserOutlined />} placeholder="昵称（可选）" />
                  </Form.Item>
                  <Form.Item name="email">
                    <Input prefix={<MailOutlined />} placeholder="邮箱（可选）" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}