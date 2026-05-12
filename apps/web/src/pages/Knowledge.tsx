import { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Input, List, Tag, Typography, Spin, message, Space, Empty, Table, Button, Drawer, Statistic } from 'antd';
import { FolderOutlined, FileOutlined, ReloadOutlined, BarChartOutlined, FileSearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const { Search } = Input; const { Text, Title } = Typography;

interface Category { key: string; name: string; description: string; files: number; }
interface FileResult { filename: string; path: string; category: string; snippet?: string; }
interface KnowledgeFile { id: string; path: string; filename: string; category: string; wordCount: number; indexed: boolean; createdAt: string; content?: string; }
interface KnowStats { totalFiles: number; totalWords: number; categories: any[]; indexedFiles: number; }

export default function Knowledge() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<string>('');

  // 新增状态
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [stats, setStats] = useState<KnowStats | null>(null);
  const [detailFile, setDetailFile] = useState<KnowledgeFile | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'list'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  useEffect(() => {
    api.get('/knowledge/categories').then((r: any) => setCategories(Array.isArray(r) ? r : r?.items || []))
      .finally(() => setLoading(false));
  }, []);

  // 加载文件列表（支持按分类筛选）
  const fetchFiles = async (category?: string) => {
    setFilesLoading(true);
    try {
      const url = category ? `/knowledge/files?category=${category}` : '/knowledge/files';
      const r = await api.get(url);
      setFiles(Array.isArray(r) ? r : []);
    } catch { /* silent */ }
    finally { setFilesLoading(false); }
  };

  // 按分类浏览
  const handleCategoryClick = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    setActiveTab('list');
    fetchFiles(categoryKey);
  };

  // 加载统计数据
  const fetchStats = async () => {
    try {
      const r: any = await api.get('/knowledge/stats');
      if (r) setStats(r as KnowStats);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, []);

  const doSearch = async (value: string) => {
    if (!value) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api.post('/knowledge/search', { query: value, mode: 'fts' });
      setResults((r as any)?.results || []);
    } catch { message.error('搜索失败'); } finally { setSearching(false); }
  };

  const handleSearch = (value: string) => {
    searchInputRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleReindex = async () => {
    setIndexing(true);
    try {
      await api.post('/knowledge/index');
      message.success('索引已重建');
      fetchFiles();
      fetchStats();
    } catch { message.error('重建索引失败'); }
    finally { setIndexing(false); }
  };

  const handleViewFile = async (file: KnowledgeFile) => {
    setDetailFile(file);
    if (!file.content) {
      try {
        const r: any = await api.get(`/knowledge/files/${file.id}`);
        setDetailFile({ ...file, content: r?.content || '' });
      } catch { /* show without content */ }
    }
    setDetailVisible(true);
  };

  // 清理
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const fileColumns = [
    { title: '文件名', dataIndex: 'filename', key: 'filename', render: (v: string, r: KnowledgeFile) => <a onClick={() => handleViewFile(r)}>{v}</a> },
    { title: '分类', dataIndex: 'category', key: 'category', render: (v: string) => <Tag>{v}</Tag> },
    { title: '字数', dataIndex: 'wordCount', key: 'wordCount', render: (v: number) => v?.toLocaleString() || '-' },
    { title: '索引状态', dataIndex: 'indexed', key: 'indexed', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '已索引' : '未索引'}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <PageHeader title="知识库" subtitle="写作教程、技法、参考资料" />
        <Space>
          <Button icon={<ReloadOutlined />} loading={indexing} onClick={handleReindex}>重建索引</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="总文件数" value={stats.totalFiles} prefix={<FileOutlined />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="总字数" value={stats.totalWords?.toLocaleString() || 0} prefix={<FileSearchOutlined />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="分类数" value={stats.categories?.length || 0} prefix={<FolderOutlined />} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="已索引" value={stats.indexedFiles} prefix={<BarChartOutlined />} suffix={`/ ${stats.totalFiles}`} /></Card></Col>
        </Row>
      )}

      <Search placeholder="搜索知识库..." onSearch={handleSearch} enterButton loading={searching} style={{ marginBottom: 16 }} />

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="分类浏览" loading={loading}>
            {categories.length > 0 ? (
              <List dataSource={categories} renderItem={(c: Category) => {
                const count = stats?.categories?.find((sc: any) => sc.category === c.key)?.count || c.files || 0;
                return (
                  <List.Item
                    style={{ cursor: 'pointer', background: selectedCategory === c.key ? '#e6f7ff' : undefined }}
                    onClick={() => handleCategoryClick(c.key)}
                  >
                    <List.Item.Meta
                      avatar={<FolderOutlined style={{ color: selectedCategory === c.key ? '#1890ff' : undefined }} />}
                      title={<Space>{c.name}{selectedCategory === c.key && <Tag color="blue">当前</Tag>}</Space>}
                      description={<Text type="secondary">{count} 个文件 · {c.description}</Text>}
                    />
                  </List.Item>
                );
              }} />
            ) : !loading ? (
              <Empty description="暂无知识库分类" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
            {selectedCategory && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Button size="small" onClick={() => { setSelectedCategory(undefined); fetchFiles(); }}>显示全部</Button>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="知识库文件"
            tabList={[
              { key: 'browse', tab: '搜索结果' },
              { key: 'list', tab: '文件列表' },
            ]}
            activeTabKey={activeTab}
            onTabChange={(k) => setActiveTab(k as any)}
          >
            {activeTab === 'browse' ? (
              searching ? <Spin /> : results.length > 0 ? (
                <List dataSource={results} renderItem={(f: FileResult) => (
                  <List.Item><List.Item.Meta avatar={<FileOutlined />} title={<Space>{f.filename}<Tag>{f.category}</Tag></Space>} description={f.path} /></List.Item>
                )} />
              ) : <Text type="secondary">输入关键词搜索知识库</Text>
            ) : (
              <Table
                columns={fileColumns}
                dataSource={files}
                rowKey="id"
                loading={filesLoading}
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 文件详情抽屉 */}
      <Drawer
        title={detailFile?.filename || '文件详情'}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {detailFile && (
          <div>
            <p><Text strong>路径：</Text>{detailFile.path}</p>
            <p><Text strong>分类：</Text><Tag>{detailFile.category}</Tag></p>
            <p><Text strong>字数：</Text>{detailFile.wordCount?.toLocaleString()}</p>
            <p><Text strong>索引状态：</Text><Tag color={detailFile.indexed ? 'green' : 'default'}>{detailFile.indexed ? '已索引' : '未索引'}</Tag></p>
            <p><Text strong>创建时间：</Text>{detailFile.createdAt ? new Date(detailFile.createdAt).toLocaleString('zh-CN') : '-'}</p>
            {detailFile.content && (
              <div style={{ marginTop: 16 }}>
                <Text strong>文件内容：</Text>
                <div style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  maxHeight: 400,
                  overflow: 'auto',
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}>
                  {detailFile.content}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
