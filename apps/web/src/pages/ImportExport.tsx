import { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, message, Divider, Space, Tag, Select, Alert, Table, Input } from 'antd';
import {
  DownloadOutlined, UploadOutlined, FileTextOutlined, FileAddOutlined,
  FileZipOutlined, CloudDownloadOutlined, TeamOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import api, { extractList } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Project { id: string; name: string; genre: string; }

export default function ImportExport() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importJson, setImportJson] = useState('');

  useEffect(() => {
    api.get('/projects').then((r: any) => setProjects(extractList<Project>(r))).catch(() => {});
  }, []);

  const handleExport = async (format: string) => {
    if (!selectedProject) {
      message.warning('请先选择一个项目');
      return;
    }
    setExporting(true);
    try {
      const res = await api.get(`/export/project/${selectedProject}?format=${format}`, { responseType: 'blob' as any });
      const blob = res instanceof Blob ? res : (res as any)?.data instanceof Blob ? (res as any).data : new Blob([res as any]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novel-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success(`${format.toUpperCase()} 导出成功`);
    } catch (err: any) {
      message.error(`导出失败: ${err?.message || '请检查项目是否存在'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCharacters = async () => {
    if (!selectedProject) { message.warning('请先选择项目'); return; }
    setExporting(true);
    try {
      const res = await api.get(`/export/characters/${selectedProject}`, { responseType: 'blob' as any });
      const blob = res instanceof Blob ? res : (res as any)?.data instanceof Blob ? (res as any).data : new Blob([res as any]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'characters.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('角色卡片导出成功');
    } catch { message.error('导出失败'); }
    finally { setExporting(false); }
  };

  const handleExportAudit = async () => {
    if (!selectedProject) { message.warning('请先选择项目'); return; }
    setExporting(true);
    try {
      const res = await api.get(`/export/audit-reports/${selectedProject}`, { responseType: 'blob' as any });
      const blob = res instanceof Blob ? res : (res as any)?.data instanceof Blob ? (res as any).data : new Blob([res as any]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'audit-reports.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('审核报告导出成功');
    } catch { message.error('导出失败'); }
    finally { setExporting(false); }
  };

  const handleImport = async () => {
    if (!importJson.trim()) { message.warning('请粘贴JSON数据'); return; }
    setImporting(true);
    try {
      const data = JSON.parse(importJson);
      if (!data.project?.name) { message.error('无效的项目数据：缺少project.name'); return; }
      const project: any = await api.post('/projects', {
        name: data.project.name,
        genre: data.project.genre || '玄幻',
        perspective: data.project.perspective || '第三人称',
        description: data.project.description || `导入自：${data.project.name}`,
        targetWords: data.project.targetWords || 500000,
      });
      const pid = project.id;
      if (data.worldSetting) {
        await api.post(`/world-settings/project/${pid}`, data.worldSetting).catch(() => {});
      }
      if (data.outline) {
        await api.post(`/outlines/project/${pid}`, data.outline).catch(() => {});
      }
      if (data.characters?.length > 0) {
        for (const c of data.characters.slice(0, 50)) {
          await api.post('/characters', { ...c, projectId: pid, id: undefined }).catch(() => {});
        }
      }
      if (data.organizations?.length > 0) {
        for (const o of data.organizations.slice(0, 20)) {
          await api.post('/organizations', { ...o, projectId: pid, id: undefined }).catch(() => {});
        }
      }
      message.success(`项目「${data.project.name}」导入成功！`);
      setImportJson('');
    } catch (e: any) {
      if (e instanceof SyntaxError) { message.error('JSON格式错误，请检查数据'); }
      else { message.error(`导入失败: ${e?.message || '未知错误'}`); }
    } finally { setImporting(false); }
  };

  return (
    <div>
      <PageHeader title="导入导出" subtitle="导入导出小说数据、角色卡片、审核报告" />

      <Alert
        message="选择项目后，可导出该项目的全部数据"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title="选择项目" style={{ marginBottom: 16 }}>
        <Select
          style={{ width: '100%' }}
          placeholder="选择要导出的项目"
          value={selectedProject}
          onChange={setSelectedProject}
          options={projects.map(p => ({ label: `${p.name} (${p.genre || '未分类'})`, value: p.id }))}
          showSearch
          filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={<Space><DownloadOutlined /> 导出项目数据</Space>}>
            <Row gutter={[16, 16]}>
              {[
                { format: 'json', label: '导出 JSON', desc: '完整项目数据备份（含所有设定、章节、角色）', color: '#faad14', icon: <FileZipOutlined /> },
                { format: 'txt', label: '导出 TXT', desc: '纯文本格式，大纲+正文', color: '#1890ff', icon: <FileTextOutlined /> },
                { format: 'md', label: '导出 Markdown', desc: 'Markdown 格式，可预览排版', color: '#722ed1', icon: <FileAddOutlined /> },
              ].map(item => (
                <Col xs={24} sm={8} key={item.format}>
                  <Card
                    hoverable
                    size="small"
                    onClick={() => handleExport(item.format)}
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 32, color: item.color }}>{item.icon}</div>
                    <div style={{ marginTop: 8, fontWeight: 500 }}>{item.label}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title={<Space><TeamOutlined /> 导出资产</Space>}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card hoverable size="small" onClick={handleExportCharacters} style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: 32, color: '#52c41a' }}><TeamOutlined /></div>
                  <div style={{ marginTop: 8, fontWeight: 500 }}>导出角色卡片</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>JSON 格式，含全部角色信息</Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card hoverable size="small" onClick={handleExportAudit} style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: 32, color: '#f5222d' }}><SafetyCertificateOutlined /></div>
                  <div style={{ marginTop: 8, fontWeight: 500 }}>导出审核报告</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>JSON 格式，含全部审核记录</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title={<Space><UploadOutlined /> 导入项目数据</Space>}>
            <Alert type="info" message="粘贴之前导出的JSON数据，将创建新项目并导入世界设定、大纲、角色和组织" style={{ marginBottom: 12 }} />
            <TextArea
              rows={6}
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder='粘贴JSON数据，格式如：{"project":{"name":"...","genre":"..."}, "worldSetting":{...}, "outline":{...}, "characters":[...], ...}'
            />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button type="primary" icon={<UploadOutlined />} onClick={handleImport} loading={importing}>
                导入数据
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
