<?php

namespace App\Services;

use App\Models\Team;
use App\Models\Project;
use App\Models\EquitySnapshot;
use App\Models\TeamMember;
use App\Models\Contribution;
use Illuminate\Support\Facades\DB;

class SlicingPieService
{
    /**
     * Slicing Pie Beranak.
     *
     * Scope:
     *  - recalculate($team)                 -> agregasi TIM (induk): Σ slices semua project + kontribusi tim-level
     *  - recalculate($team, null, $project)  -> Pie PROJECT (anak): hanya kontribusi project tsb
     *
     * Alur:
     *  1. Hitung slices per-member untuk scope (dengan penalty bad-leaver untuk non-cash).
     *  2. Snapshot dibuat untuk scope tsb (team_id + project_id nullable).
     *  3. Kalau scope = project, setelah snapshot project dibuat, panggil recalculate($team)
     *     agar induk ikut ter-aggregate.
     *
     * PENTING: caller harus sudah pegang lock (DB::transaction + lockForUpdate).
     */

    /**
     * @param Team $team
     * @param string|null $triggeredByContributionId
     * @param Project|null $project  kalau diset -> hitung Pie anak (project scope)
     */
    public function recalculate(Team $team, ?string $triggeredByContributionId = null, ?Project $project = null): EquitySnapshot
    {
        $isProjectScope = $project !== null;

        // Kontribusi APPROVED untuk scope ini.
        $query = $team->contributions()->with('member')->where('status', 'APPROVED');
        if ($isProjectScope) {
            // Project scope: kontribusi langsung milik project ini.
            $query->where('project_id', $project->id);
        } else {
            // Tim scope (induk): hanya kontribusi tim-level murni (tanpa project).
            // Slices dari SEMUA project (aktif + frozen) ditambahkan via addAllProjectSlices().
            $query->whereNull('project_id');
        }

        $approvedContributions = $query->get();

        $slicesPerMember = [];
        foreach ($approvedContributions as $contribution) {
            $member = $contribution->member;
            if (!$member) continue;

            $slices = $contribution->total_slices;

            // Recovery: bad leaver kehilang slices non-cash (cash di-recalc tanpa multiplier).
            if ($member->isBadLeaver() && $contribution->type !== 'CASH') {
                $slices = 0;
            }

            $slicesPerMember[$member->id] = ($slicesPerMember[$member->id] ?? 0) + $slices;
        }

        // Untuk scope induk, tambahkan juga slices dari SEMUA project (aktif + frozen).
        // Prinsip 1: agregat induk = totalitas, tidak ada slice yang hilang.
        if (!$isProjectScope) {
            $slicesPerMember = $this->addAllProjectSlices($team, $slicesPerMember);
        }

        $totalSlices = array_sum($slicesPerMember);

        $equityMap = [];
        if ($totalSlices > 0) {
            foreach ($slicesPerMember as $memberId => $slices) {
                $equityMap[$memberId] = [
                    'slices'     => $slices,
                    'equity_pct' => round(($slices / $totalSlices) * 100, 4),
                ];
            }
        }

        // Lock snapshot untuk scope ini
        DB::table('equity_snapshots')
            ->where('team_id', $team->id)
            ->where('project_id', $isProjectScope ? $project->id : null)
            ->lockForUpdate()
            ->get();

        $snapshot = EquitySnapshot::create([
            'team_id'                   => $team->id,
            'project_id'                => $isProjectScope ? $project->id : null,
            'triggered_by_contribution' => $triggeredByContributionId,
            'total_slices'              => $totalSlices,
            'equity_map'                => $equityMap,
            'is_frozen'                 => $isProjectScope ? ($project->is_frozen ?? false) : ($team->is_frozen ?? false),
        ]);

        AuditLogService::log(
            teamId:      $team->id,
            action:      $isProjectScope ? 'equity.recalculated.project' : 'equity.recalculated',
            actorId:     null,
            subjectType: 'equity_snapshot',
            subjectId:   $snapshot->id,
            payload:     [
                'scope'         => $isProjectScope ? 'project' : 'team',
                'project_id'    => $isProjectScope ? $project->id : null,
                'total_slices'  => $totalSlices,
                'members_count' => count($equityMap),
            ],
        );

        // Scope project selesai -> propagate ke induk agar agregasi tim ikut update.
        if ($isProjectScope) {
            $this->recalculate($team);
        }

        return $snapshot;
    }

    /**
     * Ambil slices dari SEmUA snapshot project (aktif + frozen), lalu masukkan ke
     * agregasi induk. Bad leaver di-project sudah tercermin di snapshot project.
     * Prinsip 1: agregat induk mencakup seluruh project, tidak ada yang di-exclude.
     */
    private function addAllProjectSlices(Team $team, array $slicesPerMember): array
    {
        $projectSnapshots = EquitySnapshot::where('team_id', $team->id)
            ->whereNotNull('project_id')
            ->orderByDesc('created_at')
            ->get()
            ->unique('project_id'); // ambil snapshot terbaru per project (aktif & frozen)

        foreach ($projectSnapshots as $snap) {
            foreach ($snap->equity_map as $memberId => $data) {
                $slicesPerMember[$memberId] = ($slicesPerMember[$memberId] ?? 0) + ($data['slices'] ?? 0);
            }
        }

        return $slicesPerMember;
    }

    /**
     * Calculate slices untuk sebuah tipe kontribusi.
     * CASH ×4, lainnya ×2 (sesuai Moyer).
     */
    public static function calculateSlices(string $type, int $value): array
    {
        if ($value < 0) {
            throw new \InvalidArgumentException("Contribution value must be non-negative: {$value}");
        }

        $multiplier = match ($type) {
            'CASH'                       => 4.0,
            'TIME', 'IDEA', 'NETWORK',
            'FACILITY', 'SALES'          => 2.0,
            default => throw new \InvalidArgumentException("Unknown contribution type: {$type}"),
        };

        return [
            'multiplier'   => $multiplier,
            'total_slices' => (int) round($value * $multiplier),
        ];
    }

    /**
     * Freeze equity untuk scope tertentu.
     *  - freeze($team)        -> freeze induk (bake ke cap table / investor)
     *  - freeze($team, $proj) -> freeze project ( Pie anak kelar )
     */
    public function freeze(Team $team, ?Project $project = null): EquitySnapshot
    {
        if ($project) {
            $latest = EquitySnapshot::where('team_id', $team->id)
                ->where('project_id', $project->id)
                ->latest()
                ->first();
            if (!$latest) throw new \RuntimeException('No project equity snapshot to freeze.');

            DB::transaction(function () use ($project, $latest, $team) {
                $latest->update(['is_frozen' => true]);
                $project->update(['is_frozen' => true, 'frozen_at' => now()]);
                // setelah freeze project, agregasi induk ikut update — di DALAM transaksi biar aman race
                $this->recalculate($team);
            });

            return $latest->fresh();
        }

        $latest = EquitySnapshot::where('team_id', $team->id)
            ->whereNull('project_id')
            ->latest()
            ->first();
        if (!$latest) throw new \RuntimeException('No team equity snapshot to freeze.');

        DB::transaction(function () use ($team, $latest) {
            $latest->update(['is_frozen' => true]);
            $team->update(['is_frozen' => true, 'frozen_at' => now()]);
        });

        return $latest->fresh();
    }
}
