import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Typography, Table, Tag, Progress, Button, Space, Modal, Descriptions, Timeline, message, Tooltip, Row, Col, Statistic, Select, Alert } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined, PlusOutlined, ThunderboltOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api, { extractList } from '../services/api';

const { Title, Text } = Typography;

interface WorkflowRecord {
  id: string;
  projectId: string;
  chapterId: string | null;
  type: string;
  mode: string;
  status: string;
  currentStep: string | null;
  progress: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  stepOutputs?: any[];
  auditReports?: any[];
}

const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  pending: { color: 'default', text: '等待中', icon: <ClockCircleOutlined /> },
  planning: { color: 'processing', text: '规划中', icon: <LoadingOutlined /> },
  writing: { color: 'processing', text: '写作中', icon: <LoadingOutlined /> },
  deep_reading: { color: 'processing', text: '读者检查', icon: <LoadingOutlined /> },
  deep_editing: { color: 'processing', text: '编辑检查', icon: <LoadingOutlined /> },
  auditing: { color: 'processing', text: '审核中', icon: <LoadingOutlined /> },
  revising: { color: 'processing', text: '修订中', icon: <LoadingOutlined /> },
  settling: { color: 'processing', text: '入库中', icon: <LoadingOutlined /> },
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> },
  paused: { color: 'warning', text: '已暂停', icon: <PauseCircleOutlined /> },
  blocked: { color: 'error', text: '阻塞', icon: <CloseCircleOutlined /> },
};

const typeNames: Record<string, string> = {
  chapter_generation: '章节生成',
  outline_generation: '大纲生成',
  volume_generation: '卷纲生成',
  chapter_outline_generation: '章纲生成',
  world_setting_generation: '世界设定生成',
};

const modeConfig: Record<string, { color: string; text: string }> = {
  quick: { color: 'green', text: '快速' },
  standard: { color: 'blue', text: '标准' },
  strict: { color: 'red', text: '严格' },
};

const stepNames: Record<string, string> = {
  planning: '规划',
  writing: '写作',
  deep_reading: '读者检查',
  deep_editing: '编辑检查',
  auditing: '审核',
  revising: '修订',
  settling: '入库',
};

const stepOrder = ['planning', 'writing', 'deep_reading', 'deep_editing', 'auditing', 'revising', 'settling'];

export default function Workflow() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRecord | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 新增
  const [engineStats, setEngineStats] = useState<any>(null);
  const [createMode, setCreateMode] = useState<string>('standard');
  const [creating, setCreating] = useState(false);

  const fetchEngineStats = useCallback(async () => {
    try { const r: any = await api.get('/engine/stats'); setEngineStats(r); }
    catch { /* ignore */ }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/workflows/project/${projectId}`);
      setWorkflows(extractList(res));
    } catch (error) {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWorkflows();
    fetchEngineStats();

    const startPolling = () => {
      pollingRef.current = setInterval(() => { fetchWorkflows(); }, 5000);
    };
    const stopPolling = () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else { fetchWorkflows(); startPolling(); }
    };
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [fetchWorkflows, fetchEngineStats]);

  const handleAction = async (workflowId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      await api.post(`/workflows/${workflowId}/${action}`);
      message.success(action === 'pause' ? '已暂停' : action === 'resume' ? '已恢复' : '已取消');
      fetchWorkflows();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '操作失败');
    }
  };

  // 创建工作流
  const handleCreateWorkflow = async () => {
    if (!projectId) return;
    setCreating(true);
    try {
      const r: any = await api.post('/engine/workflow/create', {
        projectId,
        mode: createMode,
      });
      message.success('工作流已创建');
      fetchWorkflows();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '创建工作流失败');
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = async (workflow: WorkflowRecord) => {
    try {
      const detail: any = await api.get(`/workflows/${workflow.id}`);
      setSelectedWorkflow(detail as WorkflowRecord);
    } catch {
      setSelectedWorkflow(workflow);
    }
    setDetailVisible(true);
  };

  const canPause = (status: string) =>
    ['planning', 'writing', 'auditing', 'revising', 'deep_reading', 'deep_editing', 'settling'].includes(status);
  const canResume = (status: string) => status === 'paused';
  const canCancel = (status: string) =>
    ['pending', 'planning', 'writing', 'paused', 'auditing', 'revising', 'deep_reading', 'deep_editing', 'settling'].includes(status);

  const columns = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 100,
      render: (text: string) => <Text copyable style={{ fontSize: 12 }}>{text.slice(0, 8)}...</Text>,
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (type: string) => typeNames[type] || type },
    {
      title: '模式', dataIndex: 'mode', key: 'mode', width: 70,
      render: (mode: string) => { const cfg = modeConfig[mode] || { color: 'default', text: mode }; return <Tag color={cfg.color}>{cfg.text}</Tag>; },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (status: string) => { const cfg = statusConfig[status] || { color: 'default', text: status, icon: null }; return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>; },
    },
    {
      title: '进度', dataIndex: 'progress', key: 'progress', width: 140,
      render: (progress: number, record: WorkflowRecord) => (
        <Progress percent={Math.round(progress)} size="small" status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'} />
      ),
    },
    {
      title: '当前步骤', dataIndex: 'currentStep', key: 'currentStep', width: 130,
      render: (step: string | null, record: WorkflowRecord) => {
        if (!step) return '-';
        const stepIdx = stepOrder.indexOf(step);
        const isRunning = !['completed', 'failed', 'paused'].includes(record.status);
        return (
          <Space>
            <Tag color={isRunning ? 'processing' : stepIdx < stepOrder.indexOf(record.status === 'completed' ? 'settling' : step) ? 'green' : step === record.currentStep && isRunning ? 'blue' : 'default'}>
              {stepNames[step] || step}
            </Tag>
            {isRunning && <LoadingOutlined style={{ color: '#1890ff' }} />}
          </Space>
        );
      },
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_: any, record: WorkflowRecord) => (
        <Space>
          <Tooltip title="详情"><Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} /></Tooltip>
          {canPause(record.status) && <Tooltip title="暂停"><Button size="small" icon={<PauseCircleOutlined />} onClick={() => handleAction(record.id, 'pause')} /></Tooltip>}
          {canResume(record.status) && <Tooltip title="恢复"><Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleAction(record.id, 'resume')} /></Tooltip>}
          {canCancel(record.status) && <Tooltip title="取消"><Button size="small" danger icon={<StopOutlined />} onClick={() => handleAction(record.id, 'cancel')} /></Tooltip>}
        </Space>
      ),
    },
  ];

  const buildTimelineItems = (workflow: WorkflowRecord) => {
    const currentIdx = workflow.currentStep ? stepOrder.indexOf(workflow.currentStep) : -1;
    return stepOrder.map((step, idx) => {
      const isCompleted = workflow.status === 'completed' || (currentIdx > idx);
      const isCurrent = currentIdx === idx && workflow.status !== 'completed';
      const isFailed = workflow.status === 'failed' && isCurrent;
      let color: string;
      if (isCompleted) color = 'green';
      else if (isFailed) color = 'red';
      else if (isCurrent) color = 'blue';
      else color = 'gray';
      let label = stepNames[step] || step;
      if (isCompleted) label += ' ✅';
      else if (isCurrent) label += ' ⏳';
      else if (isFailed) label += ' ❌';
      return { color, children: label };
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {projectId && <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)}>返回</Button>}
          <div>
            <Title level={3} style={{ margin: 0 }}>工作流监控</Title>
            <Text type="secondary">AI创作任务执行状态与进度追踪</Text>
          </div>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" loading={creating} onClick={handleCreateWorkflow}>
            创建工作流
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchWorkflows} loading={loading}>刷新</Button>
        </Space>
      </div>

      {/* 引擎统计 */}
      {engineStats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="总任务数" value={engineStats.totalWorkflows || 0} prefix={<ThunderboltOutlined />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="运行中" value={engineStats.runningWorkflows || 0} valueStyle={{ color: '#1890ff' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="已完成" value={engineStats.completedWorkflows || 0} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="失败数" value={engineStats.failedWorkflows || 0} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        </Row>
      )}

      {/* 工作流统计 */}
      {workflows.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">全部</Text><div style={{ fontSize: 24, fontWeight: 600 }}>{workflows.length}</div></Card>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">运行中</Text><div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>{workflows.filter(w => !['completed', 'failed', 'paused'].includes(w.status)).length}</div></Card>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">已完成</Text><div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{workflows.filter(w => w.status === 'completed').length}</div></Card>
          <Card size="small" style={{ flex: 1 }}><Text type="secondary">失败</Text><div style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>{workflows.filter(w => w.status === 'failed').length}</div></Card>
        </div>
      )}

      <Card>
        <Table columns={columns} dataSource={workflows} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
      </Card>

      <Modal title="工作流详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={700}>
        {selectedWorkflow && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="ID" span={2}><Text copyable>{selectedWorkflow.id}</Text></Descriptions.Item>
              <Descriptions.Item label="类型">{typeNames[selectedWorkflow.type] || selectedWorkflow.type}</Descriptions.Item>
              <Descriptions.Item label="模式"><Tag color={modeConfig[selectedWorkflow.mode]?.color}>{modeConfig[selectedWorkflow.mode]?.text || selectedWorkflow.mode}</Tag></Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={statusConfig[selectedWorkflow.status]?.color}>{statusConfig[selectedWorkflow.status]?.text || selectedWorkflow.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="进度"><Progress percent={Math.round(selectedWorkflow.progress)} size="small" style={{ width: 120 }} /></Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedWorkflow.createdAt ? new Date(selectedWorkflow.createdAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedWorkflow.startedAt ? new Date(selectedWorkflow.startedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间" span={2}>{selectedWorkflow.completedAt ? new Date(selectedWorkflow.completedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              {selectedWorkflow.error && <Descriptions.Item label="错误信息" span={2}><Text type="danger">{selectedWorkflow.error}</Text></Descriptions.Item>}
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>执行步骤</Title>
            <Timeline items={buildTimelineItems(selectedWorkflow)} />
            {selectedWorkflow.stepOutputs && selectedWorkflow.stepOutputs.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>步骤输出</Title>
                {selectedWorkflow.stepOutputs.map((output: any, idx: number) => (
                  <Card key={idx} size="small" title={stepNames[output.stepName] || output.stepName} style={{ marginBottom: 8 }}>
                    <Descriptions size="small" column={2}>
                      <Descriptions.Item label="模型">{output.modelId || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Token消耗">{output.tokenUsage?.toLocaleString() || '-'}</Descriptions.Item>
                      <Descriptions.Item label="耗时">{output.duration ? `${output.duration}ms` : '-'}</Descriptions.Item>
                      <Descriptions.Item label="状态"><Tag color={output.status === 'success' ? 'green' : 'red'}>{output.status}</Tag></Descriptions.Item>
                    </Descriptions>
                    {output.error && <Text type="danger">{output.error}</Text>}
                  </Card>
                ))}
              </>
            )}
            {selectedWorkflow.auditReports && selectedWorkflow.auditReports.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>审核报告</Title>
                {selectedWorkflow.auditReports.map((report: any, idx: number) => (
                  <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                    <Space>
                      <Text strong>评分：{report.totalScore}</Text>
                      <Tag color={report.passStatus === 'PASS' ? 'success' : report.passStatus === 'MINOR_REVISE' ? 'warning' : report.passStatus === 'REWRITE' ? 'error' : 'default'}>{report.passStatus}</Tag>
                    </Space>
                    <div style={{ marginTop: 8 }}><Text>{report.suggestions}</Text></div>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
