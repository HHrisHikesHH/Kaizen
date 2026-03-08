import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useWeekPlan } from '../hooks/useWeekPlan'
import { getWeekNumber, getDayOfWeek } from '../utils/dateHelpers'
import { CustomCursor } from './CustomCursor'
import './AppShell.css'

const ROUTE_GLOW = {
  '/': 0.08,
  '/habits': 0.05,
  '/plan': 0.03,
  '/sunday': 0.05,
  '/growth': 0.03,
  '/settings': 0.02,
}

const navItems = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/habits', label: 'Habits', icon: 'habits' },
  { path: '/plan', label: 'Plan', icon: 'plan', showDot: true },
  { path: '/sunday', label: 'Sunday', icon: 'sunday' },
  { path: '/growth', label: 'Growth', icon: 'growth' },
]

function NavIcon({ icon }) {
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    habits: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    journal: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    plan: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    sunday: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    growth: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  }
  return <span className="app-shell__icon">{icons[icon] ?? null}</span>
}

export function AppShell() {
  const location = useLocation()
  const now = new Date()
  const { plan: weekPlan } = useWeekPlan(now.getFullYear(), getWeekNumber(now))
  const todayDayName = getDayOfWeek(now)
  const todayIntentions = (weekPlan?.intentions?.[todayDayName] ?? []).filter(Boolean)
  const hasIncompleteTodayIntentions = todayIntentions.some((i) => !i.complete)

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '') || '/'
    const opacity = ROUTE_GLOW[path] ?? 0.05
    document.documentElement.style.setProperty('--glow-opacity', String(opacity))
  }, [location.pathname])

  return (
    <div className="app-shell noise-overlay">
      <div className="app-shell__glow" aria-hidden />
      <div className="app-shell__texture texture-overlay" aria-hidden />
      <CustomCursor />
      <aside className="app-shell__sidebar">
        <div className="app-shell__nav-main">
          {navItems.map(({ path, label, icon, showDot }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `app-shell__nav-link ${isActive ? 'app-shell__nav-link--active' : ''}`
              }
              title={label}
            >
              <NavIcon icon={icon} />
              {showDot && hasIncompleteTodayIntentions && (
                <span className="app-shell__nav-dot" aria-hidden />
              )}
            </NavLink>
          ))}
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `app-shell__nav-link app-shell__nav-link--settings ${isActive ? 'app-shell__nav-link--active' : ''}`
          }
          title="Memory & Practice"
        >
          <NavIcon icon="settings" />
        </NavLink>
      </aside>
      <main className="app-shell__main">
        <div key={location.key} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
