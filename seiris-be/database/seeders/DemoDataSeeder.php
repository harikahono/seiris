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
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    private SlicingPieService $slicingPie;

    // â”€â”€ User Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Team Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // [name, ownerEmail, threshold, members: [email, role], ...]
    private array $teamDefs = [
        [
            'name'      => 'GENUI',
            'owner'     => 'kahono@z4foundation.com',
            'threshold' => '75',
            'members'   => [
                'rina@example.com'  => 'member',
                'budi@example.com'  => 'member',
                'sari@example.com'  => 'member',
            ],
        ],
        [
            'name'      => 'Karya Digital',
            'owner'     => 'adi@example.com',
            'threshold' => '75',
            'members'   => [
                'kahono@z4foundation.com' => 'member',
                'dian@example.com'        => 'member',
                'fitri@example.com'       => 'member',
            ],
        ],
        [
            'name'      => 'StartupA',
            'owner'     => 'dian@example.com',
            'threshold' => '50',
            'members'   => [
                'budi@example.com'  => 'member',
                'mega@example.com'  => 'member',
                'rizky@example.com' => 'member',
                'andi@example.com'  => 'member',
            ],
        ],
        [
            'name'      => 'Project X',
            'owner'     => 'mega@example.com',
            'threshold' => '100',
            'members'   => [
                'dewi@example.com' => 'member',
                'agus@example.com' => 'member',
            ],
        ],
        [
            'name'      => 'Dev Team',
            'owner'     => 'rizky@example.com',
            'threshold' => '75',
            'members'   => [
                'putri@example.com' => 'member',
                'sari@example.com'  => 'member',
                'adi@example.com'   => 'member',
            ],
        ],
    ];

    // â”€â”€ FMR Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private array $fmrDefs = [
        'kahono@z4foundation.com' => 150000,
        'rina@example.com'       => 120000,
        'budi@example.com'       => 100000,
        'sari@example.com'       => 110000,
        'adi@example.com'        => 130000,
        'dian@example.com'       => 125000,
        'fitri@example.com'      =>  90000,
        'andi@example.com'       =>  85000,
        'mega@example.com'       => 140000,
        'rizky@example.com'      => 115000,
        'dewi@example.com'       =>  95000,
        'agus@example.com'       =>  80000,
        'putri@example.com'      => 100000,
    ];

    // â”€â”€ Contribution Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // [teamName, memberEmail, type, description, value, status, voters: [email=>vote], ...]
    private array $contributionDefs = [
        // GENUI
        ['team' => 'GENUI', 'by' => 'kahono@z4foundation.com', 'type' => 'TIME',    'desc' => 'Fitur Login & Registrasi',                     'value' => 1050000, 'status' => 'APPROVED', 'votes' => ['rina@example.com'=>'APPROVE','budi@example.com'=>'APPROVE']],
        ['team' => 'GENUI', 'by' => 'rina@example.com',       'type' => 'TIME',    'desc' => 'UI/UX Design Dashboard',                       'value' => 1800000, 'status' => 'APPROVED', 'votes' => ['budi@example.com'=>'APPROVE','sari@example.com'=>'APPROVE']],
        ['team' => 'GENUI', 'by' => 'budi@example.com',        'type' => 'CASH',    'desc' => 'Modal Server DO 3 Bulan',                      'value' => 1000000, 'status' => 'APPROVED', 'votes' => ['rina@example.com'=>'APPROVE','sari@example.com'=>'APPROVE']],
        ['team' => 'GENUI', 'by' => 'sari@example.com',        'type' => 'IDEA',    'desc' => 'Riset Model Monetisasi Premium',               'value' => 1100000, 'status' => 'APPROVED', 'votes' => ['rina@example.com'=>'APPROVE','budi@example.com'=>'REJECT']],
        ['team' => 'GENUI', 'by' => 'budi@example.com',        'type' => 'TIME',    'desc' => 'Backend API Modul Payment',                    'value' => 2500000, 'status' => 'REJECTED', 'votes' => ['rina@example.com'=>'REJECT','sari@example.com'=>'APPROVE']],
        // â”€â”€ SALES: GENUI â€” Startup Bootstrap, Angel Investor markup 11% â”€â”€
        ['team' => 'GENUI', 'by' => 'kahono@z4foundation.com', 'type' => 'SALES',   'desc' => 'Closing Angel Investor â€” estimasi 45jt deal 50jt', 'value' => 2500000, 'deal_value' => 50000000, 'estimated_value' => 45000000, 'commission_rate' => 50, 'status' => 'APPROVED', 'votes' => ['rina@example.com'=>'APPROVE','budi@example.com'=>'APPROVE']],
        // Karya Digital
        ['team' => 'Karya Digital', 'by' => 'adi@example.com',         'type' => 'TIME',    'desc' => 'Setup Infrastructure & CI/CD',               'value' => 1950000, 'status' => 'APPROVED', 'votes' => ['dian@example.com'=>'APPROVE','fitri@example.com'=>'APPROVE']],
        ['team' => 'Karya Digital', 'by' => 'dian@example.com',        'type' => 'CASH',    'desc' => 'Domain & Hosting 1 Tahun',                   'value' => 800000,  'status' => 'APPROVED', 'votes' => ['adi@example.com'=>'APPROVE','fitri@example.com'=>'APPROVE']],
        ['team' => 'Karya Digital', 'by' => 'fitri@example.com',       'type' => 'TIME',    'desc' => 'Content Writing Landing Page',               'value' => 900000,  'status' => 'APPROVED', 'votes' => ['adi@example.com'=>'APPROVE','dian@example.com'=>'APPROVE']],
        ['team' => 'Karya Digital', 'by' => 'kahono@z4foundation.com', 'type' => 'NETWORK', 'desc' => 'Introduksi ke 3 Calon Klien Potensial',       'value' => 750000,  'status' => 'PENDING',  'votes' => []],
        // â”€â”€ SALES: Karya Digital â€” Freelance, deal markup 80% â”€â”€
        ['team' => 'Karya Digital', 'by' => 'adi@example.com',         'type' => 'SALES',   'desc' => 'Deal Website UMKM â€” estimasi 10jt deal 18jt',   'value' => 4000000, 'deal_value' => 18000000, 'estimated_value' => 10000000, 'commission_rate' => 50, 'status' => 'APPROVED', 'votes' => ['dian@example.com'=>'APPROVE','fitri@example.com'=>'APPROVE']],
        // â”€â”€ SALES: Karya Digital â€” deal markup 33%, masi pending â”€â”€
        ['team' => 'Karya Digital', 'by' => 'kahono@z4foundation.com', 'type' => 'SALES',   'desc' => 'Deal Lanjutan â€” estimasi 9jt deal 12jt',        'value' => 1500000, 'deal_value' => 12000000, 'estimated_value' => 9000000, 'commission_rate' => 50, 'status' => 'PENDING',  'votes' => []],
        // StartupA
        ['team' => 'StartupA', 'by' => 'dian@example.com',  'type' => 'TIME',   'desc' => 'Arsitektur Sistem & Database Design',           'value' => 2500000, 'status' => 'APPROVED', 'votes' => ['budi@example.com'=>'APPROVE','mega@example.com'=>'APPROVE']],
        ['team' => 'StartupA', 'by' => 'budi@example.com',   'type' => 'TIME',   'desc' => 'Backend Auth & Middleware',                     'value' => 2000000, 'status' => 'APPROVED', 'votes' => ['dian@example.com'=>'APPROVE','andi@example.com'=>'APPROVE']],
        ['team' => 'StartupA', 'by' => 'mega@example.com',   'type' => 'FACILITY','desc' => 'Sewa Co-working Space 2 Bulan',                'value' => 3000000, 'status' => 'APPROVED', 'votes' => ['budi@example.com'=>'APPROVE','rizky@example.com'=>'APPROVE']],
        ['team' => 'StartupA', 'by' => 'rizky@example.com',  'type' => 'IDEA',   'desc' => 'Konsep Fitur AI Chatbot untuk Customer Service', 'value' => 1150000, 'status' => 'REJECTED', 'votes' => ['dian@example.com'=>'REJECT','andi@example.com'=>'APPROVE']],
        ['team' => 'StartupA', 'by' => 'andi@example.com',   'type' => 'TIME',   'desc' => 'Frontend Landing Page & Dashboard',             'value' => 1700000, 'status' => 'PENDING',  'votes' => []],
        // â”€â”€ SALES: StartupA â€” SaaS, deal markup 20% â”€â”€
        ['team' => 'StartupA', 'by' => 'mega@example.com',   'type' => 'SALES',   'desc' => 'Client A Tahunan â€” estimasi 25jt deal 30jt',     'value' => 2500000, 'deal_value' => 30000000, 'estimated_value' => 25000000, 'commission_rate' => 50, 'status' => 'APPROVED', 'votes' => ['dian@example.com'=>'APPROVE','budi@example.com'=>'APPROVE']],
        // â”€â”€ SALES: StartupA â€” deal pas estimasi, markup 0% â”€â”€
        ['team' => 'StartupA', 'by' => 'dian@example.com',   'type' => 'SALES',   'desc' => 'Client B â€” estimasi 20jt deal 20jt (fix price)', 'value' => 0,       'deal_value' => 20000000, 'estimated_value' => 20000000, 'commission_rate' => 50, 'status' => 'APPROVED', 'votes' => ['mega@example.com'=>'APPROVE','andi@example.com'=>'APPROVE']],
        // Project X â€” threshold 100% (harus unanimous)
        ['team' => 'Project X', 'by' => 'mega@example.com', 'type' => 'TIME',   'desc' => 'Project Planning & Roadmap',                    'value' => 1400000, 'status' => 'APPROVED', 'votes' => ['dewi@example.com'=>'APPROVE','agus@example.com'=>'APPROVE']],
        ['team' => 'Project X', 'by' => 'dewi@example.com', 'type' => 'TIME',   'desc' => 'Research & Competitive Analysis',              'value' => 1900000, 'status' => 'APPROVED', 'votes' => ['mega@example.com'=>'APPROVE','agus@example.com'=>'APPROVE']],
        ['team' => 'Project X', 'by' => 'agus@example.com', 'type' => 'CASH',   'desc' => 'Tools & Software Licenses',                     'value' => 500000,  'status' => 'PENDING',  'votes' => []],
        // Dev Team
        ['team' => 'Dev Team', 'by' => 'rizky@example.com', 'type' => 'TIME',   'desc' => 'Sprint Planning & Code Review Setup',           'value' => 1150000, 'status' => 'APPROVED', 'votes' => ['putri@example.com'=>'APPROVE','sari@example.com'=>'APPROVE']],
        ['team' => 'Dev Team', 'by' => 'putri@example.com', 'type' => 'TIME',   'desc' => 'Component Library Development',                'value' => 2000000, 'status' => 'APPROVED', 'votes' => ['rizky@example.com'=>'APPROVE','adi@example.com'=>'APPROVE']],
        ['team' => 'Dev Team', 'by' => 'sari@example.com',  'type' => 'IDEA',   'desc' => 'Design System & Style Guide',                  'value' => 1100000, 'status' => 'APPROVED', 'votes' => ['rizky@example.com'=>'APPROVE','putri@example.com'=>'APPROVE']],
        ['team' => 'Dev Team', 'by' => 'adi@example.com',   'type' => 'CASH',   'desc' => 'API Subscription 6 Bulan',                      'value' => 1500000, 'status' => 'PENDING',  'votes' => []],
    ];

    // â”€â”€ Revenue Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // deductions: [{for: string, amount: int}] â€” daftar potongan transparan
    private array $revenueDefs = [
        ['team' => 'GENUI',         'by' => 'kahono@z4foundation.com', 'desc' => 'Pendanaan Awal Angel Investor', 'amount' => 50000000, 'distributable' => 35000000, 'deductions' => [['for' => 'Notaris & Legal', 'amount' => 10000000], ['for' => 'Platform fee', 'amount' => 5000000]], 'distribute' => true],
        ['team' => 'GENUI',         'by' => 'kahono@z4foundation.com', 'desc' => 'Freelance Project Klien A',     'amount' => 20000000, 'distributable' => 15000000, 'deductions' => [['for' => 'Server DO 3 bulan', 'amount' => 3000000], ['for' => 'Domain & SSL', 'amount' => 2000000]], 'distribute' => true],
        ['team' => 'Karya Digital', 'by' => 'adi@example.com',         'desc' => 'Project Website UMKM',          'amount' => 15000000, 'distributable' => 12000000, 'deductions' => [['for' => 'Hosting 1 tahun', 'amount' => 2000000], ['for' => 'Template Premium', 'amount' => 1000000]], 'distribute' => true],
        ['team' => 'StartupA',      'by' => 'dian@example.com',        'desc' => 'Hibah Program Startup',         'amount' => 75000000, 'distributable' => 60000000, 'deductions' => [['for' => 'Pajak', 'amount' => 10000000], ['for' => 'Administrasi bank', 'amount' => 5000000]], 'distribute' => false],
    ];

    public function __construct()
    {
        $this->slicingPie = app(SlicingPieService::class);
    }

    public function run(): void
    {
        $this->command?->info('ðŸš€ Seeding demo data...');

        $users = $this->createUsers();
        $teams = $this->createTeamsAndMembers($users);
        $this->updateFmrs($users);
        $contribs = $this->createContributions($teams, $users);
        $this->createSnapshots($teams);
        $this->createRevenues($teams, $users);

        $this->command?->info('âœ… Demo data seeding selesai!');
    }

    private function createUsers(): array
    {
        $this->command?->info('Creating users...');
        $users = [];
        foreach ($this->userDefs as $def) {
            $user = User::firstOrCreate(
                ['email' => $def['email']],
                [
                    'name'     => $def['name'],
                    'password' => bcrypt('password'),
                ]
            );
            $users[$def['email']] = $user;
        }
        return $users;
    }

    private function createTeamsAndMembers(array $users): array
    {
        $this->command?->info('Creating teams & members...');
        $teams = [];

        foreach ($this->teamDefs as $def) {
            $owner = $users[$def['owner']];

            $team = Team::firstOrCreate(
                ['name' => $def['name']],
                [
                    'owner_id'           => $owner->id,
                    'description'        => "Tim {$def['name']} â€” demo SEIRIS",
                    'invite_code'        => strtoupper(Str::random(8)),
                    'approval_threshold' => $def['threshold'],
                    'is_frozen'          => false,
                ]
            );
            $teams[$def['name']] = $team;

            // Owner member
            TeamMember::firstOrCreate(
                ['team_id' => $team->id, 'user_id' => $owner->id],
                ['role' => 'owner', 'fmr' => $this->fmrDefs[$def['owner']], 'status' => 'active']
            );

            AuditLogService::log(
                teamId:      $team->id,
                action:      'member.joined',
                actorId:     $owner->id,
                subjectType: 'team_member',
                subjectId:   TeamMember::where('team_id', $team->id)->where('user_id', $owner->id)->first()?->id,
                payload:     ['member_name' => $owner->name, 'role' => 'owner'],
            );

            // Other members
            foreach ($def['members'] as $email => $role) {
                $user = $users[$email];
                TeamMember::firstOrCreate(
                    ['team_id' => $team->id, 'user_id' => $user->id],
                    ['role' => $role, 'fmr' => $this->fmrDefs[$email], 'status' => 'active']
                );
            }

            // â”€â”€ Audit Logs â”€â”€
            AuditLogService::log(
                teamId:      $team->id,
                action:      'team.created',
                actorId:     $owner->id,
                subjectType: 'team',
                subjectId:   $team->id,
                payload:     ['name' => $team->name],
            );

            foreach ($def['members'] as $email => $role) {
                $user = $users[$email];
                $member = TeamMember::where('team_id', $team->id)->where('user_id', $user->id)->first();
                AuditLogService::log(
                    teamId:      $team->id,
                    action:      'member.joined',
                    actorId:     $user->id,
                    subjectType: 'team_member',
                    subjectId:   $member?->id,
                    payload:     ['member_name' => $user->name, 'role' => $role],
                );
            }
        }

        return $teams;
    }

    private function updateFmrs(array $users): void
    {
        $this->command?->info('Setting FMRs...');
        foreach ($this->fmrDefs as $email => $fmr) {
            TeamMember::where('user_id', $users[$email]->id)->update(['fmr' => $fmr]);
        }
    }

    private function createContributions(array $teams, array $users): array
    {
        $this->command?->info('Creating contributions & votes...');
        $contribs = [];

        foreach ($this->contributionDefs as $def) {
            $team = $teams[$def['team']];
            $member = TeamMember::where('team_id', $team->id)
                ->where('user_id', $users[$def['by']]->id)
                ->first();

            if (!$member) continue;

            // Calculate slices
            $slices = app(SlicingPieService::class)::calculateSlices($def['type'], $def['value']);

            $contribution = Contribution::create([
                'team_id'           => $team->id,
                'member_id'         => $member->id,
                'type'              => $def['type'],
                'description'       => $def['desc'],
                'value'             => $def['value'],
                'multiplier'        => $slices['multiplier'],
                'total_slices'      => $slices['total_slices'],
                'status'            => $def['status'],
                'contribution_date' => now()->subDays(rand(1, 30)),
                'deal_value'        => $def['deal_value'] ?? null,
                'estimated_value'   => $def['estimated_value'] ?? null,
                'commission_rate'   => $def['commission_rate'] ?? null,
            ]);

            // Create votes
            foreach ($def['votes'] as $voterEmail => $vote) {
                $voterMember = TeamMember::where('team_id', $team->id)
                    ->where('user_id', $users[$voterEmail]->id)
                    ->first();
                if ($voterMember) {
                    ContributionApproval::create([
                        'contribution_id' => $contribution->id,
                        'member_id'       => $voterMember->id,
                        'vote'            => $vote,
                    ]);
                }
            }

            // â”€â”€ Audit Logs â”€â”€
            AuditLogService::log(
                teamId:      $team->id,
                action:      'contribution.created',
                actorId:     $member->user_id,
                subjectType: 'contribution',
                subjectId:   $contribution->id,
                payload:     ['type' => $def['type'], 'value' => $def['value'], 'description' => $def['desc']],
            );

            foreach ($def['votes'] as $voterEmail => $vote) {
                $voterMember = TeamMember::where('team_id', $team->id)
                    ->where('user_id', $users[$voterEmail]->id)
                    ->first();
                if ($voterMember) {
                    AuditLogService::log(
                        teamId:      $team->id,
                        action:      'vote.cast',
                        actorId:     $users[$voterEmail]->id,
                        subjectType: 'contribution',
                        subjectId:   $contribution->id,
                        payload:     ['vote' => $vote],
                    );
                }
            }

            if (in_array($def['status'], ['APPROVED', 'REJECTED'])) {
                $lastVoterEmail = array_key_last($def['votes']);
                AuditLogService::log(
                    teamId:      $team->id,
                    action:      'contribution.' . strtolower($def['status']),
                    actorId:     $lastVoterEmail ? $users[$lastVoterEmail]->id : $member->user_id,
                    subjectType: 'contribution',
                    subjectId:   $contribution->id,
                    payload:     ['final_status' => $def['status']],
                );
            }

            $contribs[] = $contribution;
        }

        return $contribs;
    }

    private function createSnapshots(array $teams): void
    {
        $this->command?->info('Creating equity snapshots...');
        foreach ($teams as $name => $team) {
            $approvedCount = $team->contributions()->where('status', 'APPROVED')->count();
            if ($approvedCount > 0) {
                $this->slicingPie->recalculate($team);
                $this->command?->info("  {$name}: snapshot created ({$approvedCount} contributions)");
            } else {
                $this->command?->info("  {$name}: no approved contributions, skipping snapshot");
            }
        }
    }

    private function createRevenues(array $teams, array $users): void
    {
        $this->command?->info('Creating revenues & distributions...');
        foreach ($this->revenueDefs as $def) {
            $team = $teams[$def['team']];
            $member = TeamMember::where('team_id', $team->id)
                ->where('user_id', $users[$def['by']]->id)
                ->first();
            if (!$member) continue;

            $revenue = Revenue::create([
                'team_id'              => $team->id,
                'recorded_by'          => $member->id,
                'description'          => $def['desc'],
                'amount'               => $def['amount'],
                'distributable_amount' => $def['distributable'],
                'deductions'           => $def['deductions'] ?? [],
                'revenue_date'         => now()->subDays(rand(5, 15)),
                'is_distributed'       => false,
            ]);

            // â”€â”€ Audit Log: revenue.created â”€â”€
            AuditLogService::log(
                teamId:      $team->id,
                action:      'revenue.created',
                actorId:     $member->user_id,
                subjectType: 'revenue',
                subjectId:   $revenue->id,
                payload:     ['amount' => $def['amount'], 'distributable_amount' => $def['distributable']],
            );

            if ($def['distribute']) {
                $snapshot = $team->equitySnapshots()->first();
                if ($snapshot && !empty($snapshot->equity_map)) {
                    DB::transaction(function () use ($revenue, $snapshot, $team, $member, $def) {
                        foreach ($snapshot->equity_map as $memberId => $data) {
                            $amount = (int) round($def['distributable'] * ($data['equity_pct'] / 100));
                            ProfitDistribution::firstOrCreate(
                                ['revenue_id' => $revenue->id, 'member_id' => $memberId],
                                ['equity_pct_snapshot' => $data['equity_pct'], 'amount' => $amount]
                            );
                        }
                        $revenue->update([
                            'is_distributed' => true,
                            'status'         => 'distributed',
                            'distributed_at' => now(),
                        ]);

                        // â”€â”€ Audit Log: profit.distributed â”€â”€
                        AuditLogService::log(
                            teamId:      $team->id,
                            action:      'profit.distributed',
                            actorId:     $member->user_id,
                            subjectType: 'revenue',
                            subjectId:   $revenue->id,
                            payload:     [
                                'distributable_amount' => $def['distributable'],
                                'distributions_count'  => count($snapshot->equity_map),
                            ],
                        );
                    });
                    $this->command?->info("  {$def['team']}: revenue distributed");
                }
            }
        }
    }
}

