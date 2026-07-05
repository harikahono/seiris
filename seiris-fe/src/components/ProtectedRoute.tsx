import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TeamProvider } from "@/contexts/TeamContext";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <TeamProvider>
      <Outlet />
    </TeamProvider>
  );
}
