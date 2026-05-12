import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Button, Select, message, Tabs, Statistic, Row, Col, Popconfirm } from 'antd';
import { ReloadOutlined, FileTextOutlined, DeleteOutlined, BugOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Title, Text } = Typography;

interface TaskEntry {
  id: string; type: string; status: string; createdAt: string;
  completedAt?: string; retryCount: number; error?: string; result?: string;
}

interface LogEntry {
  id: string; timestamp: string; level: string; module: string;
  action: string; message: string; details?: any;
}

interface LogStats { total: number; errors: number; warnings: number; byModule: Record<string, number>; }

export default function LogCenter() {
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [logLevel, setLogLevel] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('tasks');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = { take: 100 };
      if (statusFilter) params.status = statusFilter;
      const res: any = await api.get('/tasks', { params });
      setTasks(extractList<TaskEntry>(res));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    setLogLoading(true);
    try {
      const params: any = { take: 200 };
      if (logLevel) params.level = logLevel;
      const [logRes, statsRes] = await Promise.all([
        api.get('/tasks/logs/all', { params }),
        api.get('/tasks/logs/stats'),
      ]);
      setLogs(Array.isArray(logRes) ? logRes : []);
      if (statsRes) setLogStats(statsRes as unknown as LogStats);
    } catch { /* silent */ }
    finally { setLogLoading(false); }
  };

  const clearLogs = async () => {
    try {
      await api.post('/tasks/logs/clear');
      message.success('日志已清空');
      fetchLogs();
    } catch { message.error('清空失败'); }
  };

  useEffect(() => { fetchTasks(); fetchLogs(); }, []);
  useEffect(() => { fetchTasks(); }, [statusFilter]);
  useEffect(() => { fetchLogs(); }, [logLevel]);

  // 自动刷新（每10秒）
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'tasks') fetchTasks();
      else fetchLogs();
    }, 10000);
    return () => clearInterval(timer);
  }, [activeTab, statusFilter, logLevel]);

  const statusColors: Record<string, string> = {
    pending: 'default', running: 'processing', completed: 'success',
    failed: 'error', cancelled: 'warning',
  };
  const levelColors: Record<string, string> = {
    info: 'blue', warn: 'orange', error: 'red', debug: 'default',
  };

  const taskColumns = [
    { title: '任务类型', dataIndex: 'type', key: 'type', width: 150,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag> },
    { title: '重试', dataIndex: 'retryCount', key: 'retryCount', width: 60 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
    { title: '完成时间', dataIndex: 'completedAt', key: 'completedAt', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
    { title: '错误信息', dataIndex: 'error', key: 'error', ellipsis: true,
      render: (v: string) => v ? <Text type="danger">{v}</Text> : '-' },
  ];

  const logColumns = [
    { title: '级别', dataIndex: 'level', key: 'level', width: 80,
      render: (v: string) => <Tag color={levelColors[v] || 'default'}>{v?.toUpperCase()}</Tag> },
    { title: '模块', dataIndex: 'module', key: 'module', width: 120,
      render: (v: string) => <Tag>{v}</Tag> },
    { title: '操作', dataIndex: 'action', key: 'action', width: 120 },
    { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <PageHeader title="日志中心" subtitle="查看任务运行日志和全局系统日志" noBack />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchTasks(); fetchLogs(); }}>刷新</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      {logStats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="总日志数" value={logStats.total} prefix={<FileTextOutlined />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="错误" value={logStats.errors} prefix={<BugOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="警告" value={logStats.warnings} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="活跃模块" value={Object.keys(logStats.byModule || {}).length} prefix={<InfoCircleOutlined />} /></Card></Col>
        </Row>
      )}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'tasks',
              label: '任务日志',
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Select placeholder="按状态筛选" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}
                      options={[
                        { label: '等待中', value: 'pending' }, { label: '运行中', value: 'running' },
                        { label: '已完成', value: 'completed' }, { label: '失败', value: 'failed' },
                      ]} />
                  </Space>
                  <Table dataSource={tasks} columns={taskColumns} rowKey="id" loading={loading}
                    pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} size="small" />
                </div>
              ),
            },
            {
              key: 'logs',
              label: '全局日志',
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Select placeholder="按级别筛选" allowClear style={{ width: 120 }} value={logLevel} onChange={setLogLevel}
                      options={[
                        { label: 'INFO', value: 'info' }, { label: 'WARN', value: 'warn' },
                        { label: 'ERROR', value: 'error' }, { label: 'DEBUG', value: 'debug' },
                      ]} />
                    <Popconfirm title="确认清空所有日志？" onConfirm={clearLogs}>
                      <Button icon={<DeleteOutlined />} danger>清空日志</Button>
                    </Popconfirm>
                  </Space>
                  <Table dataSource={logs} columns={logColumns} rowKey="id" loading={logLoading}
                    pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }} size="small" />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
