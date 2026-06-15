import MockAdapter from "axios-mock-adapter";
import client from "./services/api";

const mock = new MockAdapter(client, { delayResponse: 500 });

// Mock Login
mock.onPost(/\/auth\/token\//).reply((config) => {
  const data = JSON.parse(config.data);
  const username = data.username || "HIT-001";
  localStorage.setItem("mock_username", username);
  return [200, {
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
  }];
});

// Mock User Profile
mock.onGet(/\/users\/me\//).reply(() => {
  const username = localStorage.getItem("mock_username") || "HIT-001";
  const isBasic = username === "HIT-004";
  
  const allPermissions = [
    "pmt.dashboard.own.view",
    "pmt.dashboard.project.view",
    "pmt.dashboard.hrms.view",
    "pmt.dashboard.executive.view",
    "pmt.project.view",
    "pmt.project.workitem.view",
    "pmt.hrms.employee.view",
    "pmt.project.timesheet.view"
  ];
  
  // Give basic user fewer permissions so standard features hide
  const basicPermissions = [
    "pmt.dashboard.own.view",
    "pmt.project.view",
    "pmt.project.workitem.view"
  ];

  return [200, {
    id: isBasic ? 4 : 1,
    username: username,
    full_name: isBasic ? "Basic User" : "Standard User",
    employee_code: username,
    designation: isBasic ? "Developer" : "Manager",
    department: "PMO",
    grade: "A",
    keycloak_group: isBasic ? "User" : "Admin",
    is_pmo: !isBasic,
    is_manager: !isBasic,
    is_staff: !isBasic,
    is_superuser: !isBasic,
    permissions: isBasic ? basicPermissions : allPermissions
  }];
});

// Mock PMO Dashboard
mock.onGet(/\/dashboard\/pmo\//).reply(200, {
  projects: { active: 12, total: 15, on_track: 8, at_risk: 3, delayed: 1 },
  logging: {
    billable_hours: 450,
    total_hours: 500,
    billing_utilization_percent: 90,
    hours_by_project: [
      { code: "PRJ-1", hours: 100 },
      { code: "PRJ-2", hours: 200 }
    ],
    weekly_trend: [
      { label: "W1", total_hours: 100, billable_hours: 80 },
      { label: "W2", total_hours: 110, billable_hours: 90 },
    ]
  },
  timesheet_week: { week_start: "2026-06-08", approved: 10, submitted: 2, draft: 1, rejected: 0, missing: 0 },
  work_items: { total: 100, open: 20, in_progress: 30, done: 40, overdue: 10 },
  team: { total_members: 15, avg_utilization_percent: 85 },
  portfolio: {
    projects: [
      { id: 1, code: "PRJ-001", name: "Alpha Release", client: "Acme Corp", health: "ON_TRACK", completion_pct: 80, open_tickets: 5, total_tickets: 50, logged_hours_month: 100, days_left: 15 },
      { id: 2, code: "PRJ-002", name: "Beta Release", client: "Globex", health: "AT_RISK", completion_pct: 40, open_tickets: 15, total_tickets: 60, logged_hours_month: 200, days_left: 5 },
    ]
  },
  alerts: []
});

// Mock HRMS Dashboard
mock.onGet(/\/dashboard\/hrms\//).reply(200, {
  date: "2026-06-15",
  headcount: { total_active: 50, new_joiners_month: 5, dept_distribution: [], role_distribution: [] },
  attendance_today: { PRESENT: 45, WFH: 2, HALF_DAY: 0, ON_LEAVE: 3, ABSENT: 0, not_marked: 0, attendance_rate: 94 },
  leave: { pending_count: 5, stats_this_month: { pending: 5, approved: 10, rejected: 1 }, pending_list: [] },
  recent_joiners: [],
  payroll: { total: 50, draft: 0, finalized: 50, paid: 50 }
});

// Mock Executive Dashboard
mock.onGet(/\/dashboard\/executive\//).reply(200, {
  fy: { start_year: 2026, label: "FY26", start_date: "2026-04-01", end_date: "2027-03-31" },
  available_fy_years: [2026, 2025],
  employees: { total: 50, active: 50 },
  vendors: { total: 10, active: 8 },
  projects: { total: 20, active: 15 },
  finance: { budget_total: 1000000, invoiced: 500000, received: 450000, pending: 50000, expenses: 200000 },
  clients_map: [],
  payment_monthly: [],
  billing_monthly: [],
  project_portfolio: [],
  project_pipeline: { breakdown: [] }
});

// Mock Employee Dashboard
mock.onGet(/\/dashboard\/employee\//).reply(200, {
  profile: { full_name: "Mock User", employee_code: "MOCK-001", shift_applicable: false },
  work_items: { open: 5, in_progress: 2, in_review: 1, done: 10, total: 18, overdue: 0 },
  recent_items: [],
  pending_followups: [],
  my_projects: [],
  timesheet: { weekly_hours: 40, expected_hours: 40, daily_logs: [] },
  recent_logs: [],
  attendance_today: { status: "PRESENT", check_in: "09:00:00", check_out: null },
  leave_balances: [],
  recent_leaves: [],
  leave_requests: [],
  attendance_month: { present: 20, wfh: 0, half_day: 0, on_leave: 1 },
  payslips: [],
  payslips_fy: "FY26",
  wfh_status: { wfh_enabled: true, pending_wfh_request: false, approved_wfh_today: false },
  checkin_stats: { avg_working_hours: 8, avg_break_minutes: 60, total_working_hours: 160, total_break_minutes: 1200, working_days_count: 20, on_time: 19, late: 1, early: 0 },
  reporting_hierarchy: {}
});

// Mock Notifications
mock.onGet(/\/notifications\/unread-count\//).reply(200, {
  unread_count: 0
});

mock.onGet(/\/notifications\//).reply(200, []);

// Mock Payment / Finance Dashboard
mock.onGet(/\/payment\/dashboard\//).reply(200, {
  kpi: {
    total_receivable: 1000000,
    total_received: 500000,
    total_invoiced: 600000,
    partial_count: 5,
    overdue_amount: 50000,
    overdue_count: 2,
    collection_pct: 83.3
  },
  monthly_trend: []
});

// Catch-all GET
mock.onGet(/.*/).reply((config) => {
  const url = config.url || "";
  // Endpoints that strictly expect a flat array
  if (
    url.includes("dropdown") ||
    url.includes("types") ||
    url.includes("balances") ||
    url.includes("requests") ||
    url.includes("my-payslips") ||
    url.includes("unread-count")
  ) {
    return [200, []];
  }
  // Default to paginated response
  return [200, { count: 0, results: [] }];
});

// Pass through
mock.onAny().reply(200, {});
