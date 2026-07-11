import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
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
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<RealtimeProvider><DashboardLayout /></RealtimeProvider>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/teams/:teamId" element={<TeamDetailPage />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
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
        </TeamProvider>
      </AuthProvider>
      <Toaster
        position="top-center"
        gap={12}
        visibleToasts={3}
        toastOptions={{
          style: {
            background: "#151515",
            color: "#e5e7eb",
            border: "1px solid #2a2a2a",
            borderRadius: "10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            padding: "12px 16px",
            fontSize: "14px",
            fontFamily: "var(--font-sans)",
          },
          classNames: {
            success: "border-l-2 border-l-green-500/60",
            error: "border-l-2 border-l-red-500/60",
            info: "border-l-2 border-l-[#e07820]",
            warning: "border-l-2 border-l-yellow-500/60",
          },
        }}
        icons={{
          success: <CheckCircle2 className="size-4 text-green-400 shrink-0" />,
          error: <XCircle className="size-4 text-red-400 shrink-0" />,
          info: <Info className="size-4 text-[#e07820] shrink-0" />,
          warning: <AlertTriangle className="size-4 text-yellow-400 shrink-0" />,
        }}
      />
    </BrowserRouter>
  );
}