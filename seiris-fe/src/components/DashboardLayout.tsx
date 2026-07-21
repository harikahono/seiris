import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamContext } from "@/contexts/TeamContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { usePusher } from "@/hooks/usePusher";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CreateTeamModal from "@/components/ui/CreateTeamModal";
import { useFocusTrap } from "@/hooks/useFocusTrap";

import Skeleton from "@/components/ui/Skeleton";
import { 
  LayoutDashboard, 
  LogOut, 
  ChevronDown, 
  ChevronLeft, 
  Menu, 
  
  Users, 
  ListChecks, 
  Settings, 
  PieChart, 
  TrendingUp, 
  ClipboardList, 
  Plus, 
  AlertTriangle, 
  Key,
} from "lucide-react";

interface FeatureItem {
  key: string;
  label: string;
  icon: typeof PieChart;
  path: string;
}

const features: FeatureItem[] = [
  { key: "members", label: "Anggota", icon: Users, path: "members" },
  { key: "contributions", label: "Kontribusi", icon: ListChecks, path: "contributions" },
  { key: "revenue", label: "Revenue", icon: TrendingUp, path: "revenue" },
  { key: "audit", label: "Audit Log", icon: ClipboardList, path: "audit" },
  { key: "settings", label: "Pengaturan", icon: Settings, path: "settings" },
];

const toastDedupe = (msg: string) => toast(msg, { id: msg });

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { currentTeamId, teams, isLoading: teamsLoading, setCurrentTeam, refreshTeams } = useTeamContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  // ── Sync currentTeamId dari URL ──
  const urlTeamId = location.pathname.match(/\/teams\/([^/]+)/)?.[1];

  useEffect(() => {
    if (urlTeamId && urlTeamId !== currentTeamId) {
      setCurrentTeam(urlTeamId);
    }
  }, [urlTeamId, currentTeamId, setCurrentTeam]);

  const { triggerRefresh } = useRealtime();

  // ── Online members count ──
  const [onlineCount, setOnlineCount] = useState(0);

  // ── Pusher: realtime equity update across ALL pages ──
  usePusher(currentTeamId ?? undefined, {
    onEquityUpdated: useCallback((data) => {
      triggerRefresh();
      if (data?.approved_by && data?.contribution_desc) {
        const owner = data.contribution_owner ? ` (${data.contribution_owner})` : '';
        toastDedupe(`"${data.contribution_desc}"${owner} disetujui oleh ${data.approved_by}`);
      }
    }, [triggerRefresh]),
    onContributionCreated: useCallback((data) => {
      toastDedupe(`${data.member_name} membuat kontribusi ${data.type}: ${data.description}`);
      triggerRefresh();
    }, [triggerRefresh]),
    onTeamUpdated: useCallback((data) => {
      triggerRefresh();
      refreshTeams();
      switch (data?.action) {
        case 'member.joined':
          toastDedupe(`${data.user_name} bergabung ke tim`);
          break;
        case 'member.exited':
          toastDedupe(`${data.user_name} keluar dari tim`);
          break;
        case 'vote.cast':
          toastDedupe(`${data.user_name} memberikan vote`);
          break;
        case 'team.updated':
          toastDedupe(`${data.user_name} mengubah pengaturan tim`);
          break;
        case 'team.frozen':
          toastDedupe(`${data.user_name} freeze equity tim`);
          break;
        case 'project.created':
          toastDedupe(`${data.user_name} membuat project "${data.project_name}"`);
          break;
        case 'project.frozen':
          toastDedupe(`${data.user_name} freeze project "${data.project_name}"`);
          break;
        case 'member.fmr_updated':
          toastDedupe(`FMR ${data.user_name} diperbarui`);
          break;
        case 'fmr.proposed':
          toastDedupe(`${data.user_name} mengusulkan perubahan FMR`);
          break;
        case 'fmr.approved':
          toastDedupe(`Usulan FMR ${data.member_name} disetujui oleh ${data.approver_name}`);
          break;
        case 'fmr.rejected':
          toastDedupe(`Usulan FMR ${data.member_name} ditolak oleh ${data.approver_name}`);
          break;
        case 'revenue.created':
          toastDedupe(`${data.user_name} mencatat revenue baru`);
          break;
        case 'profit.requested':
          toastDedupe(`${data.user_name} meminta distribusi profit`);
          break;
        case 'profit.distributed':
          toastDedupe(`${data.user_name} mendistribusikan profit`);
          break;
        case 'contribution.rejected':
          toastDedupe(`Kontribusi "${data.contribution_desc}" (${data.contribution_owner_name}) ditolak oleh ${data.user_name}`);
          break;
        case 'member.added_to_project':
          toastDedupe(`${data.user_name} menambahkan ${data.member_name} ke project`);
          break;
        case 'member.removed_from_project':
          toastDedupe(`${data.user_name} mengeluarkan ${data.member_name} dari project`);
          break;
      }
    }, [triggerRefresh, refreshTeams]),
    onMembersChange: useCallback((members) => {
      setOnlineCount(members.length);
    }, []),
  });

  // ── Only show team settings for owner ──
  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const visibleFeatures = features.filter(
    (f) => f.key !== "settings" || currentTeam?.is_owner
  );

  // ── Active feature detection ──
  const activeFeature = visibleFeatures.find((f) => {
    const match = location.pathname.match(/\/teams\/([^/]+)\/(.+)/);
    return match && match[2]?.startsWith(f.path);
  });

  // ── Feature click: langsung navigasi pake currentTeamId ──
  const handleFeatureClick = (feature: FeatureItem) => {
    if (currentTeamId) {
      navigate(`/teams/${currentTeamId}/${feature.path}`);
    }
  };

  // ── Handle create team ──
  const handleCreateTeam = () => {
    setShowCreateTeamModal(true);
  };

  // ── Logout ──
  const handleLogout = () => setShowLogoutModal(true);
  const logoutTrapRef = useFocusTrap(showLogoutModal);

  const confirmLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-surface">
      {/* Noise overlay — fixed, pointer-events-none */}
      <div
        className="fixed inset-0 z-[60] pointer-events-none"
        style={{
          opacity: 0.015,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
        aria-hidden
      />
      <aside
        className={cn(
          "flex flex-col border-r border-gray-800 bg-[#0d0d0d] transition-[width] duration-200 var(--ease-out)",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* ── Header ── */}
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
          {!collapsed && (
            <span className="text-lg font-bold text-accent">SEIRIS</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white active:scale-[0.97]"
            aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <Menu className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {/* ── Dashboard Link ── */}
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
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

          {/* ── Tim Section ── */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setTeamsOpen(!teamsOpen)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronDown
                className={cn("size-3 transition-transform duration-200", !teamsOpen && "-rotate-90")}
              />
              Tim
              <span className="ml-auto flex items-center gap-2">
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400">
                    <span className="size-1.5 rounded-full bg-green-400" />
                    {onlineCount} online
                  </span>
                )}
                <span className="text-[10px] text-gray-600">{teams.length}</span>
              </span>
            </button>
          )}

          {/* ── Team List (Discord-style) ── */}
          <div
            className={cn(
              "transition-[grid-template-rows,opacity] duration-300 var(--ease-out)",
              collapsed
                ? ""
                : [
                    "grid",
                    teamsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  ]
            )}
          >
              <div className="overflow-hidden">
                <div className={cn("space-y-1", collapsed ? "" : "px-2 pt-1")}>
                  {teamsLoading ? (
                    <div className="space-y-1 pl-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5">
                          <Skeleton className="size-6 rounded-full" />
                          <Skeleton className="h-4 flex-1" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    teams.map((team) => {
                  const isActive = currentTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        setCurrentTeam(team.id);
                        navigate('/dashboard');
                      }}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {/* Avatar lingkaran */}
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                          isActive
                            ? "bg-accent text-black"
                            : "bg-gray-800 text-gray-500 group-hover:bg-gray-700"
                        )}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </span>

                      {!collapsed && (
                        <div className="flex-1 text-left">
                          <p className="truncate font-medium leading-tight">
                            {team.name}
                            {team.status === "exited" && (
                              <span className="ml-1.5 text-[10px] text-gray-500">(Keluar)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {team.role === "owner" ? "Pemilik" : "Anggota"}
                            {" · "}
                            {team.total_members} anggota
                          </p>
                        </div>
                      )}

                      {/* Active indicator — small dot when collapsed */}
                      {collapsed && isActive && (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2">
                          <span className="block size-1.5 rounded-full bg-accent" />
                        </span>
                      )}
                    </button>
                  );
                }))}

                {/* ── Gabung / Buat Tim ── */}
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-700">
                    <Plus className="size-4" />
                  </span>
                  {!collapsed && <span>Gabung / Buat Tim</span>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Fitur Section ── */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setFeaturesOpen(!featuresOpen)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronDown
                className={cn("size-3 transition-transform duration-200", !featuresOpen && "-rotate-90")}
              />
              Fitur
              <span className="ml-auto text-[10px] text-gray-600">{visibleFeatures.length}</span>
            </button>
          )}

          {/* ── Feature Buttons ── */}
          <div
            className={cn(
              "transition-[grid-template-rows,opacity] duration-300 var(--ease-out)",
              collapsed
                ? ""
                : [
                    "grid",
                    featuresOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  ]
            )}
          >
            <div className="overflow-hidden">
              <div className={cn("space-y-1", collapsed ? "" : "px-2 pt-1")}>
                {visibleFeatures.map((feat) => {
                  const Icon = feat.icon;
                  const isActive = activeFeature?.key === feat.key;
                  return (
                    <button
                      key={feat.key}
                      type="button"
                      onClick={() => handleFeatureClick(feat)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
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
              </div>
            </div>
          </div>
        </nav>

        {/* ── User Footer ── */}
        <div className="border-t border-gray-800 px-2 py-3">
          {!collapsed && (
            <div className="mb-2 truncate px-3 text-xs text-gray-500">
              <p className="font-medium text-gray-300">{user?.name}</p>
              <p className="truncate">{user?.email}</p>
            </div>
          )}

          {/* User Settings Link */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
                collapsed && "justify-center px-2"
              )
            }
          >
            <Key className="size-4 shrink-0" />
            {!collapsed && <span>Pengaturan Akun</span>}
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400 active:scale-[0.97]",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto" style={{ scrollbarGutter: "stable" }}>
        <Outlet />
      </main>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowLogoutModal(false)} />
          <div ref={logoutTrapRef} className="relative w-80 rounded-xl border border-gray-700 bg-card p-6 shadow-2xl">
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
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 active:scale-[0.97]"
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Team Modal ── */}
      <CreateTeamModal
        open={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onCreated={(teamId) => {
          if (teamId) {
            setCurrentTeam(teamId);
            navigate('/dashboard');
          }
          refreshTeams();
        }}
      />
    </div>
  );
}
