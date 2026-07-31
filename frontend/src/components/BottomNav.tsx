import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', end: true, icon: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /> },
  { to: '/transactions', label: 'Transactions', end: false, icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { to: '/commitments', label: 'Commitments', end: false, icon: <path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /> },
  { to: '/categories', label: 'Categories', end: false, icon: <path d="M4 4h7l9 9-7 7-9-9V4z M8 8h.01" /> },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {tab.icon}
          </svg>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
