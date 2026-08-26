<?php

namespace Database\Seeders;

use App\Models\Contribution;
use App\Models\ContributionApproval;
use App\Models\EquitySnapshot;
use App\Models\FmrProposal;
use App\Models\ProfitDistribution;
use App\Models\Revenue;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder komprehensif dengan data realistis pasar Indonesia 2026.
 *
 * 3 Tim, beragam:
 * - FMR realistis (Rp 75k–250k/jam berdasarkan riset pasar)
 * - 6 tipe kontribusi (CASH, TIME, IDEA, NETWORK, FACILITY, SALES)
 * - Good & bad leaver dengan skenario berbeda
 * - Project frozen & aktif
 * - Revenue terdistribusi & belum terdistribusi
 * - Voting komplit & partial
 */
class ComprehensiveDemoSeeder extends Seeder
{
    private SlicingPieService $slicingPie;

    // ── Users ──────────────────────────────────────────────────────────────
    // 12 user dengan nama realistis Indonesia
    private array $userDefs = [
        // Tim 1: Nusantara Tech (startup SaaS)
        ['name' => 'Ahmad Rizki Pratama',    'email' => 'ahmad@nusantara.tech',   'role' => 'owner'],
        ['name' => 'Dewi Sartika',           'email' => 'dewi@nusantara.tech',    'role' => 'member'],
        ['name' => 'Budi Hartono',           'email' => 'budi@nusantara.tech',    'role' => 'member'],
        ['name' => 'Siti Nurhaliza',         'email' => 'siti@nusantara.tech',    'role' => 'member'],
        ['name' => 'Rizky Fadhilah',         'email' => 'rizky@nusantara.tech',   'role' => 'member'],

        // Tim 2: Kreatif Studio (digital agency)
        ['name' => 'Maya Indah Sari',        'email' => 'maya@kreatif.studio',    'role' => 'owner'],
        ['name' => 'Fajar Nugroho',          'email' => 'fajar@kreatif.studio',   'role' => 'member'],
        ['name' => 'Lestari Putri',          'email' => 'lestari@kreatif.studio', 'role' => 'member'],
        ['name' => 'Andi Saputra',           'email' => 'andi@kreatif.studio',    'role' => 'member'],

        // Tim 3: Startup Lokal (early-stage)
        ['name' => 'Putri Ayu Lestari',      'email' => 'putri@startup.id',       'role' => 'owner'],
        ['name' => 'Gilang Ramadhan',        'email' => 'gilang@startup.id',      'role' => 'member'],
        ['name' => 'Nina Salsabila',         'email' => 'nina@startup.id',        'role' => 'member'],
    ];

    // ── FMR (Fair Market Rate) realistis pasar Indonesia 2026 ──────────────
    // Junior: 75k–100k, Mid: 100k–150k, Senior: 150k–200k, Lead: 200k–250k
    private array $fmrDefs = [
        'ahmad@nusantara.tech'   => 200000, // Senior full-stack (owner)
        'dewi@nusantara.tech'    => 150000, // Mid frontend
        'budi@nusantara.tech'    => 175000, // Senior backend
        'siti@nusantara.tech'    => 120000, // Mid UI/UX
        'rizky@nusantara.tech'   => 100000, // Junior devops
        'maya@kreatif.studio'    => 225000, // Agency founder (lead)
        'fajar@kreatif.studio'   => 150000, // Mid developer
        'lestari@kreatif.studio' => 130000, // Mid designer
        'andi@kreatif.studio'    => 90000,  // Junior content
        'putri@startup.id'       => 180000, // Product owner (senior)
        'gilang@startup.id'      => 200000, // CTO (senior)
        'nina@startup.id'        => 110000, // Mid marketing
    ];

    // ── Teams ──────────────────────────────────────────────────────────────
    private array $teamDefs = [
        [
            'name'        => 'Nusantara Tech',
            'description' => 'Startup SaaS — platform kolaborasi tim untuk UMKM Indonesia',
            'owner'       => 'ahmad@nusantara.tech',
            'threshold'   => '50',
            'fmr'         => 200000,
            'commission'  => 50,
            'members'     => [
                'dewi@nusantara.tech'  => 'member',
                'budi@nusantara.tech'  => 'member',
                'siti@nusantara.tech'  => 'member',
                'rizky@nusantara.tech' => 'member',
            ],
            'projects' => ['SaaS Platform', 'Mobile App'],
        ],
        [
            'name'        => 'Kreatif Studio',
            'description' => 'Digital agency — web development & branding untuk klien korporat',
            'owner'       => 'maya@kreatif.studio',
            'threshold'   => '100',
            'fmr'         => 225000,
            'commission'  => 60,
            'members'     => [
                'fajar@kreatif.studio'   => 'member',
                'lestari@kreatif.studio' => 'member',
                'andi@kreatif.studio'    => 'member',
            ],
            'projects' => ['Website Klien A', 'Branding Package B'],
        ],
        [
            'name'        => 'Startup Lokal',
            'description' => 'Early-stage startup — aplikasi edtech untuk pelajar Indonesia',
            'owner'       => 'putri@startup.id',
            'threshold'   => '50',
            'fmr'         => 180000,
            'commission'  => 50,
            'members'     => [
                'gilang@startup.id' => 'member',
                'nina@startup.id'   => 'member',
            ],
            'projects' => ['MVP Development'],
        ],
    ];

    // ── Contributions (6 tipe, beragam status & voting) ────────────────────
    private array $contributionDefs = [
        // ═══════════════════════════════════════════════════════════════════
        // TIM 1: Nusantara Tech / SaaS Platform
        // ═══════════════════════════════════════════════════════════════════
        // CASH — infra
        ['Nusantara Tech', 'SaaS Platform', 'ahmad@nusantara.tech', 'CASH',
         'Server DigitalOcean 3 bulan (staging+prod)', 1500000, 'APPROVED',
         ['dewi@nusantara.tech'=>'APPROVE','budi@nusantara.tech'=>'APPROVE']],

        // TIME — fitur
        ['Nusantara Tech', 'SaaS Platform', 'dewi@nusantara.tech', 'TIME',
         'UI/UX Dashboard Analytics (40 jam × Rp 150k)', 6000000, 'APPROVED',
         ['ahmad@nusantara.tech'=>'APPROVE','siti@nusantara.tech'=>'APPROVE']],

        ['Nusantara Tech', 'SaaS Platform', 'budi@nusantara.tech', 'TIME',
         'Backend REST API Modul User Management (35 jam × Rp 175k)', 6125000, 'APPROVED',
         ['ahmad@nusantara.tech'=>'APPROVE','dewi@nusantara.tech'=>'APPROVE']],

        ['Nusantara Tech', 'SaaS Platform', 'siti@nusantara.tech', 'TIME',
         'Design System & Component Library (25 jam × Rp 120k)', 3000000, 'APPROVED',
         ['ahmad@nusantara.tech'=>'APPROVE','dewi@nusantara.tech'=>'APPROVE']],

        // IDEA — inovasi
        ['Nusantara Tech', 'SaaS Platform', 'rizky@nusantara.tech', 'IDEA',
         'Arsitektur Microservices untuk Scaling', 2000000, 'APPROVED',
         ['ahmad@nusantara.tech'=>'APPROVE','budi@nusantara.tech'=>'APPROVE']],

        // NETWORK — koneksi
        ['Nusantara Tech', 'SaaS Platform', 'ahmad@nusantara.tech', 'NETWORK',
         'Introduksi ke 5 calon klien enterprise', 3000000, 'APPROVED',
         ['dewi@nusantara.tech'=>'APPROVE','budi@nusantara.tech'=>'APPROVE']],

        // SALES — closing deal
        ['Nusantara Tech', 'SaaS Platform', 'ahmad@nusantara.tech', 'SALES',
         'Closing PT Maju Jaya — SaaS 1 tahun (deal Rp 50 juta)', 5000000, 'APPROVED',
         ['dewi@nusantara.tech'=>'APPROVE','budi@nusantara.tech'=>'APPROVE',
          'siti@nusantara.tech'=>'APPROVE','rizky@nusantara.tech'=>'APPROVE'],
         50000000, 45000000, 50],

        // PENDING — belum divote
        ['Nusantara Tech', 'SaaS Platform', 'budi@nusantara.tech', 'CASH',
         'Biaya API OpenAI untuk fitur AI assistant', 2000000, 'PENDING', []],

        // REJECTED — ditolak
        ['Nusantara Tech', 'SaaS Platform', 'rizky@nusantara.tech', 'TIME',
         'Deploy ke AWS (overkill untuk MVP)', 1500000, 'REJECTED',
         ['ahmad@nusantara.tech'=>'REJECT','budi@nusantara.tech'=>'REJECT',
          'dewi@nusantara.tech'=>'REJECT']],

        // ═══════════════════════════════════════════════════════════════════
        // TIM 1: Nusantara Tech / Mobile App
        // ═══════════════════════════════════════════════════════════════════
        ['Nusantara Tech', 'Mobile App', 'dewi@nusantara.tech', 'TIME',
         'React Native Setup & Navigation (30 jam)', 4500000, 'APPROVED',
         ['ahmad@nusantara.tech'=>'APPROVE','siti@nusantara.tech'=>'APPROVE']],

        ['Nusantara Tech', 'Mobile App', 'siti@nusantara.tech', 'IDEA',
         'Konsep Fitur Offline-First Sync', 1500000, 'APPROVED',
         ['ahmad@nusantara.tech'=>'APPROVE','dewi@nusantara.tech'=>'APPROVE']],

        ['Nusantara Tech', 'Mobile App', 'ahmad@nusantara.tech', 'SALES',
         'Closing AppPartner — Mobile dev contract (deal Rp 35 juta)', 3500000, 'APPROVED',
         ['dewi@nusantara.tech'=>'APPROVE','siti@nusantara.tech'=>'APPROVE'],
         35000000, 35000000, 50],

        // ═══════════════════════════════════════════════════════════════════
        // TIM 2: Kreatif Studio / Website Klien A
        // ═══════════════════════════════════════════════════════════════════
        ['Kreatif Studio', 'Website Klien A', 'maya@kreatif.studio', 'TIME',
         'Project Planning & Client Onboarding (20 jam × Rp 225k)', 4500000, 'APPROVED',
         ['fajar@kreatif.studio'=>'APPROVE','lestari@kreatif.studio'=>'APPROVE']],

        ['Kreatif Studio', 'Website Klien A', 'fajar@kreatif.studio', 'TIME',
         'Full-Stack Development Laravel + React (50 jam × Rp 150k)', 7500000, 'APPROVED',
         ['maya@kreatif.studio'=>'APPROVE','lestari@kreatif.studio'=>'APPROVE']],

        ['Kreatif Studio', 'Website Klien A', 'lestari@kreatif.studio', 'TIME',
         'UI/UX Design & Prototyping (35 jam × Rp 130k)', 4550000, 'APPROVED',
         ['maya@kreatif.studio'=>'APPROVE','fajar@kreatif.studio'=>'APPROVE']],

        ['Kreatif Studio', 'Website Klien A', 'andi@kreatif.studio', 'TIME',
         'Content Writing & Copywriting (15 jam × Rp 90k)', 1350000, 'APPROVED',
         ['maya@kreatif.studio'=>'APPROVE','lestari@kreatif.studio'=>'APPROVE']],

        ['Kreatif Studio', 'Website Klien A', 'maya@kreatif.studio', 'SALES',
         'Closing PT Sejahtera — Website Corp (deal Rp 25 juta)', 4000000, 'APPROVED',
         ['fajar@kreatif.studio'=>'APPROVE','lestari@kreatif.studio'=>'APPROVE',
          'andi@kreatif.studio'=>'APPROVE'],
         25000000, 25000000, 60],

        // FACILITY — office
        ['Kreatif Studio', 'Website Klien A', 'maya@kreatif.studio', 'FACILITY',
         'Sewa coworking space 1 bulan (klien meeting)', 2500000, 'APPROVED',
         ['fajar@kreatif.studio'=>'APPROVE','lestari@kreatif.studio'=>'APPROVE']],

        // ═══════════════════════════════════════════════════════════════════
        // TIM 2: Kreatif Studio / Branding Package B
        // ═══════════════════════════════════════════════════════════════════
        ['Kreatif Studio', 'Branding Package B', 'lestari@kreatif.studio', 'TIME',
         'Logo Design & Brand Guideline (25 jam)', 3250000, 'APPROVED',
         ['maya@kreatif.studio'=>'APPROVE','andi@kreatif.studio'=>'APPROVE']],

        ['Kreatif Studio', 'Branding Package B', 'andi@kreatif.studio', 'TIME',
         'Brand Story & Messaging Framework (10 jam)', 900000, 'APPROVED',
         ['maya@kreatif.studio'=>'APPROVE','lestari@kreatif.studio'=>'APPROVE']],

        ['Kreatif Studio', 'Branding Package B', 'maya@kreatif.studio', 'NETWORK',
         'Referensi dari klien lama ke Brand B', 1500000, 'APPROVED',
         ['lestari@kreatif.studio'=>'APPROVE','andi@kreatif.studio'=>'APPROVE']],

        // PENDING — belum divote
        ['Kreatif Studio', 'Branding Package B', 'fajar@kreatif.studio', 'CASH',
         'Biaya cetak brand book premium', 800000, 'PENDING', []],

        // ═══════════════════════════════════════════════════════════════════
        // TIM 3: Startup Lokal / MVP Development
        // ═══════════════════════════════════════════════════════════════════
        ['Startup Lokal', 'MVP Development', 'putri@startup.id', 'TIME',
         'Product Research & PRD (30 jam × Rp 180k)', 5400000, 'APPROVED',
         ['gilang@startup.id'=>'APPROVE','nina@startup.id'=>'APPROVE']],

        ['Startup Lokal', 'MVP Development', 'gilang@startup.id', 'TIME',
         'Backend Architecture & API (60 jam × Rp 200k)', 12000000, 'APPROVED',
         ['putri@startup.id'=>'APPROVE','nina@startup.id'=>'APPROVE']],

        ['Startup Lokal', 'MVP Development', 'gilang@startup.id', 'CASH',
         'VPS AWS Lightsail 6 bulan', 1800000, 'APPROVED',
         ['putri@startup.id'=>'APPROVE','nina@startup.id'=>'APPROVE']],

        ['Startup Lokal', 'MVP Development', 'nina@startup.id', 'TIME',
         'Digital Marketing Strategy & Launch Plan (20 jam)', 2200000, 'APPROVED',
         ['putri@startup.id'=>'APPROVE','gilang@startup.id'=>'APPROVE']],

        ['Startup Lokal', 'MVP Development', 'nina@startup.id', 'IDEA',
         'Growth Hacking via Komunitas Developer', 1500000, 'APPROVED',
         ['putri@startup.id'=>'APPROVE','gilang@startup.id'=>'APPROVE']],

        ['Startup Lokal', 'MVP Development', 'putri@startup.id', 'SALES',
         'Closing Indie Booster — Pre-seed (deal Rp 100 juta)', 8000000, 'APPROVED',
         ['gilang@startup.id'=>'APPROVE','nina@startup.id'=>'APPROVE'],
         100000000, 80000000, 50],

        // REJECTED
        ['Startup Lokal', 'MVP Development', 'gilang@startup.id', 'TIME',
         'Migrasi ke Kubernetes (premature untuk MVP)', 3000000, 'REJECTED',
         ['putri@startup.id'=>'REJECT','nina@startup.id'=>'REJECT']],

        // PENDING
        ['Startup Lokal', 'MVP Development', 'nina@startup.id', 'NETWORK',
         'Koneksi ke 3 investor angels', 2000000, 'PENDING', []],
    ];

    // ── Revenue ────────────────────────────────────────────────────────────
    private array $revenueDefs = [
        // Tim 1: 2 revenue (1 distributed, 1 pending)
        ['Nusantara Tech', 'SaaS Platform', 'ahmad@nusantara.tech',
         'Pendanaan Awal Angel Investor', 75000000, 60000000,
         [['for'=>'Notaris & Legal','amount'=>8000000],['for'=>'Server setup','amount'=>5000000]],
         true],

        ['Nusantara Tech', 'Mobile App', 'ahmad@nusantara.tech',
         'Revenue Freelance Project A', 25000000, 20000000,
         [['for'=>'Tools & software','amount'=>3000000]],
         false],

        // Tim 2: 2 revenue (1 distributed, 1 pending)
        ['Kreatif Studio', 'Website Klien A', 'maya@kreatif.studio',
         'Project Website PT Sejahtera', 25000000, 22000000,
         [['for'=>'Hosting 1 tahun','amount'=>2500000],['for'=>'Domain & SSL','amount'=>500000]],
         true],

        ['Kreatif Studio', 'Branding Package B', 'maya@kreatif.studio',
         'Branding Deal Brand B', 15000000, 12000000,
         [['for'=>'Cetak brand book','amount'=>1500000]],
         false],

        // Tim 3: 1 revenue (distributed)
        ['Startup Lokal', 'MVP Development', 'putri@startup.id',
         'Hibah Indie Booster Pre-seed', 100000000, 85000000,
         [['for'=>'Pajak','amount'=>10000000],['for'=>'Legal & notaris','amount'=>5000000]],
         true],
    ];

    // ── Leavers (good & bad, beragam alasan) ───────────────────────────────
    private array $leaverDefs = [
        // Tim 1: Rizky keluar sebagai BAD leaver ( resign tanpa notice, kontribusi belum selesai )
        [
            'team'     => 'Nusantara Tech',
            'email'    => 'rizky@nusantara.tech',
            'type'     => 'bad',
            'reason'   => 'Resign mendadak tanpa serah terima, kontribusi infrastruktur belum selesai',
        ],
        // Tim 2: Andi keluar sebagai GOOD leaver ( kontrak berakhir, kerja bagus )
        [
            'team'     => 'Kreatif Studio',
            'email'    => 'andi@kreatif.studio',
            'type'     => 'good',
            'reason'   => 'Kontrak freelance berakhir, semua deliverable sudah selesai tepat waktu',
        ],
    ];

    // ── FMR Proposals (beberapa approved, beberapa pending) ─────────────────
    private array $fmrProposalDefs = [
        // Tim 1: Dewi usul naik FMR dari 150k → 175k, approved
        ['Nusantara Tech', 'dewi@nusantara.tech', 175000, 'APPROVED'],
        // Tim 3: Gilang usul naik FMR dari 200k → 250k, pending
        ['Startup Lokal', 'gilang@startup.id', 250000, 'PENDING'],
    ];

    public function __construct()
    {
        $this->slicingPie = app(SlicingPieService::class);
    }

    public function run(): void
    {
        $this->command?->info('🚀 Seeding comprehensive demo data...');

        DB::transaction(function () {
            $users  = $this->createUsers();
            $teams  = $this->createTeamsAndMembers($users);
            $this->createContributions($teams, $users);
            $this->processLeavers($teams, $users);
            $this->createFrozenSnapshots($teams);
            $this->createRevenues($teams, $users);
            $this->createFmrProposals($teams, $users);
        });

        $this->command?->info('✅ Comprehensive demo seeding selesai!');
        $this->printSummary();
    }

    // ── Create Users ───────────────────────────────────────────────────────
    private function createUsers(): array
    {
        $users = [];
        foreach ($this->userDefs as $def) {
            $users[$def['email']] = User::firstOrCreate(
                ['email' => $def['email']],
                [
                    'name'     => $def['name'],
                    'password' => bcrypt('password'),
                ]
            );
        }
        return $users;
    }

    // ── Create Teams, Members, Projects ────────────────────────────────────
    private function createTeamsAndMembers(array $users): array
    {
        $teams = [];
        foreach ($this->teamDefs as $def) {
            $owner = $users[$def['owner']];

            $team = Team::firstOrCreate(
                ['name' => $def['name']],
                [
                    'owner_id'           => $owner->id,
                    'description'        => $def['description'],
                    'invite_code'        => strtoupper(Str::random(8)),
                    'approval_threshold' => $def['threshold'],
                    'is_frozen'          => false,
                ]
            );
            $teams[$def['name']] = $team;

            // Owner
            TeamMember::firstOrCreate(
                ['team_id' => $team->id, 'user_id' => $owner->id],
                [
                    'role'   => 'owner',
                    'fmr'    => $this->fmrDefs[$def['owner']],
                    'status' => 'active',
                ]
            );

            // Members
            foreach ($def['members'] as $email => $role) {
                TeamMember::firstOrCreate(
                    ['team_id' => $team->id, 'user_id' => $users[$email]->id],
                    [
                        'role'   => $role,
                        'fmr'    => $this->fmrDefs[$email],
                        'status' => 'active',
                    ]
                );
            }

            // Projects
            foreach ($def['projects'] as $pname) {
                Project::firstOrCreate(
                    ['team_id' => $team->id, 'name' => $pname],
                    ['is_frozen' => false]
                );
            }
        }
        return $teams;
    }

    // ── Create Contributions ───────────────────────────────────────────────
    private function createContributions(array $teams, array $users): void
    {
        foreach ($this->contributionDefs as $def) {
            $team    = $teams[$def[0]];
            $project = Project::where('team_id', $team->id)->where('name', $def[1])->first();
            $member  = TeamMember::where('team_id', $team->id)
                ->where('user_id', $users[$def[2]]->id)->first();

            if (!$member || !$project) continue;

            $type   = $def[3];
            $value  = $def[5];
            $status = $def[6];
            $votes  = $def[7];
            $deal   = $def[8] ?? null;
            $est    = $def[9] ?? null;
            $rate   = $def[10] ?? null;

            $slices = SlicingPieService::calculateSlices($type, $value);

            $contribution = Contribution::create([
                'team_id'           => $team->id,
                'project_id'        => $project->id,
                'member_id'         => $member->id,
                'type'              => $type,
                'description'       => $def[4],
                'value'             => $value,
                'multiplier'        => $slices['multiplier'],
                'total_slices'      => $slices['total_slices'],
                'status'            => $status,
                'contribution_date' => now()->subDays(rand(1, 45)),
                'deal_value'        => $deal,
                'estimated_value'   => $est,
                'commission_rate'   => $rate,
            ]);

            // Votes
            foreach ($votes as $voterEmail => $vote) {
                $voterMember = TeamMember::where('team_id', $team->id)
                    ->where('user_id', $users[$voterEmail]->id)->first();
                if ($voterMember) {
                    ContributionApproval::create([
                        'contribution_id' => $contribution->id,
                        'member_id'       => $voterMember->id,
                        'vote'            => $vote,
                    ]);
                }
            }
        }

        // Populate project_members roster
        foreach ($teams as $team) {
            foreach ($team->projects as $project) {
                $contributions = Contribution::where('team_id', $team->id)
                    ->where('project_id', $project->id)->get();

                $memberIds = collect();
                foreach ($contributions as $c) {
                    $memberIds->push($c->member_id);
                    $voterIds = ContributionApproval::where('contribution_id', $c->id)
                        ->pluck('member_id');
                    $memberIds = $memberIds->merge($voterIds);
                }

                foreach ($memberIds->unique() as $pmId) {
                    $pm = TeamMember::find($pmId);
                    if ($pm) {
                        ProjectMember::updateOrCreate(
                            ['project_id' => $project->id, 'team_member_id' => $pmId],
                            ['fmr' => $pm->fmr]
                        );
                    }
                }
            }
        }
    }

    // ── Process Leavers ────────────────────────────────────────────────────
    private function processLeavers(array $teams, array $users): void
    {
        foreach ($this->leaverDefs as $def) {
            $team   = $teams[$def['team']];
            $member = TeamMember::where('team_id', $team->id)
                ->where('user_id', $users[$def['email']]->id)->first();

            if (!$member || $member->status === 'exited') continue;

            // Update member status
            $member->update([
                'status'      => 'exited',
                'exited_at'   => now()->subDays(rand(5, 15)),
                'leaver_type' => $def['type'],
                'exit_reason' => $def['reason'],
            ]);

            // Hapus project_members
            DB::table('project_members')
                ->where('team_member_id', $member->id)
                ->delete();

            // Auto-reject PENDING contributions
            $member->contributions()
                ->where('status', 'PENDING')
                ->update(['status' => 'REJECTED']);

            // Audit log
            AuditLogService::log(
                teamId:      $team->id,
                action:      'member.exited',
                actorId:     $team->owner_id,
                subjectType: TeamMember::class,
                subjectId:   $member->id,
                payload:     [
                    'user_id'     => $member->user_id,
                    'leaver_type' => $def['type'],
                    'reason'      => $def['reason'],
                ]
            );
        }
    }

    // ── Create Frozen Snapshots ────────────────────────────────────────────
    private function createFrozenSnapshots(array $teams): void
    {
        DB::transaction(function () use ($teams) {
            foreach ($teams as $team) {
                foreach ($team->projects as $project) {
                    if ($project->contributions()->where('status', 'APPROVED')->exists()) {
                        $this->slicingPie->recalculate($team, null, $project);
                        $this->slicingPie->freeze($team, $project);
                    }
                }
                // Agregasi tim (induk)
                $this->slicingPie->recalculate($team);
            }
        });
    }

    // ── Create Revenues ────────────────────────────────────────────────────
    private function createRevenues(array $teams, array $users): void
    {
        foreach ($this->revenueDefs as $def) {
            $team    = $teams[$def[0]];
            $project = Project::where('team_id', $team->id)->where('name', $def[1])->first();
            $member  = TeamMember::where('team_id', $team->id)
                ->where('user_id', $users[$def[2]]->id)->first();

            if (!$member || !$project) continue;

            $revenue = Revenue::create([
                'team_id'             => $team->id,
                'project_id'          => $project->id,
                'recorded_by'         => $member->id,
                'description'         => $def[3],
                'amount'              => $def[4],
                'distributable_amount' => $def[5],
                'deductions'          => $def[6] ?? [],
                'revenue_date'        => now()->subDays(rand(3, 20)),
                'is_distributed'      => false,
            ]);

            if ($def[7]) {
                $snapshot = EquitySnapshot::where('team_id', $team->id)
                    ->where('project_id', $project->id)
                    ->where('is_frozen', true)
                    ->latest()->first();

                if ($snapshot && !empty($snapshot->equity_map)) {
                    DB::transaction(function () use ($revenue, $snapshot, $def) {
                        foreach ($snapshot->equity_map as $memberId => $data) {
                            ProfitDistribution::firstOrCreate(
                                ['revenue_id' => $revenue->id, 'member_id' => $memberId],
                                [
                                    'equity_pct_snapshot' => $data['equity_pct'],
                                    'amount'              => (int) round($def[5] * ($data['equity_pct'] / 100)),
                                ]
                            );
                        }
                        $revenue->update([
                            'is_distributed'  => true,
                            'status'          => 'distributed',
                            'distributed_at'  => now(),
                        ]);
                    });
                }
            }
        }
    }

    // ── Create FMR Proposals ───────────────────────────────────────────────
    private function createFmrProposals(array $teams, array $users): void
    {
        foreach ($this->fmrProposalDefs as $def) {
            $team   = $teams[$def[0]];
            $member = TeamMember::where('team_id', $team->id)
                ->where('user_id', $users[$def[1]]->id)->first();

            if (!$member) continue;

            $proposal = FmrProposal::firstOrCreate(
                ['team_id' => $team->id, 'member_id' => $member->id],
                [
                    'proposed_fmr' => $def[2],
                    'status'       => $def[3],
                    'proposed_by'  => $member->user_id,
                ]
            );

            if ($def[3] === 'APPROVED') {
                $member->update(['fmr' => $def[2]]);
            }
        }
    }

    // ── Print Summary ──────────────────────────────────────────────────────
    private function printSummary(): void
    {
        $this->command?->info('');
        $this->command?->info('📊 Ringkasan Data:');
        $this->command?->info('  Users:          ' . User::count());
        $this->command?->info('  Teams:          ' . Team::count());
        $this->command?->info('  Members:        ' . TeamMember::count());
        $this->command?->info('  Projects:       ' . Project::count());
        $this->command?->info('  Contributions:  ' . Contribution::count());
        $this->command?->info('  Revenues:       ' . Revenue::count());
        $this->command?->info('  Leavers:        ' . TeamMember::where('status', 'exited')->count());
        $this->command?->info('');

        $this->command?->info('👤 Login credentials: (semua password: password)');
        foreach ($this->userDefs as $def) {
            $leaver = collect($this->leaverDefs)->firstWhere('email', $def['email']);
            $tag = $leaver ? " [{$leaver['type']} leaver]" : '';
            $this->command?->info("  {$def['email']} → {$def['name']}{$tag}");
        }
    }
}
