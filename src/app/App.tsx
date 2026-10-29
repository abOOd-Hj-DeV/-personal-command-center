import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Day from '@/pages/Day'
import Progress from '@/pages/Progress'
import ActivityPage from '@/pages/Activity'
import Projects from '@/pages/Projects'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/day/:date?" element={<Day />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
