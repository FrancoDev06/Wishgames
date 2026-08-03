export interface ConsoleGroup<T> {
  consoleName: string;
  items: T[];
}

export function groupByConsoleName<T extends { console_name: string }>(items: T[]): ConsoleGroup<T>[] {
  const byConsole = new Map<string, T[]>();
  for (const item of items) {
    const group = byConsole.get(item.console_name) ?? [];
    group.push(item);
    byConsole.set(item.console_name, group);
  }
  return [...byConsole.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([consoleName, groupItems]) => ({ consoleName, items: groupItems }));
}
