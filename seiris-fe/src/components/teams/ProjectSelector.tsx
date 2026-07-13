import { useProjectContext } from "@/contexts/ProjectContext";
import { useTeamContext } from "@/contexts/TeamContext";
import { Plus } from "lucide-react";
import { useState } from "react";
import api from "@/api/axios";
import { toast } from "sonner";

export default function ProjectSelector() {
  const { projects, currentProjectId, setCurrentProject, refreshProjects } = useProjectContext();
  const { currentTeamId } = useTeamContext();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const createProject = () => {
    if (!name.trim()) {
      toast.error("Nama project wajib diisi.");
      return;
    }
    if (!currentTeamId) {
      toast.error("Tim tidak ditemukan.");
      return;
    }
    api
      .post(`/teams/${currentTeamId}/projects`, { name: name.trim(), description: desc.trim() })
      .then(() => {
        toast.success(`Project "${name.trim()}" berhasil dibuat.`);
        setName("");
        setDesc("");
        setCreating(false);
        refreshProjects();
      })
      .catch(() => toast.error("Gagal membuat project."));
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-gray-500">Scope:</span>
      <button
        type="button"
        onClick={() => setCurrentProject(null)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          currentProjectId === null
            ? "bg-[#e07820] text-white"
            : "bg-gray-800/60 text-gray-300 hover:bg-gray-800"
        }`}
      >
        Tim (Induk)
      </button>
      {projects.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setCurrentProject(p.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            currentProjectId === p.id
              ? "bg-[#e07820] text-white"
              : "bg-gray-800/60 text-gray-300 hover:bg-gray-800"
          }`}
        >
          {p.name}
          {p.is_frozen && <span className="ml-1 text-[10px] opacity-80">🔒</span>}
        </button>
      ))}

      {creating ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama project"
            className="w-36 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white outline-none focus:border-[#e07820]"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Deskripsi (opsional)"
            className="w-44 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white outline-none focus:border-[#e07820]"
          />
          <button onClick={createProject} className="rounded-md bg-green-600 px-2 py-1.5 text-sm text-white hover:bg-green-500">
            Simpan
          </button>
          <button onClick={() => setCreating(false)} className="rounded-md bg-gray-700 px-2 py-1.5 text-sm text-white hover:bg-gray-600">
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md border border-dashed border-gray-700 px-2 py-1.5 text-sm text-gray-400 hover:border-[#e07820] hover:text-[#e07820]"
        >
          <Plus className="size-3.5" /> Project
        </button>
      )}
    </div>
  );
}
