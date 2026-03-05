import type { TaskListData, TaskDetail } from '../types/task'
import mockData from '../mock/tasks.json'
import mockDetailData from '../mock/task-detail.json'

/**
 * TODO: 替换为真实接口调用，如 `fetch('/api/tasks').then(r => r.json())`
 */
export async function fetchTaskList(): Promise<TaskListData> {
  return mockData as TaskListData
}

export async function fetchTaskDetail(id: number): Promise<TaskDetail | null> {
  const record = mockDetailData as Record<string, TaskDetail>
  return record[String(id)] ?? null
}
