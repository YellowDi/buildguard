export type TaskStatus = 'active' | 'pending' | 'completed'

export interface Task {
  id: number
  parkName: string
  taskName: string
  address?: string
  deadline?: string
  completedAt?: string
  status: TaskStatus
}

export interface TaskSection {
  key: string
  title?: string
  tasks: Task[]
}

export interface TaskListData {
  sections: TaskSection[]
}
