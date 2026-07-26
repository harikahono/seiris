import { useProjectContext } from "@/contexts/ProjectContext";
import { useTeamContext } from "@/contexts/TeamContext";
import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import api from "@/api/axios";
import { toast } from "sonner";

interface Props {
  isOwner?: boolean;
  /** compact inline mode — tanpa label Scope:, dropdown lebih kecil, +Project icon-only */
  inline?: boolean;
}

export default function ProjectSelector({ isOwner = false, inline = false }: Props) {
  const { projects, currentProjectId, setCurrentProject, refreshProjects } = useProjectContext();
  const { currentTeamId } = useTeamContext();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    api
      .post(`/teams/${currentTeamId}/projects`, { name: name.trim(), description: desc.trim() })
      .then(() => {
        toast.success(`Project "${name.trim()}" berhasil dibuat.`);
        setName("");
        setDesc("");
        setCreating(false);
        refreshProjects();
      })
      .catch(() => toast.error("Gagal membuat project."))
      .finally(() => setSaving(false));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${inline ? '' : 'mb-6'}`}>
      {!inline && (
        <label htmlFor="project-scope" className="text-xs uppercase tracking-wide text-gray-500">
          Scope:
        </label>
      )}
      <div className="relative">
        <select
          id="project-scope"
          value={currentProjectId ?? ""}
          onChange={(e) => setCurrentProject(e.target.value || null)}
          className={`appearance-none rounded-md border border-gray-700 bg-gray-900 text-white outline-none focus:border-[#e07820] ${inline ? 'h-9 max-w-[180px] pl-2 pr-7 text-sm' : 'max-w-[260px] pl-3 pr-9 text-sm py-1.5'}`}
        >
          <option value="">Tim (Induk)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.is_frozen ? " (dikunci)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 size-4`} />
      </div>

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
          <button onClick={createProject} disabled={saving} className="rounded-md bg-accent px-2 py-1.5 text-sm text-black hover:bg-accent-hover transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="inline size-3.5 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button onClick={() => setCreating(false)} className="rounded-md border border-gray-700 px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Batal
          </button>
        </div>
      ) : isOwner && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          title="Buat project baru"
          className={`flex items-center rounded-md border border-dashed border-gray-700 text-gray-400 hover:border-[#e07820] hover:text-[#e07820] transition-colors ${inline ? 'p-2' : 'gap-1 px-2 py-1.5 text-sm'}`}
        >
          <Plus className={inline ? 'size-3.5' : 'size-3.5'} />
          {!inline && 'Project'}
        </button>
      )}
    </div>
  );
}
