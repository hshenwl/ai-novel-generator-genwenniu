import { useState, useEffect } from 'react';
import {
  Card, Typography, Button, Space, Input, Select, message, Tooltip,
  Modal, Form, Row, Col, Tag, Alert, Badge, Collapse, Empty
} from 'antd';
import {
  SaveOutlined, SendOutlined, SettingOutlined, EyeOutlined,
  FileTextOutlined, WarningOutlined, ReloadOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ModelSelector from '../components/ModelSelector';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface ChapterOutline {
  id: string;
  chapterNo: number;
  title: string;
  summary: string;
  conflict: string;
  openingHook: string;
  endingHook: string;
  inChapterHook: string;
  coolPoints: string;
  emotionalPoint: string;
  characters: string;
  scenes: string;
  foreshadows: string;
}

interface AuditReport {
  id: string;
  totalScore: number;
  passStatus: string;
  suggestions: string;
  issues: string;
  createdAt: string;
}

export default function ChapterEditor() {
  const { id: projectId, chapterId } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [chapterNo, setChapterNo] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(false);
  const [outline, setOutline] = useState<ChapterOutline | null>(null);
  const [volumes, setVolumes] = useState<any[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState('');
  const [chapterOutlines, setChapterOutlines] = useState<ChapterOutline[]>([]);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);
  const [form] = Form.useForm();

  // 工作流状态
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowCurrentStep, setWorkflowCurrentStep] = useState<string | null>(null);
  const [workflowPolling, setWorkflowPolling] = useState<ReturnType<typeof setInterval> | null>(null);

  // 检查章末是否有Hook
  const hasEndingHook = (() => {
    const last200 = content.slice(-200);
    const hookWords = ['突然', '却', '没想到', '不料', '然而', '就在这时', '这时', '可是', '但'];
    return hookWords.some(w => last200.includes(w));
  })();

  // 如果有 chapterId，直接加载该章节
  useEffect(() => {
    if (chapterId && chapterId !== 'new') {
      api.get(`/chapters/${chapterId}`).then((res: any) => {
        if (res?.id) {
          setContent(res.content || '');
          setTitle(res.title || '');
          setChapterNo(res.chapterNo || 1);
          if (res.volumeId) setSelectedVolumeId(res.volumeId);
        }
      }).catch(() => message.error('加载章节失败'));
    }
  }, [chapterId]);

  useEffect(() => {
    if (projectId) {
      api.get(`/volumes/project/${projectId}`).then((res: any) => {
        const list = Array.isArray(res) ? res : res?.items || [];
        setVolumes(list);
        if (list.length > 0 && !selectedVolumeId) setSelectedVolumeId(list[0].id);
      });
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedVolumeId) {
      api.get(`/chapter-outlines/volume/${selectedVolumeId}`).then((res: any) => {
        const list = Array.isArray(res) ? res : [];
        setChapterOutlines(list);
      });
      api.get(`/chapters/volume/${selectedVolumeId}`).then((res: any) => {
        const list = Array.isArray(res) ? res : [];
        if (list.length > 0) {
          const latest = list[list.length - 1];
          setContent(latest.content || '');
          setTitle(latest.title || '');
          setChapterNo(latest.chapterNo || 1);
        }
      });
    }
  }, [selectedVolumeId]);

  useEffect(() => {
    const count = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').length;
    setWordCount(count);
  }, [content]);

  const handleOutlineSelect = (outlineId: string) => {
    const selected = chapterOutlines.find(o => o.id === outlineId);
    if (selected) {
      setOutline(selected);
      setTitle(selected.title || `第${selected.chapterNo}章`);
      setChapterNo(selected.chapterNo);
      setOutlineVisible(false);
      message.info(`已加载章纲「${selected.title || `第${selected.chapterNo}章`}」`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        projectId,
        volumeId: selectedVolumeId,
        chapterNo,
        title,
        content,
        wordCount,
      };

      // 查找是否已有章节
      const existingChapters: any = await api.get(`/chapters/volume/${selectedVolumeId}`);
      const list = Array.isArray(existingChapters) ? existingChapters : [];
      const existing = list.find((c: any) => c.chapterNo === chapterNo);

      if (existing) {
        await api.put(`/chapters/${existing.id}`, { title, content, chapterNo });
      } else {
        await api.post('/chapters', payload);
      }
      message.success('保存成功');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const startWorkflowPolling = (wfId: string) => {
    if (workflowPolling) clearInterval(workflowPolling);
    const poll = setInterval(async () => {
      try {
        const wf: any = await api.get(`/engine/workflow/${wfId}`);
        if (wf?.workflow) {
          const w = wf.workflow;
          setWorkflowStatus(w.status);
          setWorkflowCurrentStep(w.currentStep || '');
          if (w.status === 'completed') {
            clearInterval(poll);
            setWorkflowPolling(null);
            setGenerating(false);
            if (w.result?.content) {
              setContent(w.result.content);
              message.success('章节生成完成！');
            } else {
              const chapters: any = await api.get(`/chapters/volume/${selectedVolumeId}`);
              const list = Array.isArray(chapters) ? chapters : [];
              const latest = list.find((c: any) => c.chapterNo === chapterNo);
              if (latest?.content) {
                setContent(latest.content);
                message.success('章节已更新，正在加载...');
              } else {
                message.success('工作流完成，请刷新查看结果');
              }
            }
          } else if (w.status === 'failed' || w.status === 'blocked') {
            clearInterval(poll);
            setWorkflowPolling(null);
            setGenerating(false);
            setWorkflowStatus(null);
            message.error(`工作流${w.status === 'failed' ? '失败' : '被阻塞'}：${w.error || '未知错误'}`);
          }
        }
      } catch {
        clearInterval(poll);
        setWorkflowPolling(null);
        setGenerating(false);
        setWorkflowStatus(null);
      }
    }, 3000);
    setWorkflowPolling(poll);
  };

  useEffect(() => {
    return () => { if (workflowPolling) clearInterval(workflowPolling); };
  }, [workflowPolling]);

  const handleGenerate = async () => {
    let values: any = {};
    try {
      // 如果用户打开过设置弹窗，表单已被初始化
      values = form.getFieldsValue() || {};
    } catch {
      values = {};
    }
    setGenerating(true);
    try {
      const payload: any = {
        projectId,
        mode: values.mode || 'standard',
        context: {
          genre: values.genre || '都市',
          perspective: values.perspective || 'first',
          writingStyle: values.style || 'tomato_first_person',
          chapterOutline: outline?.summary || '',
          targetWords: values.targetWords || 2500,
        },
      };

      if (outline) {
        payload.context.characters = (outline.characters || '').split(/[,，、\s]+/).filter(Boolean);
        payload.context.chapterOutline = outline.summary;
        payload.context.chapterOutlineDetail = JSON.stringify(outline);
      }

      // 尝试调用AI生成
      payload.model = selectedModel || undefined;
      const res: any = await api.post('/engine/chapter/generate', payload);

      if (res?.workflow?.id) {
        setWorkflowId(res.workflow.id);
        setWorkflowStatus('running');
        setWorkflowCurrentStep('初始化');
        startWorkflowPolling(res.workflow.id);
      }
    } catch (error: any) {
      // 如果后端不可用，使用模拟生成（保持可演示）
      if (error?.response?.status === 404 || error?.response?.status === 503) {
        const demoContent = generateDemoContent(chapterNo, outline);
        setContent(demoContent);
        message.success('章节生成完成（演示模式）');
      } else {
        message.error(error?.response?.data?.message || '生成失败，请确认AI模型已配置');
      }
    } finally {
      setGenerating(false);
    }
  };

  const loadAuditReport = async () => {
    try {
      const res: any = await api.get(`/chapters/volume/${selectedVolumeId}`);
      const list = Array.isArray(res) ? res : [];
      const chapter = list.find((c: any) => c.chapterNo === chapterNo);
      if (chapter?.id) {
        const detail: any = await api.get(`/chapters/${chapter.id}`);
        if (detail?.auditReports) {
          setAuditReports(detail.auditReports);
        }
      }
    } catch {
      // 静默
    }
  };

  useEffect(() => {
    if (chapterNo > 0) loadAuditReport();
  }, [chapterNo]);

  const generateSettingsForm = (
    <Form form={form} layout="vertical" initialValues={{
      mode: 'standard',
      targetWords: 2500,
      style: 'tomato_first_person',
      perspective: 'first',
      genre: 'urban',
      auditLevel: 'standard',
      deFlavorLevel: 'standard',
      requireHook: true,
    }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="创作模式" name="mode">
            <Select>
              <Select.Option value="quick">快速模式：直接生成</Select.Option>
              <Select.Option value="standard">标准模式：七步流程</Select.Option>
              <Select.Option value="strict">严格模式：多次复审</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="目标字数" name="targetWords">
            <Select>
              <Select.Option value={2000}>2000字</Select.Option>
              <Select.Option value={2500}>2500字（推荐）</Select.Option>
              <Select.Option value={3000}>3000字</Select.Option>
              <Select.Option value={4000}>4000字</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="写作风格" name="style">
            <Select>
              <Select.Option value="tomato_first_person">番茄风第一人称</Select.Option>
              <Select.Option value="qd_third_person">起点风第三人称</Select.Option>
              <Select.Option value="brain_hole">脑洞爽文风</Select.Option>
              <Select.Option value="suspense">悬疑强钩子风</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="叙事视角" name="perspective">
            <Select>
              <Select.Option value="first">第一人称</Select.Option>
              <Select.Option value="third">第三人称</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="小说类型" name="genre">
            <Select>
              <Select.Option value="urban">都市</Select.Option>
              <Select.Option value="xuanhuan">玄幻</Select.Option>
              <Select.Option value="xiuxian">修仙</Select.Option>
              <Select.Option value="scifi">科幻</Select.Option>
              <Select.Option value="suspense">悬疑</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="审核强度" name="auditLevel">
            <Select>
              <Select.Option value="mild">轻度</Select.Option>
              <Select.Option value="standard">标准</Select.Option>
              <Select.Option value="strict">严格</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="AI去味强度" name="deFlavorLevel">
            <Select>
              <Select.Option value="mild">轻度</Select.Option>
              <Select.Option value="standard">标准</Select.Option>
              <Select.Option value="strong">强力</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="章末Hook" name="requireHook" valuePropName="checked">
            <Select>
              <Select.Option value={true}>强制要求</Select.Option>
              <Select.Option value={false}>不强制</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  // 预览渲染（简单Markdown转HTML）
  const renderPreview = (text: string) => {
    if (!text) return <Text type="secondary">暂无内容</Text>;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h2 key={i}>{line.slice(2)}</h2>;
      if (line.startsWith('## ')) return <h3 key={i}>{line.slice(3)}</h3>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
    });
  };

  return (
    <div style={{ padding: 24, height: '100%' }}>
      {/* 顶部工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}/chapters`)}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>章节编辑器</Title>
          <Badge count={`${wordCount}字`} style={{ backgroundColor: wordCount >= 2000 ? '#52c41a' : '#faad14' }} />
          {!hasEndingHook && content.length > 100 && (
            <Badge count="章末缺Hook" style={{ backgroundColor: '#ff4d4f' }} />
          )}
        </Space>

        <Space>
          <Select
            value={selectedVolumeId}
            onChange={(v) => setSelectedVolumeId(v)}
            style={{ width: 160 }}
            placeholder="选择卷"
            options={volumes.map((vol: any) => ({
              label: `第${vol.orderIndex}卷 · ${vol.title}`,
              value: vol.id,
            }))}
          />
          <Button
            icon={<FileTextOutlined />}
            onClick={() => setOutlineVisible(true)}
            type={outline ? 'primary' : 'default'}
            ghost={!!outline}
          >
            {outline ? `章纲#${outline.chapterNo}` : '选择章纲'}
          </Button>
          <Tooltip title="生成设置">
            <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} />
          </Tooltip>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>预览</Button>
          <Button icon={<SaveOutlined />} type="primary" onClick={handleSave} loading={saving}>保存</Button>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} size="small" />
          <Button icon={<SendOutlined />} type="primary" onClick={handleGenerate} loading={generating}>
            {generating ? `生成中${workflowCurrentStep ? `: ${workflowCurrentStep}` : '...'}` : '启动创作流程'}
          </Button>
          {workflowStatus && (
            <Tag color={workflowStatus === 'completed' ? 'success' : 'processing'}>
              {workflowStatus === 'completed' ? '已完成' : workflowCurrentStep || '处理中'}
            </Tag>
          )}
        </Space>
      </div>

      <Row gutter={16} style={{ height: 'calc(100vh - 200px)' }}>
        {/* 左侧章纲面板 */}
        {outline && (
          <Col span={6}>
            <Card
              size="small"
              title={
                <Space>
                  <FileTextOutlined />
                  章纲 #{outline.chapterNo}
                </Space>
              }
              extra={
                <Button size="small" type="link" onClick={() => setOutline(null)}>
                  清除
                </Button>
              }
              style={{ height: '100%', overflow: 'auto' }}
            >
              <Collapse defaultActiveKey={['summary', 'hooks']} size="small">
                <Panel header="剧情梗概" key="summary">
                  <Text style={{ fontSize: 13 }}>{outline.summary || '未填写'}</Text>
                </Panel>
                <Panel header="Hook设计" key="hooks">
                  <div style={{ fontSize: 13 }}>
                    <Text type="secondary">开篇：</Text>
                    <Tag color="green">{outline.openingHook || '无'}</Tag><br />
                    <Text type="secondary">章内：</Text>
                    <Tag color="orange">{outline.inChapterHook || '无'}</Tag><br />
                    <Text type="secondary">章末：</Text>
                    <Tag color={outline.endingHook ? 'blue' : 'red'}>{outline.endingHook || '缺失!'}</Tag>
                  </div>
                </Panel>
                <Panel header="冲突 & 爽点" key="conflict">
                  <div style={{ fontSize: 13 }}>
                    <Text type="secondary">核心冲突：</Text>
                    <Tag color="red">{outline.conflict || '无'}</Tag><br />
                    <Text type="secondary">爽点设计：</Text>
                    <Tag color="purple">{outline.coolPoints || '无'}</Tag><br />
                    <Text type="secondary">情绪爆点：</Text>
                    <Tag color="volcano">{outline.emotionalPoint || '无'}</Tag>
                  </div>
                </Panel>
                <Panel header="角色 & 场景" key="scene">
                  <div style={{ fontSize: 13 }}>
                    <Text type="secondary">出场角色：</Text>
                    <div>{outline.characters || '无'}</div>
                    <Text type="secondary">场景地点：</Text>
                    <div>{outline.scenes || '无'}</div>
                    <Text type="secondary">伏笔：</Text>
                    <div>{outline.foreshadows || '无'}</div>
                  </div>
                </Panel>
              </Collapse>

              {/* 章末Hook提醒 */}
              {!hasEndingHook && content.length > 100 && (
                <Alert
                  style={{ marginTop: 12 }}
                  message="章末缺少Hook"
                  description="建议在章节结尾加入悬念或反转，提升追读率"
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                />
              )}
            </Card>
          </Col>
        )}

        {/* 主编辑区 */}
        <Col span={outline ? 12 : 16}>
          <Card size="small" style={{ marginBottom: 8 }}>
            <Space style={{ width: '100%' }}>
              <Text strong>第{chapterNo}章</Text>
              <Input
                placeholder="输入章节标题"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ flex: 1, fontWeight: 'bold', border: 'none', boxShadow: 'none' }}
              />
            </Space>
          </Card>

          <Card style={{ height: 'calc(100% - 50px)' }} bodyStyle={{ height: '100%', padding: 12 }}>
            <TextArea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="在此输入章节内容，或先选择章纲再点击「启动创作流程」让AI生成..."
              style={{
                height: '100%',
                resize: 'none',
                fontSize: 15,
                lineHeight: 1.8,
                fontFamily: 'Microsoft YaHei, sans-serif',
                border: 'none',
              }}
            />
          </Card>
        </Col>

        {/* 右侧审核面板 */}
        <Col span={outline ? 6 : 8}>
          <Card
            size="small"
            title="审核报告"
            extra={<Button size="small" icon={<ReloadOutlined />} onClick={loadAuditReport}>刷新</Button>}
            style={{ height: '100%', overflow: 'auto' }}
          >
            {auditReports.length > 0 ? (
              auditReports.map((report, idx) => (
                <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>评分：{report.totalScore}</Text>
                    <Tag color={
                      report.passStatus === 'PASS' ? 'success' :
                      report.passStatus?.includes('REVISE') ? 'warning' :
                      report.passStatus === 'REWRITE' ? 'error' : 'default'
                    }>
                      {report.passStatus === 'PASS' ? '通过' :
                       report.passStatus === 'MINOR_REVISE' ? '轻修' :
                       report.passStatus === 'MAJOR_REVISE' ? '重修' :
                       report.passStatus === 'REWRITE' ? '重写' : report.passStatus}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <Text>{report.suggestions?.slice(0, 100)}</Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {report.createdAt ? new Date(report.createdAt).toLocaleString('zh-CN') : ''}
                    </Text>
                  </div>
                </Card>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      <Text type="secondary">暂无审核报告</Text><br />
                      <Text type="secondary" style={{ fontSize: 12 }}>生成并保存章节后将自动审核</Text>
                    </span>
                  }
                />
              </div>
            )}

            {/* 快速帮助 */}
            <Collapse style={{ marginTop: 12 }} size="small">
              <Panel header="快捷键" key="shortcuts">
                <div style={{ fontSize: 13 }}>
                  <Text>Ctrl+S — 保存</Text><br />
                  <Text>Ctrl+G — 生成（未实现）</Text><br />
                  <Text>Ctrl+P — 预览</Text>
                </div>
              </Panel>
            </Collapse>
          </Card>
        </Col>
      </Row>

      {/* 设置弹窗 */}
      <Modal
        title="创作设置"
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        onOk={() => setSettingsVisible(false)}
        width={600}
      >
        {generateSettingsForm}
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="章节预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{
          fontSize: 15,
          lineHeight: 1.8,
          maxHeight: '60vh',
          overflow: 'auto',
          padding: 16,
        }}>
          {renderPreview(content)}
        </div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Text type="secondary">总字数：{wordCount}字</Text>
          {!hasEndingHook && content.length > 100 && (
            <Tag color="red" style={{ marginLeft: 8 }}>章末缺Hook</Tag>
          )}
        </div>
      </Modal>

      {/* 选择章纲弹窗 */}
      <Modal
        title="选择章纲"
        open={outlineVisible}
        onCancel={() => setOutlineVisible(false)}
        footer={null}
        width={600}
      >
        {chapterOutlines.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {chapterOutlines.map(o => (
              <Card
                key={o.id}
                size="small"
                hoverable
                onClick={() => handleOutlineSelect(o.id)}
                style={{ cursor: 'pointer' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Text strong>第{o.chapterNo}章</Text>
                    <Text>{o.title}</Text>
                    <Tag color={o.endingHook ? 'blue' : 'red'}>
                      {o.endingHook ? '有章末Hook' : '缺章末Hook'}
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 13 }}>{o.summary?.slice(0, 60)}</Text>
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty
            description={
              <Space direction="vertical">
                <Text>暂无章纲</Text>
                <Button type="primary" onClick={() => navigate(`/projects/${projectId}/chapter-outlines`)}>
                  去创建章纲
                </Button>
              </Space>
            }
          />
        )}
      </Modal>
    </div>
  );
}

// 演示用模拟生成
function generateDemoContent(chapterNo: number, outline?: ChapterOutline | null): string {
  return `# 第${chapterNo}章 ${outline?.title || '命运的转折'}

${outline?.summary || '林风走在回家的路上，脑海中反复回想着今天发生的一切。'}

"这到底是怎么回事？"他低声自语。

刚才那一幕还在他眼前闪现——那个神秘的黑袍人，那道刺眼的光芒，还有那股莫名涌入体内的力量。

${outline?.conflict ? `\n${outline.conflict}的预感越来越强烈了。` : ''}

林风握紧了拳头，他能感觉到自己的命运正在发生改变。不，应该说，从戴上那枚戒指开始，一切就已经不一样了。

${outline?.coolPoints ? `\n"哼，想阻挡我的路？那就试试看吧！"` : ''}

夜风吹过，林风加快了脚步。身后，一个若隐若现的身影无声地跟随着。

他猛地回头，却什么都没有。

"是我多心了吗？"

就在这时，手机突然震动起来。是一条陌生号码发来的短信：

"${outline?.endingHook || '小心你身边的人。明天见。——一个知道真相的人'}"

林风盯着屏幕，瞳孔骤然收缩。

${outline?.characters ? `\n${outline.characters}：这一切才刚刚开始...` : ''}

【系统提示：命运轨迹已改变，新的挑战即将来临】

${outline?.scenes ? `\n—— ${outline?.scenes}——` : ''}

林风深吸一口气，他知道，从这一刻起，自己的人生将彻底不同。而危险，也在悄然逼近。

${outline?.foreshadows ? `\n【伏笔埋设：${outline.foreshadows}】` : ''}

他没想到的是，更大的阴谋还在后面等着他。`;
}
