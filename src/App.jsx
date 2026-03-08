import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useIsMobile } from './hooks/useIsMobile'
import { useMemoryFolder } from './hooks/useMemoryFolder'
import { useDiyaEntry } from './hooks/useDiyaEntry'
import { MemoryProvider } from './context/MemoryContext'
import { MobileWall } from './components/MobileWall'
import { Onboarding } from './components/Onboarding'
import { DiyaEntry } from './components/DiyaEntry'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { HabitsPage } from './pages/HabitsPage'
import { PlanPage } from './pages/PlanPage'
import { SundayPage } from './pages/SundayPage'
import { GrowthPage } from './pages/GrowthPage'
import { SettingsPage } from './pages/SettingsPage'
import { BrowserWall } from './components/BrowserWall'

const MOBILE_OVERRIDE_KEY = 'kaizen_allow_mobile'

function App() {
  const [mobileOverride, setMobileOverride] = useState(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(MOBILE_OVERRIDE_KEY) : null
  )
  const isMobile = useIsMobile()
  const { folderHandle, setFolderHandle, loading } = useMemoryFolder()
  const hasFolder = !!folderHandle
  const { showDiya, finishDiya, checked } = useDiyaEntry(hasFolder && !loading)

  if (typeof window !== 'undefined' && !('showDirectoryPicker' in window)) {
    return <BrowserWall />
  }

  const handleMobileContinue = () => {
    try {
      sessionStorage.setItem(MOBILE_OVERRIDE_KEY, '1')
    } catch (_) {}
    setMobileOverride('1')
  }

  if (isMobile && !mobileOverride) {
    return <MobileWall onContinue={handleMobileContinue} />
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
    <HashRouter>
      <MemoryProvider folderHandle={folderHandle} setFolderHandle={setFolderHandle}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<HomePage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="sunday" element={<SundayPage />} />
          <Route path="growth" element={<GrowthPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryProvider>
    </HashRouter>
  )
}

export default App
