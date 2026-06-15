import MockAdapter from "axios-mock-adapter";
import client from "./services/api";

const mock = new MockAdapter(client, { delayResponse: 500 });

// Mock Login
mock.onPost(/\/auth\/token\//).reply(200, {
  access_token: "fake-access-token",
  refresh_token: "fake-refresh-token",
});

// Mock User Profile
mock.onGet(/\/users\/me\//).reply(200, {
  id: 1,
  username: "hit-admin",
  full_name: "Admin User",
  employee_code: "HIT-001",
  designation: "Manager",
  department: "PMO",
  grade: "A",
  keycloak_group: "Admin",
  is_pmo: true,
  is_manager: true,
  is_staff: true,
  is_superuser: true,
  permissions: [
    "pmt.dashboard.own.view",
    "pmt.dashboard.project.view",
    "pmt.dashboard.hrms.view",
    "pmt.dashboard.executive.view",
    "pmt.project.view",
    "pmt.project.workitem.view",
    "pmt.hrms.employee.view"
  ]
});

// Mock Dashboard
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

// Any other GET requests return a fake pagination list
mock.onGet(/.*/).reply(200, {
  count: 0,
  results: []
});

// Pass through
mock.onAny().reply(200, {});
