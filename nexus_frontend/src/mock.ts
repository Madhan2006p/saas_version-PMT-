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

// Mock Projects List
mock.onGet(/\/projects\//).reply((config) => {
  if (config.url?.includes("dropdown")) return [200, [
    { id: "1", name: "Nexus SaaS Platform" },
    { id: "2", name: "Mobile App Redesign" },
    { id: "3", name: "Client CRM Integration" }
  ]];
  return [200, {
    count: 3,
    results: [
      { id: "1", code: "PRJ-001", name: "Nexus SaaS Platform", client_name: "Acme Corp", status: "ACTIVE", health: "ON_TRACK", manager_name: "Alice Johnson", start_date: "2026-01-01", end_date: "2026-12-31", workflow_state_slug: "IN_PROGRESS" },
      { id: "2", code: "PRJ-002", name: "Mobile App Redesign", client_name: "Globex", status: "ACTIVE", health: "AT_RISK", manager_name: "Bob Smith", start_date: "2026-03-01", end_date: "2026-09-30", workflow_state_slug: "ENQUIRY" },
      { id: "3", code: "PRJ-003", name: "Client CRM Integration", client_name: "Initech", status: "ACTIVE", health: "ON_TRACK", manager_name: "Carol Davis", start_date: "2026-06-01", end_date: "2026-10-30", workflow_state_slug: "FOLLOW_UP" }
    ]
  }];
});

// Mock Employees List
mock.onGet(/\/employees\//).reply((config) => {
  if (config.url?.includes("dropdown")) return [200, [
    { id: "1", name: "Alice Johnson" },
    { id: "2", name: "Bob Smith" }
  ]];
  if (config.url?.includes("org-tree")) return [200, {
    parent: null,
    nodes: [
      { id: "1", name: "Alice Johnson", employee_code: "EMP-001", designation: "CEO", department: "Executive", manager_id: null, avatar: null },
      { id: "2", name: "Bob Smith", employee_code: "EMP-002", designation: "CTO", department: "Engineering", manager_id: "1", avatar: null },
      { id: "3", name: "Carol Davis", employee_code: "EMP-003", designation: "CFO", department: "Finance", manager_id: "1", avatar: null },
      { id: "4", name: "Dave Wilson", employee_code: "EMP-004", designation: "Engineering Manager", department: "Engineering", manager_id: "2", avatar: null },
      { id: "5", name: "Eve Brown", employee_code: "EMP-005", designation: "Developer", department: "Engineering", manager_id: "4", avatar: null }
    ]
  }];
  return [200, {
    count: 2,
    results: [
      { id: "1", full_name: "Alice Johnson", employee_code: "EMP-001", department: "Executive", designation: "CEO", status: "ACTIVE" },
      { id: "2", full_name: "Bob Smith", employee_code: "EMP-002", department: "Engineering", designation: "CTO", status: "ACTIVE" }
    ]
  }];
});

// Mock Work Items (Tickets)
mock.onGet(/\/work-items\//).reply(200, {
  count: 3,
  results: [
    { id: "1", ticket_number: "TKT-101", title: "Setup Database", type: "TASK", status: "DONE", priority: "HIGH", assignee_name: "Bob Smith", project_code: "PRJ-001" },
    { id: "2", ticket_number: "TKT-102", title: "Create API", type: "STORY", status: "IN_PROGRESS", priority: "MEDIUM", assignee_name: "Dave Wilson", project_code: "PRJ-001" },
    { id: "3", ticket_number: "TKT-103", title: "Fix Login Bug", type: "BUG", status: "OPEN", priority: "CRITICAL", assignee_name: "Eve Brown", project_code: "PRJ-002" }
  ]
});

// Mock Attendance Overview
mock.onGet(/\/attendance\/overview\//).reply(200, {
  date: "2026-06-15",
  total_employees: 50,
  marked: 48,
  not_marked: 2,
  counts: { PRESENT: 45, WFH: 2, ON_LEAVE: 1 },
  week_trend: [
    { date: "2026-06-10", present: 48, absent: 2 },
    { date: "2026-06-11", present: 49, absent: 1 },
    { date: "2026-06-12", present: 47, absent: 3 }
  ]
});

// Mock Timesheet Reporting Dashboard
mock.onGet(/\/timesheets\/reporting\/dashboard\//).reply(200, {
  pending_reviews: 5,
  missing_timesheets: 2,
  rejected_this_week: 0,
  missing_details: [
    { employee_id: "EMP-005", employee_name: "Eve Brown" }
  ]
});

// Mock Workflow States
mock.onGet(/\/workflow\/states\//).reply(200, [
  { id: "1", name: "Enquiry", slug: "ENQUIRY", label: "Enquiry", color_code: "#a855f7", order: 1, is_initial: true, is_final: false },
  { id: "2", name: "Follow Up", slug: "FOLLOW_UP", label: "Follow Up", color_code: "#f59e0b", order: 2, is_initial: false, is_final: false },
  { id: "3", name: "In Progress", slug: "IN_PROGRESS", label: "In Progress", color_code: "#3b82f6", order: 3, is_initial: false, is_final: false },
  { id: "4", name: "Completed", slug: "COMPLETED", label: "Completed", color_code: "#10b981", order: 4, is_initial: false, is_final: true },
  { id: "5", name: "Cancelled", slug: "CANCELLED", label: "Cancelled", color_code: "#ef4444", order: 5, is_initial: false, is_final: true }
]);

// Mock Workflow Transitions
mock.onGet(/\/workflow\/transitions\//).reply(200, [
  { id: "1", source_state_detail: { slug: "ENQUIRY" }, destination_state_detail: { slug: "FOLLOW_UP" }, label: "Send Follow Up" },
  { id: "2", source_state_detail: { slug: "FOLLOW_UP" }, destination_state_detail: { slug: "IN_PROGRESS" }, label: "Start Project" },
  { id: "3", source_state_detail: { slug: "IN_PROGRESS" }, destination_state_detail: { slug: "COMPLETED" }, label: "Complete" },
  { id: "4", source_state_detail: { slug: "ENQUIRY" }, destination_state_detail: { slug: "CANCELLED" }, label: "Cancel" }
]);

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
    url.includes("unread-count") ||
    url.includes("feed") ||
    url.includes("hr-compliance") ||
    url.includes("schedule") ||
    url.includes("transitions") ||
    url.includes("review") ||
    url.includes("org-tree")
  ) {
    return [200, []];
  }
  // Default to paginated response
  return [200, { count: 0, results: [] }];
});

// Pass through
mock.onAny().reply(200, {});
