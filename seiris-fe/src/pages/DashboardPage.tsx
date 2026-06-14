import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/api/axios";
import type { DashboardData } from "@/types";
import CreateTeamModal from "@/components/ui/CreateTeamModal";
import JoinTeamCard from "@/components/ui/JoinTeamCard";
import { Plus, Users } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    api
      .get<{ message: string; data: DashboardData }>("/my-dashboard")
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : data ? (
        <>
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Ringkasan</h2>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-3">
                <p className="text-2xl font-bold text-accent">{data.summary.total_teams}</p>
                <p className="text-xs text-gray-500">Total Tim</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-3">
                <p className="text-2xl font-bold text-yellow-400">
                  {data.summary.total_pending_to_review}
                </p>
                <p className="text-xs text-gray-500">Pending Review</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tim Saya</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
              >
                <Plus className="size-4" />
                Buat Tim
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="block rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-accent"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{team.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                        team.role === "owner"
                          ? "bg-accent/20 text-accent"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {team.role}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>
                      Equity:{" "}
                      <span className="text-gray-300">{team.my_equity_percentage}%</span>
                    </p>
                    <p>
                      Slices: <span className="text-gray-300">{team.my_slices}</span>
                    </p>
                    <p>
                      Anggota: <span className="text-gray-300">{team.total_members}</span>
                    </p>
                    {team.pending_approvals_count > 0 && (
                      <p className="text-yellow-400">
                        {team.pending_approvals_count} pending approval
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              {data.teams.length === 0 && (
                <p className="col-span-full text-gray-600">
                  Belum bergabung ke tim mana pun. Buat tim baru atau gunakan kode undangan.
                </p>
              )}
            </div>
          </section>

          {data.teams.length === 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Users className="size-4 text-accent" />
                <h2 className="text-sm font-semibold text-gray-300">Gabung ke Tim</h2>
              </div>
              <JoinTeamCard onJoined={fetchDashboard} />
            </section>
          )}
        </>
      ) : (
        <p className="text-red-400">Gagal memuat data dashboard.</p>
      )}

      <CreateTeamModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchDashboard}
      />
    </div>
  );
}
