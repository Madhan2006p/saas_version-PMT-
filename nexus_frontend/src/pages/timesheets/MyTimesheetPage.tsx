import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Card, Button, Space, Typography, Tag,
  Popconfirm, message, Tooltip, Alert,
} from "antd";
import {
  PlusOutlined, LeftOutlined, RightOutlined, SendOutlined,
  CopyOutlined, EditOutlined, DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import PermGuard from "@/components/common/PermGuard";
import WorkLogModal from "@/components/timesheets/WorkLogModal";
import { PERMS } from "@/constants/permissions";
import {
  timesheetApi, STATUS_COLOR,
  type WorkLog, type WorkLogCreate,
} from "@/services/timesheets";
import { apiErrorMsg } from "@/utils/apiError";
import { sundayOf } from "@/utils/weekDates";
import "./MyTimesheetPage.css";

const { Title, Text } = Typography;

export default function MyTimesheetPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => sundayOf().format("YYYY-MM-DD"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const { data: weekData, isLoading } = useQuery({
    queryKey: ["timesheet-week", weekStart],
    queryFn: () => timesheetApi.week(weekStart),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["timesheet-week"] });
  };

  const saveMut = useMutation({
    mutationFn: async (values: WorkLogCreate) => {
      if (editing) {
        return timesheetApi.updateLog(editing.id, values);
      }
      return timesheetApi.createLog(values);
    },
    onSuccess: (res) => {
      if (res.warnings && Object.keys(res.warnings).length) {
        message.warning(Object.values(res.warnings).join(" "));
      } else {
        message.success(editing ? "Work log updated" : "Time logged");
      }
      setModalOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e) => message.error(apiErrorMsg(e, "Failed to save work log")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => timesheetApi.deleteLog(id),
    onSuccess: () => { message.success("Deleted"); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Delete failed")),
  });

  const submitMut = useMutation({
    mutationFn: (payload: { id: string; weekStart: string }) =>
      timesheetApi.submit(payload.id, payload.weekStart),
    onSuccess: () => { message.success("Timesheet submitted"); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Submit failed")),
  });

  const copyDayMut = useMutation({
    mutationFn: ({ src, tgt }: { src: string; tgt: string }) =>
      timesheetApi.copyDay(src, tgt),
    onSuccess: (r) => { message.success(`Copied ${r.copied} entries`); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Copy failed")),
  });

  const copyWeekMut = useMutation({
    mutationFn: () =>
      timesheetApi.copyWeek(
        sundayOf(dayjs(weekStart).subtract(1, "week")).format("YYYY-MM-DD"),
        weekStart,
      ),
    onSuccess: (r) => { message.success(`Copied ${r.copied} entries from last week`); invalidate(); },
    onError: (e) => message.error(apiErrorMsg(e, "Copy failed")),
  });

  const weekly = weekData?.weekly_timesheet;
  const logs = weekData?.logs ?? [];
  const days = weekData?.days ?? [];
  const isCurrentWeek = weekData?.is_current_week ?? weekStart === sundayOf().format("YYYY-MM-DD");
  const isEditable =
    isCurrentWeek
    && (weekData?.is_editable ?? (weekly?.status === "DRAFT" || weekly?.status === "REJECTED"));
  const isViewOnly =
    !isCurrentWeek || weekly?.status === "SUBMITTED" || weekly?.status === "APPROVED";
  const openAdd = (date?: string) => {
    setEditing(null);
    setDefaultDate(date);
    setModalOpen(true);
  };

  const columns = [
    { title: "Date", dataIndex: "log_date", width: 110,
      render: (v: string) => dayjs(v).format("DD MMM YYYY") },
    { title: "Project", dataIndex: "project_name", ellipsis: true },
    { title: "Epic", dataIndex: "epic_title", ellipsis: true, render: (v: string) => v || "—" },
    { title: "Story", dataIndex: "story_title", ellipsis: true, render: (v: string) => v || "—" },
    { title: "Ticket", dataIndex: "ticket_id", width: 120,
      render: (v: string, r: WorkLog) => (
        <Tooltip title={r.ticket_title}><span style={{ color: "#4f46e5" }}>{v}</span></Tooltip>
      ) },
    { title: "Type", dataIndex: "ticket_type", width: 90 },
    { title: "Hours", dataIndex: "hours", width: 70, render: (v: number) => `${v}h` },
    { title: "Category", dataIndex: "category", width: 110,
      render: (v: string) => <Tag>{v.replace("_", " ")}</Tag> },
    { title: "Description", dataIndex: "description", ellipsis: true },
    {
      title: "", width: 90,
      render: (_: unknown, r: WorkLog) => isEditable && isCurrentWeek ? (
        <Space size={4}>
          <PermGuard permission={PERMS.PROJECT_TIMESHEET_UPDATE}>
            <Button type="text" size="small" icon={<EditOutlined />}
              onClick={() => { setEditing(r); setModalOpen(true); }} />
          </PermGuard>
          <PermGuard permission={PERMS.PROJECT_TIMESHEET_DELETE}>
            <Popconfirm title="Delete this log?" onConfirm={() => deleteMut.mutate(r.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </PermGuard>
        </Space>
      ) : null,
    },
  ];

  const weekLabel = weekly
    ? `${dayjs(weekly.week_start).format("DD MMM")} – ${dayjs(weekly.week_end).format("DD MMM YYYY")}`
    : "";

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>My Timesheet</Title>

      {/* Week navigation */}
      <div className="ts-week-nav">
        <Button icon={<LeftOutlined />}
          onClick={() => setWeekStart(sundayOf(dayjs(weekStart).subtract(1, "week")).format("YYYY-MM-DD"))} />
        <span className="ts-week-label">{weekLabel}</span>
        <Button icon={<RightOutlined />}
          disabled={sundayOf(dayjs(weekStart).add(1, "week")).isAfter(dayjs())}
          onClick={() => setWeekStart(sundayOf(dayjs(weekStart).add(1, "week")).format("YYYY-MM-DD"))} />
        <Button onClick={() => setWeekStart(sundayOf().format("YYYY-MM-DD"))}>Today</Button>
      </div>

      {/* Status bar */}
      {weekly && (
        <div className="ts-status-bar">
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color={STATUS_COLOR[weekly.status]} style={{ fontSize: 13, padding: "2px 10px" }}>
                {weekly.status}
              </Tag>
              <Text>
                <strong>{weekly.total_hours}h</strong> / {weekly.expected_hours}h
                {weekly.hours_behind > 0 && isEditable && (
                  <Text type="warning" style={{ marginLeft: 8 }}>{weekly.hours_behind}h behind</Text>
                )}
              </Text>
              {weekly.status === "REJECTED" && weekly.review_comment && (
                <Alert type="error" message={weekly.review_comment} style={{ padding: "2px 8px" }} />
              )}
            </Space>
            {isViewOnly && (
              <Alert
                type="info"
                showIcon
                message={
                  !isCurrentWeek
                    ? "Past weeks are view only. You can log time for the current week only — click Today to go back."
                    : weekly.status === "SUBMITTED"
                      ? "This timesheet has been submitted and is awaiting review. You can view entries but cannot edit them."
                      : "This timesheet has been approved. View only."
                }
                style={{ marginBottom: 0 }}
              />
            )}
          </Space>
          <Space>
            {isEditable && (
              <>
                <PermGuard permission={PERMS.PROJECT_TIMESHEET_CREATE}>
                  <Tooltip title="Copy previous week">
                    <Button icon={<CopyOutlined />} onClick={() => copyWeekMut.mutate()}
                      loading={copyWeekMut.isPending}>
                      Copy Last Week
                    </Button>
                  </Tooltip>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd()}>
                    Log Time
                  </Button>
                </PermGuard>
                <PermGuard permission={PERMS.PROJECT_TIMESHEET_SUBMIT}>
                  <Button type="primary" icon={<SendOutlined />}
                    loading={submitMut.isPending}
                    disabled={logs.length === 0}
                    onClick={() => submitMut.mutate({ id: weekly.id, weekStart: weekly.week_start })}>
                    Submit
                  </Button>
                </PermGuard>
              </>
            )}
          </Space>
        </div>
      )}

      {/* Day cards */}
      <div className="ts-day-cards">
        {days.map((d) => (
          <Tooltip
            key={d.date}
            title={!d.can_log ? (d.attendance_hint ?? (!isCurrentWeek ? "Past weeks are view only" : "Attendance not completed for this day")) : undefined}
          >
            <div
              className={`ts-day-card${d.over_capacity ? " ts-day-card--over" : ""}${!d.can_log ? " ts-day-card--disabled" : ""}${isViewOnly ? " ts-day-card--readonly" : ""}${d.is_weekend ? " ts-day-card--weekend" : ""}`}
              onClick={() => isEditable && d.can_log && openAdd(d.date)}
              style={{ cursor: isEditable && d.can_log ? "pointer" : "default" }}
            >
            <div className="ts-day-name">{d.day_name.slice(0, 3)}</div>
            <div className="ts-day-date">{dayjs(d.date).format("DD MMM")}</div>
            <div className={`ts-day-hours${d.over_capacity ? " ts-day-hours--over" : ""}`}>
              {d.total_hours}h{d.capacity > 0 ? ` / ${d.capacity}h` : d.total_hours > 0 ? " logged" : ""}
            </div>
            {!d.can_log && (
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                {!isCurrentWeek ? "View only" : d.attendance_hint ? "No attendance" : "—"}
              </div>
            )}
            {isEditable && d.can_log && d.log_count > 0 && (
              <Button type="link" size="small" style={{ padding: 0, marginTop: 4, fontSize: 11 }}
                onClick={(e) => {
                  e.stopPropagation();
                  const prev = dayjs(d.date).subtract(1, "day").format("YYYY-MM-DD");
                  copyDayMut.mutate({ src: prev, tgt: d.date });
                }}>
                <CopyOutlined /> Copy prev day
              </Button>
            )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Grid table */}
      <Card title={`Work Logs — ${weekLabel}`}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <WorkLogModal
        open={modalOpen && isEditable}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={(v) => saveMut.mutateAsync(v)}
        initial={editing}
        defaultDate={defaultDate}
        loading={saveMut.isPending}
      />
    </div>
  );
}
