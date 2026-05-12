import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Tabs, Typography, Statistic, Row, Col, Skeleton } from 'antd';
import { BookOutlined, FileTextOutlined, TeamOutlined, BranchesOutlined,
  HeartOutlined, NodeIndexOutlined, ExperimentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface Project {
  id: string;
  name: string;
  genre: string;
  perspective: string;
  description: string;
  targetWords: number;
  status: string;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(`/projects/${id}`).then((res: any) => setProject(res as Project))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // 从当前路径推断活跃Tab
  const pathPart = location.pathname.split('/').pop() || '';
  const activeKeyMap: Record<string, string> = {
    'world-setting': 'world-setting',
    'outline': 'outline',
    'volumes': 'volumes',
    'chapter-outlines': 'chapter-outlines',
    'chapters': 'chapters',
    'characters': 'characters',
    'organizations': 'organizations',
    'foreshadows': 'foreshadows',
    'hooks': 'hooks',
    'workflow': 'workflow',
    'careers': 'careers',
    'relationships': 'relationships',
    'quality': 'quality',
    'de-flavor': 'de-flavor',
    'writing-styles': 'writing-styles',
  };
  const activeKey = activeKeyMap[pathPart] || 'world-setting';

  const tabs = [
    { key: 'world-setting', label: '世界设定' },
    { key: 'outline', label: '小说总纲' },
    { key: 'volumes', label: '卷纲管理' },
    { key: 'chapter-outlines', label: '章纲管理' },
    { key: 'chapters', label: '章节管理' },
    { key: 'characters', label: '角色管理' },
    { key: 'organizations', label: '组织管理' },
    { key: 'careers', label: '职业管理' },
    { key: 'relationships', label: '关系图谱' },
    { key: 'foreshadows', label: '伏笔管理' },
    { key: 'hooks', label: 'Hook管理' },
    { key: 'workflow', label: '工作流' },
    { key: 'quality', label: '质量中心' },
    { key: 'de-flavor', label: 'AI去味' },
    { key: 'writing-styles', label: '写作风格' },
  ];

  if (loading) return <Skeleton active />;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {project?.name || '项目详情'}
        </Title>
        {project && (
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            {project.genre} · {project.perspective} · 目标 {project.targetWords?.toLocaleString()}字
          </div>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="类型" value={project?.genre || '-'} prefix={<BookOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="视角" value={project?.perspective || '-'} prefix={<FileTextOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="目标字数" value={project?.targetWords?.toLocaleString() || 0} prefix={<BranchesOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="状态" value={project?.status === 'active' ? '进行中' : project?.status || '-'} prefix={<TeamOutlined />} />
          </Col>
        </Row>
      </Card>

      <Card>
        <Tabs
          activeKey={activeKey}
          onChange={(key) => navigate(`/projects/${id}/${key}`)}
          items={tabs.map(t => ({
            key: t.key,
            label: t.label,
          }))}
        />
      </Card>
    </div>
  );
}
