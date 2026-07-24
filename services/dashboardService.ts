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

  const [projectsRes, tasksRes, taskTypesRes, revisionsRes] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id, work_type, final_pages, status, task_type_id, created_at, task_types(id, name)"),
    supabase.from("task_types").select("id, name").eq("status", "active").order("name"),
    supabase.from("task_revisions").select("id, work_type, revision_pages, created_at")
      .gte("created_at", startDate).lt("created_at", endDate),
  ]);

  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (taskTypesRes.error) throw new Error(taskTypesRes.error.message);
  if (revisionsRes.error) throw new Error(revisionsRes.error.message);

  const allTasks = (tasksRes.data ?? []) as {
    id: string; work_type: string; final_pages: number | null;
    status: string; task_type_id: string; created_at: string;
    task_types: { id: string; name: string } | null;
  }[];

  const monthlyTasks = allTasks.filter(t => t.created_at >= startDate && t.created_at < endDate);
  const revisions = revisionsRes.data ?? [];

  // Overall
  const totalProjects = projectsRes.count ?? 0;
  const totalTasks = allTasks.length;
  const totalProductionPages = allTasks.reduce((s, t) => s + (t.final_pages ?? 0), 0);

  // This month tasks
  const monthlyPages = monthlyTasks.reduce((s, t) => s + (t.final_pages ?? 0), 0);
  const monthlyInhousePages = monthlyTasks.filter(t => t.work_type === "Inhouse").reduce((s, t) => s + (t.final_pages ?? 0), 0);
  const monthlyVendorPages = monthlyTasks.filter(t => t.work_type === "Vendor").reduce((s, t) => s + (t.final_pages ?? 0), 0);

  // This month revisions
  const monthlyRevisionCount = revisions.length;
  const monthlyRevisionPages = revisions.reduce((s, r) => s + (r.revision_pages ?? 0), 0);
  const monthlyRevisionInhousePages = revisions.filter(r => r.work_type === "Inhouse").reduce((s, r) => s + (r.revision_pages ?? 0), 0);
  const monthlyRevisionVendorPages = revisions.filter(r => r.work_type === "Vendor").reduce((s, r) => s + (r.revision_pages ?? 0), 0);

  // This month task statuses
  const monthlyTasksPending = monthlyTasks.filter(t => t.status === "pending").length;
  const monthlyTasksInProgress = monthlyTasks.filter(t => t.status === "in_progress").length;
  const monthlyTasksCompleted = monthlyTasks.filter(t => t.status === "completed").length;

  // Per task type (numbers filtered by selected month, all types always shown)
  const taskTypes = taskTypesRes.data ?? [];
  const taskTypeSummaries: TaskTypeSummary[] = taskTypes.map(tt => {
    const tasks = monthlyTasks.filter(t => t.task_type_id === tt.id);
    return {
      id: tt.id,
      name: tt.name,
      totalPages: tasks.reduce((s, t) => s + (t.final_pages ?? 0), 0),
      inhousePages: tasks.filter(t => t.work_type === "Inhouse").reduce((s, t) => s + (t.final_pages ?? 0), 0),
      vendorPages: tasks.filter(t => t.work_type === "Vendor").reduce((s, t) => s + (t.final_pages ?? 0), 0),
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
