import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Button, Typography, Tag, Select, DatePicker, Input, Modal, message,
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, FilterOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  DashboardShell,
  DashboardHeader,
  DashboardPanel,
  AttentionQueue,
  ActionMetric,
  WorkQueue,
  DashboardPageSkeleton,
  type AttentionItem,
} from "@/components/dashboard";
import { timesheetApi, STATUS_COLOR, type WeeklyTimesheet } from "@/services/timesheets";
import { get } from "@/services/api";
import { employeeApi } from "@/services/employees";
import { ENDPOINTS } from "@/constants/api";
import { apiErrorMsg } from "@/utils/apiError";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";
import { sundayOf } from "@/utils/weekDates";

const { Text } = Typography;

export default function ReportingTimesheetPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [rejectComment, setRejectComment] = useState("");

  const params: Record<string, string> = {};
  if (weekStart) params.week_start = weekStart;
  if (projectId) params.project = projectId;
  if (employeeId) params.employee = employeeId;

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["reporting-dashboard"],
    queryFn: () => timesheetApi.reportingDashboard(),
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reporting-review", params],
    queryFn: () => timesheetApi.reportingReview(params),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-dropdown-reporting"],
    queryFn: () => get<Array<{ id: string; name: string; code: string }>>(ENDPOINTS.PROJECT_DROPDOWN),
    staleTime: 60_000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-simple-dropdown-reporting"],
    queryFn: () => employeeApi.simpleDropdown(),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["reporting-review"] });
    qc.invalidateQueries({ queryKey: ["reporting-dashboard"] });
    setSelected([]);
  };

  const approveMut = useMutation({
    mutationFn: (id: string) => timesheetApi.approve(id),
    onSuccess: () => { message.success("Approved"); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Approve failed")),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      timesheetApi.reject(id, comment),
    onSuccess: () => {
      message.success("Rejected");
      setRejectModal({ open: false });
      setRejectComment("");
      invalidate();
    },
    onError: (e) => message.error(apiErrorMsg(e, "Reject failed")),
  });

  const bulkApproveMut = useMutation({
    mutationFn: (ids: string[]) => timesheetApi.bulkApprove(ids),
    onSuccess: () => { message.success("Bulk approved"); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Bulk approve failed")),
  });

  const bulkRejectMut = useMutation({
    mutationFn: (ids: string[]) => timesheetApi.bulkReject(ids),
    onSuccess: () => { message.success("Bulk rejected"); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Bulk reject failed")),
  });

  const attentionItems = useMemo((): AttentionItem[] => {
    if (!dashboard) return [];
    const items: AttentionItem[] = [];
    if (dashboard.pending_reviews > 0) {
      items.push({
        key: "pending",
        severity: "warning",
        title: "Pending reviews",
        count: dashboard.pending_reviews,
        detail: "Submitted timesheets awaiting your approval",
      });
    }
    if (dashboard.missing_timesheets > 0) {
      items.push({
        key: "missing",
        severity: "error",
        title: "Missing timesheets",
        count: dashboard.missing_timesheets,
        detail: "Team members who haven't submitted this week",
      });
    }
    if (dashboard.rejected_this_week > 0) {
      items.push({
        key: "rejected",
        severity: "info",
        title: "Rejected this week",
        count: dashboard.rejected_this_week,
        detail: "May need follow-up with employees",
      });
    }
    return items;
  }, [dashboard]);

  const missingQueue = useMemo(() => {
    if (!dashboard?.missing_details) return [];
    return dashboard.missing_details.map((m) => ({
      id: m.employee_id,
      title: m.employee_name,
      subtitle: `Week of ${dayjs(m.week_start).format("DD MMM YYYY")}`,
      badge: { label: m.status, color: "warning" },
      meta: "Not submitted",
      metaColor: "var(--pmt-warning)",
    }));
  }, [dashboard]);

  const pendingReviews = reviews.filter((r) => r.status === "SUBMITTED");

  const columns = [
    { title: "Employee", dataIndex: "employee_name", key: "employee", width: 160 },
    {
      title: "Week", key: "week", width: 180,
      render: (_: unknown, r: WeeklyTimesheet) =>
        `${dayjs(r.week_start).format("DD MMM")} – ${dayjs(r.week_end).format("DD MMM YYYY")}`,
    },
    {
      title: "Hours", key: "hours", width: 120,
      render: (_: unknown, r: WeeklyTimesheet) => `${r.total_hours}h / ${r.expected_hours}h`,
    },
    {
      title: "Behind", dataIndex: "hours_behind", key: "behind", width: 80,
      render: (v: number) => (v > 0 ? <Text type="warning">{v}h</Text> : "—"),
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 110,
      render: (v: WeeklyTimesheet["status"]) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: "Submitted", dataIndex: "submitted_at", key: "submitted", width: 130,
      render: (v: string) => (v ? dayjs(v).format("DD MMM HH:mm") : "—"),
    },
    {
      title: "Actions", key: "actions", width: 180, fixed: "right" as const,
      render: (_: unknown, r: WeeklyTimesheet) => (
        r.status === "SUBMITTED" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => approveMut.mutate(r.id)}
              loading={approveMut.isPending}
            >
              Approve
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setRejectModal({ open: true, id: r.id })}
            >
              Reject
            </Button>
          </div>
        ) : "—"
      ),
    },
  ];

  if (dashLoading) {
    return (
      <DashboardShell>
        <DashboardPageSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardHeader
        title="Timesheet Approval"
        subtitle="Review submissions, chase missing logs, and approve in bulk"
      />

      <AttentionQueue
        items={attentionItems}
        onItemClick={() => {
          document.getElementById("approval-queue")?.scrollIntoView({ behavior: "smooth" });
        }}
        emptyMessage="No timesheet issues — team is up to date this week."
      />

      <div className="dash-metrics">
        <ActionMetric
          label="Pending reviews"
          value={dashboard?.pending_reviews ?? 0}
          sub="Awaiting approval"
          accent={(dashboard?.pending_reviews ?? 0) > 0 ? "warning" : "success"}
          icon={<ClockCircleOutlined />}
        />
        <ActionMetric
          label="Approved this week"
          value={dashboard?.approved_this_week ?? 0}
          sub="Processed submissions"
          accent="success"
          icon={<CheckCircleOutlined />}
        />
        <ActionMetric
          label="Rejected this week"
          value={dashboard?.rejected_this_week ?? 0}
          sub="Sent back for correction"
          accent={(dashboard?.rejected_this_week ?? 0) > 0 ? "danger" : "default"}
          icon={<CloseCircleOutlined />}
        />
        <ActionMetric
          label="Missing"
          value={dashboard?.missing_timesheets ?? 0}
          sub="Not yet submitted"
          accent={(dashboard?.missing_timesheets ?? 0) > 0 ? "warning" : "success"}
          icon={<WarningOutlined />}
        />
      </div>

      {missingQueue.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <DashboardPanel
            title="Missing submissions"
            extra={<WarningOutlined style={{ color: "var(--pmt-warning)" }} />}
          >
            <WorkQueue
              items={missingQueue}
              emptyTitle="No missing timesheets"
            />
          </DashboardPanel>
        </div>
      )}

      <DashboardPanel
        title="Approval queue"
        extra={
          pendingReviews.length > 0 ? (
            <Tag color="processing">{pendingReviews.length} to review</Tag>
          ) : undefined
        }
      >
        <div className="dash-filter-bar">
          <FilterOutlined style={{ color: "var(--pmt-text-3)" }} />
          <DatePicker
            picker="week"
            placeholder="Week"
            allowClear
            onChange={(d) => setWeekStart(d ? sundayOf(d).format("YYYY-MM-DD") : undefined)}
          />
          <Select
            allowClear
            placeholder="Project"
            style={{ width: 200 }}
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.name}`,
            }))}
          />
          <Select
            allowClear
            placeholder="Employee"
            style={{ width: 200 }}
            showSearch
            value={employeeId}
            onChange={setEmployeeId}
            filterOption={(i, o) => (o?.label as string)?.toLowerCase().includes(i.toLowerCase())}
            options={employees.map((e) => ({ value: e.id, label: e.full_name }))}
          />
          {selected.length > 0 && (
            <div className="dash-filter-bar__bulk">
              <PermGuard permission={PERMS.PROJECT_TIMESHEET_APPROVE}>
                <Button
                  type="primary"
                  onClick={() => bulkApproveMut.mutate(selected)}
                  loading={bulkApproveMut.isPending}
                >
                  Approve {selected.length}
                </Button>
                <Button
                  danger
                  onClick={() => bulkRejectMut.mutate(selected)}
                  loading={bulkRejectMut.isPending}
                >
                  Reject {selected.length}
                </Button>
              </PermGuard>
            </div>
          )}
        </div>

        <div id="approval-queue" className="dash-table-wrap" style={{ maxHeight: 520, overflow: "auto" }}>
          <Table
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => setSelected(keys as string[]),
              getCheckboxProps: (r) => ({ disabled: r.status !== "SUBMITTED" }),
            }}
            columns={columns}
            dataSource={reviews}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{ pageSize: 15, showSizeChanger: true }}
            scroll={{ x: 900 }}
          />
        </div>
      </DashboardPanel>

      <Modal
        title="Reject Timesheet"
        open={rejectModal.open}
        onCancel={() => setRejectModal({ open: false })}
        onOk={() => rejectModal.id && rejectMut.mutate({ id: rejectModal.id, comment: rejectComment })}
        confirmLoading={rejectMut.isPending}
        okButtonProps={{ disabled: !rejectComment.trim() }}
      >
        <Input.TextArea
          rows={3}
          placeholder="Reason for rejection (required for employee resubmission)"
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          style={{ marginTop: 12 }}
        />
      </Modal>
    </DashboardShell>
  );
}
