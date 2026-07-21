# FE Refactor Plan — SEIRIS

> **Status:** Draft  
> **Target:** `seiris-fe/` (React 19 + Vite 8 + TS 6 + Tailwind 4)  
> **Prinsip:** Konsistensi > cleverness. Reusable > copy-paste. Satu pola, semua ikut.

---

## Problem Statement

Setiap komponen di FE nemu caranya sendiri untuk hal yang sama: fetching data, loading state, error handling, pagination, realtime refresh. Akibatnya:

1. **22 file panggil `api.get/post` langsung** — gak ada service layer. URL construction, error handling, response unwrapping diulang tiap file.
2. **Button & input style copy-paste 7+ varian** — gak ada komponen `<Button>`, `<Input>`, `<Modal>`. Kalo ada perubahan design, harus edit 30+ file.
3. **Modal 3 pendekatan** — ada yg portal, ada yg inline, ada yg pake `backdrop-blur`, ada yg gak. Animasi beda-beda.
4. **Pola realtime refresh (`refreshVersion`) di-copy-paste 9x** — tiap file punya implementasi sendiri, 2 di antaranya bermasalah (skeleton unmount, stuck pagination).
5. **Loading state gak konsisten** — ada yg skeleton early-return (unmount children), ada yg inline skeleton, ada yg spinner doang.
6. **Tidak ada test untuk service layer** — testing data fetching logic harus render komponen penuh.

---

## Solution

Dua lapis refactor:

### Lapis 1: Service Layer (`src/services/`)
Pisah semua API call dari komponen ke service functions yang fully typed, reusable, dan testable. Komponen tinggal panggil `service.fetchX()` tanpa mikir URL / axios / error parsing.

### Lapis 2: UI Component Library (`src/components/ui/`)
Bikin shared components untuk Button, Input, Modal, Select — dengan varian standar. Semua tab & page pake komponen ini, bukan HTML raw + utility classes copy-paste.

---

## User Stories

1. Sebagai developer, saya ingin semua API call ada di `src/services/` — bukan di komponen — supaya fetching logic bisa di-test tanpa render React.
2. Sebagai developer, saya ingin setiap service function punya TypeScript signature yang jelas (input → output) — supaya gak perlu nebak response shape.
3. Sebagai developer, saya ingin panggil `teamService.fetchTeam(id)` bukan `api.get(/teams/${id})` — supaya gak ngulang URL construction & error handling.
4. Sebagai developer, saya ingin ada `<Button variant="primary" | "danger" | "ghost" | "icon">` — supaya gak copy-paste utility classes 30x.
5. Sebagai developer, saya ingin ada `<Input error={...} />` — supaya gaya input seragam (underline vs card) dan error state built-in.
6. Sebagai developer, saya ingin ada `<Modal open={...} onClose={...}>` yang handle portal + backdrop + animasi + focus trap — supaya 5 modal gak perlu ngulang boilerplate.
7. Sebagai developer, saya ingin semua icon button punya `aria-label` secara otomatis — supaya WCAG A compliance gak kelewatan.
8. Sebagai pengguna, saya ingin loading state gak nge-unmount form/input yang sedang saya isi — supaya realtime refresh gak ngilangin tulisan saya.
9. Sebagai pengguna, saya ingin modal konsisten — semua pake backdrop blur, animasi scale-up, portal ke body, bisa diclose via backdrop click.
10. Sebagai developer, saya ingin `usePusherRefresh(fetchFn)` hook reusable — supaya 9 file gak perlu ngulang pola `prevRef` + `refreshVersion`.
11. Sebagai developer, saya ingin semua tab pake pola pagination yang sama — supaya bug `setPage(1)` no-op gak muncul lagi.
12. Sebagai developer, saya ingin entitas state management yang jelas: Context untuk shared state (auth, team, project), hooks untuk data fetching, components untuk UI.

---

## Implementation Plan

### Phase 0: Foundation — Shared Components (P0)

**Target:** Hapus duplikasi HTML utility classes yang paling sering muncul.

#### `<Button variant="primary" | "danger" | "ghost" | "icon">`

```tsx
// src/components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

// Primary:   bg-accent text-black hover:bg-accent-hover
// Danger:    border-red-500/30 text-red-400 hover:bg-red-500/10
// Ghost:     text-gray-400 hover:text-white hover:bg-gray-800
// Icon:      p-1.5 text-gray-500 hover:bg-gray-800 — auto aria-label
```

#### `<Input error={string | null}>`

```tsx
// src/components/ui/Input.tsx
// Underline variant: border-0 border-b border-white/10 bg-transparent
// Card variant: rounded-lg border bg-card px-3 py-2
// Error: border-red-500
// Auto-ID dari label htmlFor
```

#### `<Modal open onClose>`

```tsx
// src/components/ui/Modal.tsx
// createPortal ke document.body
// bg-black/60 backdrop-blur-sm
// modal-enter scale animation
// useFocusTrap built-in
// Close on backdrop click + Escape key
// auto aria-label dari title
```

**Files affected:** Semua file yang pake button/input/modal raw — ~20 files.

---

### Phase 1: Services Layer (P0)

Bikin folder `src/services/` dengan 1 file per resource domain. Setiap service adalah pure async function — gak ada React, gak ada state, gak ada UI.

```
src/services/
├── teamService.ts         → fetchTeam, fetchDashboard, updateTeam, freezeTeam
├── contributionService.ts → fetchList, fetchDetail, create, vote, fetchGithubDiff
├── revenueService.ts      → fetchList, fetchDetail, create, distribute, requestDistribute
├── equityService.ts       → fetchEquity, exportPdf
├── projectService.ts      → fetchProjects, create, freeze, addMember, removeMember
├── userService.ts         → updateProfile, updateGithubToken, clearGithubToken
├── auditService.ts        → fetchLogs
└── configService.ts       → fetchFeatureFlags
```

**Pola tiap function:**

```ts
// services/revenueService.ts
import api from "@/api/axios";
import type { Revenue, PaginatedResponse } from "@/types";

export async function fetchRevenues(basePath: string, page: number, filter?: string) {
  const res = await api.get<PaginatedResponse<Revenue>>(`${basePath}/revenues`, {
    params: { page, ...(filter && { status: filter }) },
  });
  return res.data; // typed
}
```

**Testing:** Setiap service function bisa di-test dengan mock axios. Cukup 1 test file per service.

**Files affected:** 22 components akan ganti `api.get(...)` → `service.fetchX(...)`.

---

### Phase 2: Hook Standardization (P1)

#### `usePusherRefresh(fetchFn, deps?)` — ganti pola copy-paste 9x

```tsx
// hooks/usePusherRefresh.ts
export function usePusherRefresh(fetchFn: () => void, deps: any[] = []) {
  const { refreshVersion } = useRealtime();
  const prev = useRef(0);
  useEffect(() => {
    if (prev.current === 0) { prev.current = refreshVersion; return; }
    prev.current = refreshVersion;
    fetchFn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion, ...deps]);
}
```

Semua tab tinggal:
```tsx
usePusherRefresh(() => { fetchRevenues(); fetchEquity(); });
```

#### Data-fetching hooks — standardisasi pagination + loading

```tsx
// hooks/useContributions.ts
export function useContributions(basePath: string, filter: string) {
  const [data, setData] = useState<Contribution[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lastPage, setLastPage] = useState(1);

  // Fetch dengan loading state yang aman (gak unmount children)
  const fetch = useCallback(async (targetPage?: number) => {
    const p = targetPage ?? page;
    const res = await contributionService.fetchList(basePath, p, filter);
    setData(res.data);
    setLastPage(res.meta.last_page);
  }, [basePath, page, filter]);

  // basePath change → reset ke page 1
  useEffect(() => { setPage(1); setLoading(true); fetch(1).finally(() => setLoading(false)); }, [basePath]);

  // page/filter change → fetch
  useEffect(() => { fetch().finally(() => setLoading(false)); }, [page, filter]);

  return { data, loading, page, lastPage, setPage, setLoading };
}
```

---

### Phase 3: UI Consistency Pass (P1)

Standardisasi pola yang udah ada tapi beda-beda:

| Pattern | Winner | Alasan |
|---------|--------|--------|
| Loading (page 1) | Skeleton inline | Gak unmount children |
| Loading (page > 1) | Spinner `Loader2` | Ringan, cukup |
| Modal | Portal + backdrop-blur + scale anim | ConfirmModal is the model |
| Empty state | `<EmptyState icon={...}>` | Udah ada, tinggal pake |
| Button variants | `<Button variant="...">` | Phase 0 |
| Input variants | `<Input variant="underline" | "card">` | Phase 0 |
| Entrance animation | `animate-fade-in-up` staggered | SettingsPage style |
| Kembali button | `<button aria-label="Kembali"><ArrowLeft/><span hidden sm:inline>Kembali</span>` | Udah konsisten |

---

### Phase 4: Service Adoption (P2)

Migrasi bertahap — 1 tab at a time, dari yang paling gampang:

1. `AuditLogTab.tsx` — cuma 1 API call, paling sederhana
2. `RevenueTab.tsx` — 2 API calls, + pagination
3. `ContributionsTab.tsx` — 2 API calls, + pagination + filter
4. `RevenueDetailPage.tsx` — 1 endpoint, 2 efek
5. `ContributionDetailPage.tsx` — 4 API calls, paling kompleks
6. `TeamSettingsTab.tsx` — 4 API calls
7. `TeamMembersTab.tsx` — 8 API calls, paling banyak
8. `DashboardPage.tsx` — 4 API calls
9. `SettingsPage.tsx` — 3 API calls
10. UI Components — `VotePanel`, `ContributionForm`, `CreateRevenueForm`, `RevenueCard`, `ProjectSelector`, `ExportPdfButton`

---

### Phase 5: Extraction & Decomposition (P2)

| File | Saat Ini | Rencana |
|------|----------|---------|
| `TeamMembersTab.tsx` | 624 lines, 8 API calls, 4 sub-domains | Extract: `FmrProposalSection`, `ProjectRosterActions`, `ExitMemberModal` |
| `RevenueCard.tsx` | 312 lines, API calls, action logic | Extract: `RevenueActionButtons`, `DistributionTable` (already partial) |
| `ContributionDetailPage.tsx` | 424 lines, sales math in render | Extract `SalesBreakdown` ke `lib/contribution.ts`, simplify render |

---

## Testing Decisions

- **Service layer:** Test dengan mock axios. 1 test file per service. Test: sukses response → return typed data, error → throw/return null.
- **UI components:** Gunakan Testing Library. Test: render dengan props → muncul sesuai varian. Gak test internal state.
- **Hooks:** Test dengan renderHook. Test: initial state, fetch success, fetch error, cleanup.
- **Prior art:** `RealtimeContext.test.tsx` — testing context + hook pattern sudah ada.

**Prinsip:** Test external behavior, bukan implementation details. Service → test response parsing. Component → test render output. Hook → test state transitions.

---

## Out of Scope

- **Backend refactor** — gak ada perubahan di `seiris-be/`.
- **Dead code removal** — dibahas terpisah (CSS vars, unused types, unused PHP imports).
- **WCAG audit items** — udah dicover di `UI_AUDIT.md`, jalan sendiri kecuali yg related ke komponen shared (aria-label di Button icon otomatis dari Phase 0).
- **Routing / page structure** — gak ngubah App.tsx atau susunan route.
- **State management overhaul** — Contexts tetap pake React Context, gak migrate ke Zustand/Redux. Cuma standardisasi pola fetching.
- **Landing page** — gak disentuh.

---

## Further Notes

- **Prioritas:** Phase 0 + 1 dulu (services + shared components). Ini yg paling gede dampaknya dan paling aman — gak ngubah logic, cuma mindahin API call + CSS classes.
- **Risiko:** Service layer migration bisa touch 22 files dalam 1 phase. Lakukan per-tab, commit tiap selesai 1 tab, biar gampang di-revert.
- **Flag:** Kalo ada ketergantungan circular (service A panggil service B), gunakan lazy import atau shared base service.
- **Base URL:** Constraint `basePath` (`/teams/${id}` vs `/teams/${id}/projects/${id}`) — buat helper `buildScopePath(teamId, projectId?)` di `lib/scope.ts` biar gak diulang 4x.
- **Rumus:** Sales breakdown di `ContributionDetailPage.tsx` baris 332-349 — extract ke `lib/contribution.ts` sebagai fungsi `calculateSalesBreakdown(contribution)`, biar terpisah dari JSX.
