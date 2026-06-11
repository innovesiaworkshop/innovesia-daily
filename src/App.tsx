import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { useViewportPin } from '@/hooks/useViewportPin'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'
import { TugasSaya } from '@/pages/TugasSaya'
import { DetailTugas } from '@/pages/DetailTugas'
import { DetailProyek } from '@/pages/DetailProyek'
import { ProyekList } from '@/pages/ProyekList'
import { TambahTugas } from '@/pages/TambahTugas'
import { Dashboard } from '@/pages/Dashboard'
import { ReloadPrompt } from '@/components/ReloadPrompt'

// Decides what to render once auth has resolved. Employees and employers share the
// same home for now.
function Gate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-cloud">
        <span className="text-sm text-slate-500">Loading…</span>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TugasSaya />} />
          <Route path="tugas/:id" element={<DetailTugas />} />
          <Route path="proyek" element={<ProyekList />} />
          <Route path="proyek/:id" element={<DetailProyek />} />
          <Route path="tambah" element={<TambahTugas />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  // Keep the shell pinned to the visual viewport so the keyboard doesn't shove the page up.
  useViewportPin()
  return (
    <AuthProvider>
      <Gate />
      <ReloadPrompt />
    </AuthProvider>
  )
}
