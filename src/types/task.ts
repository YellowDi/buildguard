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

export type CheckItemStatus = 'normal' | 'focus' | 'risk' | 'unchecked'

export interface CheckItem {
  id: number
  name: string
  status: CheckItemStatus
  remark?: string
  photos?: string[]
  description?: string
  impact?: string
}

export interface InspectionCategory {
  id: number
  name: string
  description?: string
  items: CheckItem[]
}

export interface TaskDetail {
  id: number
  parkName: string
  taskName: string
  address: string
  deadline: string
  status: TaskStatus
  completedAt?: string
  inspector: string
  categories: InspectionCategory[]
}
