
function App() {
  return (
    <div className="text-center mt-10 text-2xl font-bold">
      GameHub Pro - Tableau de bord 🎮
    </div>
  )
}

export default App
import Timetracking from './shared/components/Timetracking'

function App() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mt-6">Tableau de bord</h1>
      <Timetracking />
    </div>
  )
}
import TimetrackingAdmin from './shared/components/TimetrackingAdmin'

function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-center mt-4">Admin Pointage</h1>
      <TimetrackingAdmin />
    </div>
  )
}
