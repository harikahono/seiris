import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPage from "@/pages/DashboardPage";
import TeamDetailPage from "@/pages/teams/TeamDetailPage";
import TeamMembersTab from "@/components/teams/TeamMembersTab";
import RevenueTab from "@/components/teams/RevenueTab";
import AuditLogTab from "@/components/teams/AuditLogTab";
import ContributionsTab from "@/components/teams/ContributionsTab";
import TeamSettingsTab from "@/components/teams/TeamSettingsTab";
import ContributionDetailPage from "@/pages/teams/ContributionDetailPage";
import LandingPage from "@/pages/LandingPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/teams/:teamId" element={<TeamDetailPage />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="equity" element={<Navigate to="../contributions" replace />} />
                <Route path="members" element={<TeamMembersTab />} />
                <Route path="contributions" element={<ContributionsTab />} />
                <Route path="revenue" element={<RevenueTab />} />
                <Route path="audit" element={<AuditLogTab />} />
                <Route path="settings" element={<TeamSettingsTab />} />
              </Route>
              <Route path="/teams/:teamId/contributions/:contributionId" element={<ContributionDetailPage />} />
            </Route>
          </Route>
        </Routes>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              color: "#e5e7eb",
              border: "1px solid #333",
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
