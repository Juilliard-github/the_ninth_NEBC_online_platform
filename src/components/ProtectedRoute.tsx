import { useAuthRedirect } from '@/hooks/useAdminAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loading = useAuthRedirect('admin') // 使用 admin 作為 requiredRole

  if (loading) return <p className="p-6">🔐 權限驗證中...</p>
  return <>{children}</>
}