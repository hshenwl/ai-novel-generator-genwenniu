import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from './stores/authStore'
import { eventBus } from './services/api'
import Layout from './components/Layout'

// 路由懒加载 — 只有访问对应路由时才加载页面 JS
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const WorldSetting = lazy(() => import('./pages/WorldSetting'))
const Outline = lazy(() => import('./pages/Outline'))
const Volumes = lazy(() => import('./pages/Volumes'))
const Chapters = lazy(() => import('./pages/Chapters'))
const ChapterOutlines = lazy(() => import('./pages/ChapterOutlines'))
const ChapterEditor = lazy(() => import('./pages/ChapterEditor'))
const Characters = lazy(() => import('./pages/Characters'))
const Organizations = lazy(() => import('./pages/Organizations'))
const Foreshadows = lazy(() => import('./pages/Foreshadows'))
const Hooks = lazy(() => import('./pages/Hooks'))
const Workflow = lazy(() => import('./pages/Workflow'))
const ModelConfig = lazy(() => import('./pages/ModelConfig'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Knowledge = lazy(() => import('./pages/Knowledge'))
const Settings = lazy(() => import('./pages/Settings'))
const PromptTemplates = lazy(() => import('./pages/PromptTemplates'))
const WritingStyles = lazy(() => import('./pages/WritingStyles'))
const Careers = lazy(() => import('./pages/Careers'))
const Relationships = lazy(() => import('./pages/Relationships'))
const Inspirations = lazy(() => import('./pages/Inspirations'))
const QualityCenter = lazy(() => import('./pages/QualityCenter'))
const DeFlavor = lazy(() => import('./pages/DeFlavor'))
const ImportExport = lazy(() => import('./pages/ImportExport'))
const HotRankAnalysis = lazy(() => import('./pages/HotRankAnalysis'))
const AgentRules = lazy(() => import('./pages/AgentRules'))
const LogCenter = lazy(() => import('./pages/LogCenter'))
const TuningDashboard = lazy(() => import('./pages/TuningDashboard'))

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
    <Spin size="large" tip="加载中..." />
  </div>
)

function App() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const off = eventBus.on('auth:unauthorized', () => {
      navigate('/login', { replace: true })
    })
    return off
  }, [navigate])

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/world-setting" element={<WorldSetting />} />
          <Route path="/projects/:id/outline" element={<Outline />} />
          <Route path="/projects/:id/volumes" element={<Volumes />} />
          <Route path="/projects/:id/chapters" element={<Chapters />} />
          <Route path="/projects/:id/chapters/:chapterId/edit" element={<ChapterEditor />} />
          <Route path="/projects/:id/characters" element={<Characters />} />
          <Route path="/projects/:id/organizations" element={<Organizations />} />
          <Route path="/projects/:id/foreshadows" element={<Foreshadows />} />
          <Route path="/projects/:id/chapter-outlines" element={<ChapterOutlines />} />
          <Route path="/projects/:id/hooks" element={<Hooks />} />
          <Route path="/projects/:id/workflow" element={<Workflow />} />
          <Route path="/model-configs" element={<ModelConfig />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/prompt-templates" element={<PromptTemplates />} />
          <Route path="/projects/:id/writing-styles" element={<WritingStyles />} />
          <Route path="/projects/:id/careers" element={<Careers />} />
          <Route path="/projects/:id/relationships" element={<Relationships />} />
          <Route path="/inspirations" element={<Inspirations />} />
          <Route path="/projects/:id/quality" element={<QualityCenter />} />
          <Route path="/projects/:id/de-flavor" element={<DeFlavor />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/hot-rank-analysis" element={<HotRankAnalysis />} />
          <Route path="/agent-rules" element={<AgentRules />} />
          <Route path="/log-center" element={<LogCenter />} />
          <Route path="/tuning" element={<TuningDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
