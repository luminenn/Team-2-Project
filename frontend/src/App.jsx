import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './views/Home'
import Results from './views/Results'
import History from './views/History'

export default function App() {
  return (
    <div className="app">
      <nav className="top-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-brand">CVC Auditor</div>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Home
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            History
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results/:runId" element={<Results />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  )
}
