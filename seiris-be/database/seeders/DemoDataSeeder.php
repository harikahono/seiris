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
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    private SlicingPieService $slicingPie;

    private array $userDefs = [
        ['name' => 'amengFRONTEND', 'email' => 'kahono@z4foundation.com'],
        ['name' => 'Rina Wijaya',   'email' => 'rina@example.com'],
        ['name' => 'Budi Santoso',  'email' => 'budi@example.com'],
        ['name' => 'Sari Dewi',     'email' => 'sari@example.com'],
        ['name' => 'Adi Pratama',   'email' => 'adi@example.com'],
        ['name' => 'Dian Kurniawan','email' => 'dian@example.com'],
        ['name' => 'Fitri Handayani','email' => 'fitri@example.com'],
        ['name' => 'Andi Saputra',  'email' => 'andi@example.com'],
        ['name' => 'Mega Lestari',  'email' => 'mega@example.com'],
        ['name' => 'Rizky Fadhilah','email' => 'rizky@example.com'],
        ['name' => 'Dewi Lestari',  'email' => 'dewi@example.com'],
        ['name' => 'Agus Hartono',  'email' => 'agus@example.com'],
        ['name' => 'Putri Ayu',     'email' => 'putri@example.com'],
    ];

    private array $teamDefs = [
        [
            'name'      => 'GENUI',
            'owner'     => 'kahono@z4foundation.com',
            'threshold' => '75',
            'members'   => ['rina@example.com' => 'member', 'budi@example.com' => 'member', 'sari@example.com' => 'member'],
            'projects'  => ['Web Platform', 'Mobile App'],
        ],
        [
            'name'      => 'Karya Digital',
            'owner'     => 'adi@example.com',
            'threshold' => '75',
            'members'   => ['kahono@z4foundation.com' => 'member', 'dian@example.com' => 'member', 'fitri@example.com' => 'member'],
            'projects'  => ['Website UMKM', 'Branding Klien'],
        ],
        [
            'name'      => 'StartupA',
            'owner'     => 'dian@example.com',
            'threshold' => '50',
            'members'   => ['budi@example.com' => 'member', 'mega@example.com' => 'member', 'rizky@example.com' => 'member', 'andi@example.com' => 'member'],
            'projects'  => ['SaaS Core', 'AI Chatbot'],
        ],
        [
            'name'      => 'Project X',
            'owner'     => 'mega@example.com',
            'threshold' => '100',
            'members'   => ['dewi@example.com' => 'member', 'agus@example.com' => 'member'],
            'projects'  => ['Riset Pasar'],
        ],
        [
            'name'      => 'Dev Team',
            'owner'     => 'rizky@example.com',
            'threshold' => '75',
            'members'   => ['putri@example.com' => 'member', 'sari@example.com' => 'member', 'adi@example.com' => 'member'],
            'projects'  => ['Internal Tools'],
        ],
    ];

    private array $fmrDefs = [
        'kahono@z4foundation.com' => 150000, 'rina@example.com' => 120000, 'budi@example.com' => 100000,
        'sari@example.com' => 110000, 'adi@example.com' => 130000, 'dian@example.com' => 125000,
        'fitri@example.com' => 90000, 'andi@example.com' => 85000, 'mega@example.com' => 140000,
        'rizky@example.com' => 115000, 'dewi@example.com' => 95000, 'agus@example.com' => 80000,
        'putri@example.com' => 100000,
    ];

    // [teamName, projectName, memberEmail, type, desc, value, status, votes, deal?, estimated?]
    private array $contributionDefs = [
        // GENUI / Web Platform
        ['GENUI', 'Web Platform', 'kahono@z4foundation.com', 'TIME', 'Fitur Login & Registrasi', 1050000, 'APPROVED', ['rina@example.com'=>'APPROVE','budi@example.com'=>'APPROVE']],
        ['GENUI', 'Web Platform', 'rina@example.com', 'TIME', 'UI/UX Design Dashboard', 1800000, 'APPROVED', ['budi@example.com'=>'APPROVE','sari@example.com'=>'APPROVE']],
        ['GENUI', 'Web Platform', 'budi@example.com', 'CASH', 'Modal Server DO 3 Bulan', 1000000, 'APPROVED', ['rina@example.com'=>'APPROVE','sari@example.com'=>'APPROVE']],
        ['GENUI', 'Web Platform', 'budi@example.com', 'TIME', 'Backend API Modul Payment', 2500000, 'REJECTED', ['rina@example.com'=>'REJECT','sari@example.com'=>'APPROVE']],
        // GENUI / Mobile App
        ['GENUI', 'Mobile App', 'sari@example.com', 'IDEA', 'Riset Model Monetisasi Premium', 1100000, 'APPROVED', ['rina@example.com'=>'APPROVE','budi@example.com'=>'REJECT']],
        ['GENUI', 'Mobile App', 'kahono@z4foundation.com', 'SALES', 'Closing Angel Investor — estimasi 45jt deal 50jt', 2500000, 'APPROVED', ['rina@example.com'=>'APPROVE','budi@example.com'=>'APPROVE'], 50000000, 45000000, 50],
        // Karya Digital / Website UMKM
        ['Karya Digital', 'Website UMKM', 'adi@example.com', 'TIME', 'Setup Infrastructure & CI/CD', 1950000, 'APPROVED', ['dian@example.com'=>'APPROVE','fitri@example.com'=>'APPROVE']],
        ['Karya Digital', 'Website UMKM', 'dian@example.com', 'CASH', 'Domain & Hosting 1 Tahun', 800000, 'APPROVED', ['adi@example.com'=>'APPROVE','fitri@example.com'=>'APPROVE']],
        ['Karya Digital', 'Website UMKM', 'adi@example.com', 'SALES', 'Deal Website UMKM — estimasi 10jt deal 18jt', 4000000, 'APPROVED', ['dian@example.com'=>'APPROVE','fitri@example.com'=>'APPROVE'], 18000000, 10000000, 50],
        // Karya Digital / Branding Klien
        ['Karya Digital', 'Branding Klien', 'fitri@example.com', 'TIME', 'Content Writing Landing Page', 900000, 'APPROVED', ['adi@example.com'=>'APPROVE','dian@example.com'=>'APPROVE']],
        ['Karya Digital', 'Branding Klien', 'kahono@z4foundation.com', 'NETWORK', 'Introduksi ke 3 Calon Klien', 750000, 'PENDING', []],
        ['Karya Digital', 'Branding Klien', 'kahono@z4foundation.com', 'SALES', 'Deal Lanjutan — estimasi 9jt deal 12jt', 1500000, 'PENDING', [], 12000000, 9000000, 50],
        // StartupA / SaaS Core
        ['StartupA', 'SaaS Core', 'dian@example.com', 'TIME', 'Arsitektur Sistem & Database', 2500000, 'APPROVED', ['budi@example.com'=>'APPROVE','mega@example.com'=>'APPROVE']],
        ['StartupA', 'SaaS Core', 'budi@example.com', 'TIME', 'Backend Auth & Middleware', 2000000, 'APPROVED', ['dian@example.com'=>'APPROVE','andi@example.com'=>'APPROVE']],
        ['StartupA', 'SaaS Core', 'mega@example.com', 'FACILITY', 'Sewa Co-working Space 2 Bulan', 3000000, 'APPROVED', ['budi@example.com'=>'APPROVE','rizky@example.com'=>'APPROVE']],
        ['StartupA', 'SaaS Core', 'mega@example.com', 'SALES', 'Client A Tahunan — estimasi 25jt deal 30jt', 2500000, 'APPROVED', ['dian@example.com'=>'APPROVE','budi@example.com'=>'APPROVE'], 30000000, 25000000, 50],
        // StartupA / AI Chatbot
        ['StartupA', 'AI Chatbot', 'rizky@example.com', 'IDEA', 'Konsep AI Chatbot CS', 1150000, 'REJECTED', ['dian@example.com'=>'REJECT','andi@example.com'=>'APPROVE']],
        ['StartupA', 'AI Chatbot', 'andi@example.com', 'TIME', 'Frontend Landing Page', 1700000, 'PENDING', []],
        ['StartupA', 'AI Chatbot', 'dian@example.com', 'SALES', 'Client B — estimasi 20jt deal 20jt (fix)', 0, 'APPROVED', ['mega@example.com'=>'APPROVE','andi@example.com'=>'APPROVE'], 20000000, 20000000, 50],
        // Project X / Riset Pasar
        ['Project X', 'Riset Pasar', 'mega@example.com', 'TIME', 'Project Planning & Roadmap', 1400000, 'APPROVED', ['dewi@example.com'=>'APPROVE','agus@example.com'=>'APPROVE']],
        ['Project X', 'Riset Pasar', 'dewi@example.com', 'TIME', 'Research & Competitive Analysis', 1900000, 'APPROVED', ['mega@example.com'=>'APPROVE','agus@example.com'=>'APPROVE']],
        ['Project X', 'Riset Pasar', 'agus@example.com', 'CASH', 'Tools & Software Licenses', 500000, 'PENDING', []],
        // Dev Team / Internal Tools
        ['Dev Team', 'Internal Tools', 'rizky@example.com', 'TIME', 'Sprint Planning & Code Review', 1150000, 'APPROVED', ['putri@example.com'=>'APPROVE','sari@example.com'=>'APPROVE']],
        ['Dev Team', 'Internal Tools', 'putri@example.com', 'TIME', 'Component Library', 2000000, 'APPROVED', ['rizky@example.com'=>'APPROVE','adi@example.com'=>'APPROVE']],
        ['Dev Team', 'Internal Tools', 'sari@example.com', 'IDEA', 'Design System & Style Guide', 1100000, 'APPROVED', ['rizky@example.com'=>'APPROVE','putri@example.com'=>'APPROVE']],
        ['Dev Team', 'Internal Tools', 'adi@example.com', 'CASH', 'API Subscription 6 Bulan', 1500000, 'PENDING', []],
    ];

    private array $revenueDefs = [
        ['GENUI', 'Web Platform', 'kahono@z4foundation.com', 'Pendanaan Awal Angel Investor', 50000000, 35000000, [['for'=>'Notaris & Legal','amount'=>10000000],['for'=>'Platform fee','amount'=>5000000]], true],
        ['GENUI', 'Mobile App', 'kahono@z4foundation.com', 'Freelance Project Klien A', 20000000, 15000000, [['for'=>'Server DO','amount'=>3000000],['for'=>'Domain & SSL','amount'=>2000000]], true],
        ['Karya Digital', 'Website UMKM', 'adi@example.com', 'Project Website UMKM', 15000000, 12000000, [['for'=>'Hosting 1 tahun','amount'=>2000000],['for'=>'Template Premium','amount'=>1000000]], true],
        ['StartupA', 'SaaS Core', 'dian@example.com', 'Hibah Program Startup', 75000000, 60000000, [['for'=>'Pajak','amount'=>10000000],['for'=>'Administrasi bank','amount'=>5000000]], false],
    ];

    public function __construct()
    {
        $this->slicingPie = app(SlicingPieService::class);
    }

    public function run(): void
    {
        $this->command?->info('🚀 Seeding demo data (Slicing Pie Beranak)...');
        $users = $this->createUsers();
        $teams = $this->createTeamsAndMembers($users);
        $this->updateFmrs($users);
        $this->createContributions($teams, $users);
        $this->createFrozenSnapshots($teams);
        $this->createRevenues($teams, $users);
        $this->command?->info('✅ Demo data seeding selesai!');
    }

    private function createUsers(): array
    {
        $users = [];
        foreach ($this->userDefs as $def) {
            $users[$def['email']] = User::firstOrCreate(
                ['email' => $def['email']],
                ['name' => $def['name'], 'password' => bcrypt('password')]
            );
        }
        return $users;
    }

    private function createTeamsAndMembers(array $users): array
    {
        $teams = [];
        foreach ($this->teamDefs as $def) {
            $owner = $users[$def['owner']];
            $team = Team::firstOrCreate(['name' => $def['name']], [
                'owner_id' => $owner->id,
                'description' => "Tim {$def['name']} — demo SEIRIS",
                'invite_code' => strtoupper(Str::random(8)),
                'approval_threshold' => $def['threshold'],
                'is_frozen' => false,
            ]);
            $teams[$def['name']] = $team;

            TeamMember::firstOrCreate(
                ['team_id' => $team->id, 'user_id' => $owner->id],
                ['role' => 'owner', 'fmr' => $this->fmrDefs[$def['owner']], 'status' => 'active']
            );
            foreach ($def['members'] as $email => $role) {
                TeamMember::firstOrCreate(
                    ['team_id' => $team->id, 'user_id' => $users[$email]->id],
                    ['role' => $role, 'fmr' => $this->fmrDefs[$email], 'status' => 'active']
                );
            }

            // Buat projects (anak)
            foreach ($def['projects'] as $pname) {
                Project::firstOrCreate(
                    ['team_id' => $team->id, 'name' => $pname],
                    ['is_frozen' => false]
                );
            }
        }
        return $teams;
    }

    private function updateFmrs(array $users): void
    {
        foreach ($this->fmrDefs as $email => $fmr) {
            TeamMember::where('user_id', $users[$email]->id)->update(['fmr' => $fmr]);
        }
    }

    private function createContributions(array $teams, array $users): void
    {
        foreach ($this->contributionDefs as $def) {
            $team = $teams[$def[0]];
            $project = Project::where('team_id', $team->id)->where('name', $def[1])->first();
            $member = TeamMember::where('team_id', $team->id)->where('user_id', $users[$def[2]]->id)->first();
            if (!$member || !$project) continue;

            $type = $def[3];
            $value = $def[5];
            $status = $def[6];
            $votes = $def[7];
            $deal = $def[8] ?? null;
            $est = $def[9] ?? null;
            $rate = $def[10] ?? null;

            $slices = app(SlicingPieService::class)::calculateSlices($type, $value);

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
                'contribution_date' => now()->subDays(rand(1, 30)),
                'deal_value'        => $deal,
                'estimated_value'   => $est,
                'commission_rate'   => $rate,
            ]);

            foreach ($votes as $voterEmail => $vote) {
                $voterMember = TeamMember::where('team_id', $team->id)->where('user_id', $users[$voterEmail]->id)->first();
                if ($voterMember) {
                    ContributionApproval::create([
                        'contribution_id' => $contribution->id,
                        'member_id' => $voterMember->id,
                        'vote' => $vote,
                    ]);
                }
            }
        }

        // Populate project_members roster untuk demo (biar voting live bisa jalan)
        foreach ($teams as $name => $team) {
            foreach ($team->projects as $project) {
                $contributions = Contribution::where('team_id', $team->id)
                    ->where('project_id', $project->id)->get();
                $memberIds = collect();
                foreach ($contributions as $c) {
                    $memberIds->push($c->member_id); // contributor
                    $voterIds = ContributionApproval::where('contribution_id', $c->id)
                        ->pluck('member_id');
                    $memberIds = $memberIds->merge($voterIds); // voters
                }
                $memberIds = $memberIds->unique();
                foreach ($memberIds as $pmId) {
                    $pm = TeamMember::find($pmId);
                    if ($pm) {
                        DB::table('project_members')->updateOrInsert(
                            ['project_id' => $project->id, 'team_member_id' => $pmId],
                            ['fmr' => $pm->fmr, 'created_at' => now(), 'updated_at' => now()],
                        );
                    }
                }
            }
        }
    }

    /**
     * Setiap project di-freeze (Pie anak) lalu agregasi ke tim.
     */
    private function createFrozenSnapshots(array $teams): void
    {
        // M4: recalculate()/freeze() pakai lockForUpdate → wajib dalam transaction.
        // Di PostgreSQL, lock di luar transaction throw error.
        DB::transaction(function () use ($teams) {
            foreach ($teams as $name => $team) {
                foreach ($team->projects as $project) {
                    if ($project->contributions()->where('status', 'APPROVED')->exists()) {
                        $this->slicingPie->recalculate($team, null, $project);
                        $this->slicingPie->freeze($team, $project);
                    }
                }
                // agregasi tim (induk)
                $this->slicingPie->recalculate($team);
            }
        });
    }

    private function createRevenues(array $teams, array $users): void
    {
        foreach ($this->revenueDefs as $def) {
            $team = $teams[$def[0]];
            $project = Project::where('team_id', $team->id)->where('name', $def[1])->first();
            $member = TeamMember::where('team_id', $team->id)->where('user_id', $users[$def[2]]->id)->first();
            if (!$member || !$project) continue;

            $revenue = Revenue::create([
                'team_id' => $team->id,
                'project_id' => $project->id,
                'recorded_by' => $member->id,
                'description' => $def[3],
                'amount' => $def[4],
                'distributable_amount' => $def[5],
                'deductions' => $def[6] ?? [],
                'revenue_date' => now()->subDays(rand(5, 15)),
                'is_distributed' => false,
            ]);

            if ($def[7]) {
                // snapshot project scope
                $snapshot = EquitySnapshot::where('team_id', $team->id)
                    ->where('project_id', $project->id)
                    ->where('is_frozen', true)
                    ->latest()->first();
                if ($snapshot && !empty($snapshot->equity_map)) {
                    DB::transaction(function () use ($revenue, $snapshot, $def) {
                        foreach ($snapshot->equity_map as $memberId => $data) {
                            ProfitDistribution::firstOrCreate(
                                ['revenue_id' => $revenue->id, 'member_id' => $memberId],
                                ['equity_pct_snapshot' => $data['equity_pct'], 'amount' => (int) round($def[5] * ($data['equity_pct'] / 100))]
                            );
                        }
                        $revenue->update(['is_distributed' => true, 'status' => 'distributed', 'distributed_at' => now()]);
                    });
                }
            }
        }
    }
}
