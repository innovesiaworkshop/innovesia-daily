import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { TugasSaya } from '@/pages/TugasSaya'
import { TambahTugas } from '@/pages/TambahTugas'
import { PerluTindakan } from '@/pages/PerluTindakan'
import { Dashboard } from '@/pages/Dashboard'

// Routing shell only — auth gating and feature screens come later.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TugasSaya />} />
          <Route path="tambah" element={<TambahTugas />} />
          <Route path="perlu-tindakan" element={<PerluTindakan />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
