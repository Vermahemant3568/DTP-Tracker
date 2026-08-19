import { supabase } from "@/lib/supabase";

export interface TaskTypeSummary {
  id: string;
  name: string;
  totalPages: number;
  inhousePages: number;
  vendorPages: number;
  taskCount: number;
}

export interface DashboardData {
  totalProjects: number;
  totalTasks: number;
  totalProductionPages: number;
  // This month
  monthlyPages: number;
  monthlyInhousePages: number;
  monthlyVendorPages: number;
  monthlyRevisionCount: number;
  monthlyRevisionPages: number;
  monthlyRevisionInhousePages: number;
  monthlyRevisionVendorPages: number;
  monthlyTasksPending: number;
  monthlyTasksInProgress: number;
  monthlyTasksCompleted: number;
  // Per task type
  taskTypeSummaries: TaskTypeSummary[];
}

export async function fetchDashboardData(year: number, month: number): Promise<DashboardData> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const [projectsRes, tasksRes, taskTypesRes, revisionsRes, allRevisionsRes] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id, work_type, final_pages, status, task_type_id, created_at, task_received_date, task_types(id, name)"),
    supabase.from("task_types").select("id, name").eq("status", "active").order("name"),
    supabase.from("task_revisions").select("id, task_id, work_type, revision_pages, created_at")
      .gte("created_at", startDate).lt("created_at", endDate),
    supabase.from("task_revisions").select("id, task_id, work_type, revision_pages"),
  ]);

  if (projectsRes.error)     throw new Error(projectsRes.error.message);
  if (tasksRes.error)        throw new Error(tasksRes.error.message);
  if (taskTypesRes.error)    throw new Error(taskTypesRes.error.message);
  if (revisionsRes.error)    throw new Error(revisionsRes.error.message);
  if (allRevisionsRes.error) throw new Error(allRevisionsRes.error.message);

  type RawTask = NonNullable<typeof tasksRes.data>[number];
  const allTasks = (tasksRes.data ?? []).map((t: RawTask) => ({
    id: t.id as string,
    work_type: t.work_type as string,
    final_pages: t.final_pages as number | null,
    status: t.status as string,
    task_type_id: t.task_type_id as string,
    created_at: t.created_at as string,
    // Use task_received_date as the canonical month date if set,
    // otherwise fall back to the date portion of created_at.
    month_date: ((t.task_received_date as string | null) ?? (t.created_at as string).slice(0, 10)) as string,
    task_types: Array.isArray(t.task_types) && t.task_types.length > 0
      ? { id: t.task_types[0].id as string, name: t.task_types[0].name as string }
      : null,
  }));

  // Filter by month_date (YYYY-MM-DD) so July tasks with a July received date
  // always appear under July regardless of when they were entered.
  const monthlyTasks = allTasks.filter(t => t.month_date >= startDate && t.month_date < endDate);
  const monthlyRevisions = revisionsRes.data ?? [];
  const allRevisions     = allRevisionsRes.data ?? [];

  // Overall
  const totalProjects = projectsRes.count ?? 0;
  const totalTasks = allTasks.length;
  const totalRevisionPages = allRevisions.reduce((s, r) => s + (r.revision_pages ?? 0), 0);
  const totalProductionPages = allTasks.reduce((s, t) => s + (t.final_pages ?? 0), 0) + totalRevisionPages;

  // This month tasks
  const monthlyTaskPages        = monthlyTasks.filter(t => t.work_type === "Inhouse" || t.work_type === "Vendor").reduce((s, t) => s + (t.final_pages ?? 0), 0);
  const monthlyTaskInhousePages = monthlyTasks.filter(t => t.work_type === "Inhouse").reduce((s, t) => s + (t.final_pages ?? 0), 0);
  const monthlyTaskVendorPages  = monthlyTasks.filter(t => t.work_type === "Vendor").reduce((s, t) => s + (t.final_pages ?? 0), 0);

  // This month revisions
  const monthlyRevisionCount        = monthlyRevisions.length;
  const monthlyRevisionPages        = monthlyRevisions.reduce((s, r) => s + (r.revision_pages ?? 0), 0);
  const monthlyRevisionInhousePages = monthlyRevisions.filter(r => r.work_type === "Inhouse").reduce((s, r) => s + (r.revision_pages ?? 0), 0);
  const monthlyRevisionVendorPages  = monthlyRevisions.filter(r => r.work_type === "Vendor").reduce((s, r) => s + (r.revision_pages ?? 0), 0);

  // Combined monthly pages (tasks + revisions)
  const monthlyPages        = monthlyTaskPages        + monthlyRevisionPages;
  const monthlyInhousePages = monthlyTaskInhousePages + monthlyRevisionInhousePages;
  const monthlyVendorPages  = monthlyTaskVendorPages  + monthlyRevisionVendorPages;

  // This month task statuses
  const monthlyTasksPending = monthlyTasks.filter(t => t.status === "pending").length;
  const monthlyTasksInProgress = monthlyTasks.filter(t => t.status === "in_progress").length;
  const monthlyTasksCompleted = monthlyTasks.filter(t => t.status === "completed").length;

  // Per task type — task pages only (revisions are shown separately in the Revisions card)
  const taskTypes = taskTypesRes.data ?? [];
  const taskTypeSummaries: TaskTypeSummary[] = taskTypes.map(tt => {
    const tasks = monthlyTasks.filter(t => t.task_type_id === tt.id);
    const inhousePages = tasks.filter(t => t.work_type === "Inhouse").reduce((s, t) => s + (t.final_pages ?? 0), 0);
    const vendorPages  = tasks.filter(t => t.work_type === "Vendor").reduce((s, t) => s + (t.final_pages ?? 0), 0);
    return {
      id: tt.id,
      name: tt.name,
      totalPages:   inhousePages + vendorPages,
      inhousePages,
      vendorPages,
      taskCount: tasks.length,
    };
  });

  return {
    totalProjects, totalTasks, totalProductionPages,
    monthlyPages, monthlyInhousePages, monthlyVendorPages,
    monthlyRevisionCount, monthlyRevisionPages, monthlyRevisionInhousePages, monthlyRevisionVendorPages,
    monthlyTasksPending, monthlyTasksInProgress, monthlyTasksCompleted,
    taskTypeSummaries,
  };
}
