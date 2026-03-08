import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useIsMobile } from './hooks/useIsMobile'
import { useMemoryFolder } from './hooks/useMemoryFolder'
import { useDiyaEntry } from './hooks/useDiyaEntry'
import { MobileWall } from './components/MobileWall'
import { Onboarding } from './components/Onboarding'
import { DiyaEntry } from './components/DiyaEntry'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { HabitsPage } from './pages/HabitsPage'
import { JournalPage } from './pages/JournalPage'
import { PlanPage } from './pages/PlanPage'
import { SundayPage } from './pages/SundayPage'
import { GrowthPage } from './pages/GrowthPage'

function App() {
  const isMobile = useIsMobile()
  const { folderHandle, setFolderHandle, loading } = useMemoryFolder()
  const hasFolder = !!folderHandle
  const { showDiya, finishDiya, checked } = useDiyaEntry(hasFolder && !loading)

  if (isMobile) {
    return <MobileWall />
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-ash)',
        fontFamily: 'var(--font-body)',
      }}>
        …
      </div>
    )
  }

  if (!hasFolder) {
    return (
      <Onboarding
        onComplete={() => {}}
        setFolderHandle={setFolderHandle}
      />
    )
  }

  if (showDiya && checked) {
    return <DiyaEntry onFinish={finishDiya} />
  }

  if (!checked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-void)',
      }}
      />
    )
  }

  return (
    <BrowserRouter basename="/kaizen">
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="sunday" element={<SundayPage />} />
          <Route path="growth" element={<GrowthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
