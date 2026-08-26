interface ProgressHeartbeat {
  phase: string;
  completed: number;
  total: number;
  activeProjects: string[];
  elapsedMs: number;
  memoryUsage: Pick<NodeJS.MemoryUsage, "rss" | "heapUsed">;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatMib(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MiB`;
}

export function formatProgressHeartbeat(progress: ProgressHeartbeat): string {
  const remaining = progress.total - progress.completed - progress.activeProjects.length;
  const activeProjects = progress.activeProjects.join(", ") || "none";
  return (
    `[heartbeat] phase=${progress.phase} elapsed=${formatDuration(progress.elapsedMs)} ` +
    `completed=${progress.completed}/${progress.total} ` +
    `active=${progress.activeProjects.length} remaining=${Math.max(remaining, 0)} ` +
    `rss=${formatMib(progress.memoryUsage.rss)} ` +
    `heapUsed=${formatMib(progress.memoryUsage.heapUsed)} ` +
    `projects=${activeProjects}`
  );
}
