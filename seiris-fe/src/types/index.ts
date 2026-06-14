// ── Pagination ──────────────────────────────────────────────
export interface PaginatedData<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

// ── Auth ────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// ── Team ────────────────────────────────────────────────────
export type TeamRole = "owner" | "member";
export type MemberStatus = "active" | "exited";

export interface TeamMember {
  id: string;
  role: TeamRole;
  fmr: number;
  status: MemberStatus;
  exited_at: string | null;
  user: User;
  joined_at: string;
}

export type ApprovalThreshold = "50" | "75" | "100";

export interface Team {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  approval_threshold: ApprovalThreshold;
  is_frozen: boolean;
  frozen_at: string | null;
  owner: User;
  members: TeamMember[];
  members_count: number;
  created_at: string;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
  approval_threshold?: ApprovalThreshold;
  fmr?: number;
}

export interface JoinTeamPayload {
  invite_code: string;
}

export interface UpdateFmrPayload {
  fmr: number;
}

// ── Dashboard ──────────────────────────────────────────────
export interface DashboardTeamItem {
  id: string;
  name: string;
  description: string | null;
  role: TeamRole;
  is_owner: boolean;
  my_equity_percentage: number;
  my_slices: number;
  total_team_slices: number;
  pending_approvals_count: number;
  total_members: number;
  created_at: string;
}

export interface DashboardData {
  user: User;
  summary: { total_teams: number; total_pending_to_review: number };
  teams: DashboardTeamItem[];
}

// ── Contribution ────────────────────────────────────────────
export type ContributionType =
  | "TIME"
  | "CASH"
  | "IDEA"
  | "NETWORK"
  | "FACILITY"
  | "REVENUE";

export type ContributionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ContributionApproval {
  id: string;
  vote: "APPROVE" | "REJECT";
  note: string | null;
  member: TeamMember;
  voted_at: string;
}

export interface Contribution {
  id: string;
  type: ContributionType;
  description: string;
  value: number;
  multiplier: string;
  total_slices: number;
  status: ContributionStatus;
  contribution_date: string;
  invoice_amount: number | null;
  actual_amount: number | null;
  invoice_url: string | null;
  member: TeamMember;
  approvals: ContributionApproval[];
  approvals_count: number;
  created_at: string;
}

export interface CreateContributionPayload {
  type: ContributionType;
  description: string;
  contribution_date: string;
  hours?: number;
  amount?: number;
  invoice_amount?: number;
  actual_amount?: number;
  invoice?: File;
}

export interface VotePayload {
  vote: "APPROVE" | "REJECT";
  note?: string;
}

// ── Equity ──────────────────────────────────────────────────
export interface EquityMemberEntry {
  member_id: string;
  name: string;
  role: TeamRole;
  slices: number;
  equity_pct: number;
}

export interface EquityData {
  snapshot_id: string;
  total_slices: number;
  equity_map: EquityMemberEntry[];
  is_frozen: boolean;
  calculated_at: string | null;
}

export interface EquitySnapshotItem {
  snapshot_id: string;
  total_slices: number;
  equity_map: Record<string, { slices: number; equity_pct: number }>;
  is_frozen: boolean;
  calculated_at: string | null;
}

// ── Revenue ─────────────────────────────────────────────────
export interface RevenueDistribution {
  member: TeamMember;
  equity_pct: number;
  amount: number;
}

export interface Revenue {
  id: string;
  description: string;
  amount: number;
  distributable_amount: number;
  proof_url: string | null;
  revenue_date: string;
  is_distributed: boolean;
  distributed_at: string | null;
  recorded_by: TeamMember;
  distributions: RevenueDistribution[];
  created_at: string;
}

export interface CreateRevenuePayload {
  description: string;
  amount: number;
  distributable_amount: number;
  revenue_date: string;
  proof?: File;
}

// ── Audit Log ───────────────────────────────────────────────
export interface AuditLogItem {
  id: string;
  action: string;
  actor: { id: string; name: string } | null;
  subject_type: string | null;
  subject_id: string | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
