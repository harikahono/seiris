import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import api from "@/api/axios";
import type { Team } from "@/types";
import {
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Menu,
  Info,
  Users,
  ListChecks,
  Settings,
  PieChart,
  TrendingUp,
  ClipboardList,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface FeatureItem {
  key: string;
  label: string;
  icon: typeof Info;
  path: string;
}

const features: FeatureItem[] = [
  { key: "overview", label: "Overview", icon: Info, path: "overview" },
  { key: "equity", label: "Equity", icon: PieChart, path: "equity" },
  { key: "members", label: "Anggota", icon: Users, path: "members" },
  { key: "contributions", label: "Kontribusi", icon: ListChecks, path: "contributions" },
  { key: "revenue", label: "Revenue", icon: TrendingUp, path: "revenue" },
  { key: "audit", label: "Audit Log", icon: ClipboardList, path: "audit" },
  { key: "settings", label: "Pengaturan", icon: Settings, path: "settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [pendingFeature, setPendingFeature] = useState<FeatureItem | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    setTeamsLoading(true);
    api
      .get<{ data: Team[] }>("/teams")
      .then((res) => setTeams(res.data.data))
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, []);

  useEffect(() => {
    setPendingFeature(null);
  }, [location.pathname]);

  const activeFeature = features.find((f) => {
    const match = location.pathname.match(/\/teams\/([^/]+)\/(.+)/);
    return match && match[2] === f.path;
  });

  const handleFeatureClick = (feature: FeatureItem) => {
    if (!teamsLoading && teams.length === 1) {
      navigate(`/teams/${teams[0].id}/${feature.path}`);
      return;
    }
    setPendingFeature(feature);
  };

  const handleTeamSelect = (teamId: string) => {
    if (pendingFeature) {
      navigate(`/teams/${teamId}/${pendingFeature.path}`);
      setPendingFeature(null);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <aside
        className={cn(
          "flex flex-col border-r border-gray-800 bg-[#0d0d0d] transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
          {!collapsed && (
            <span className="text-lg font-bold text-accent">SEIRIS</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white"
          >
            {collapsed ? <Menu className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
                collapsed && "justify-center px-2"
              )
            }
          >
            <LayoutDashboard className="size-4 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          {!collapsed && (
            <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Fitur
            </div>
          )}

          {features.map((feat) => {
            const Icon = feat.icon;
            const isActive = activeFeature?.key === feat.key;
            return (
              <button
                key={feat.key}
                type="button"
                onClick={() => handleFeatureClick(feat)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{feat.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 px-2 py-3">
          {!collapsed && (
            <div className="mb-2 truncate px-3 text-xs text-gray-500">
              <p className="font-medium text-gray-300">{user?.name}</p>
              <p className="truncate">{user?.email}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-800 hover:text-red-400",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {pendingFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setPendingFeature(null)}
          />
          <div className="relative w-80 rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-300">
                Pilih Tim — {pendingFeature.label}
              </p>
              <button
                type="button"
                onClick={() => setPendingFeature(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            {teamsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-gray-500" />
              </div>
            ) : teams.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Kamu belum bergabung tim manapun.
              </p>
            ) : (
              <div className="space-y-1">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleTeamSelect(team.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-300 transition hover:bg-gray-800"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                      {team.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{team.name}</p>
                      <p className="text-xs text-gray-500">{team.members_count} anggota</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowLogoutModal(false)} />
          <div className="relative w-80 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="size-6 text-red-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Yakin mau logout?</h3>
              <p className="mt-1 text-sm text-gray-500">
                Kamu akan kembali ke halaman utama.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
