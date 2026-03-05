export type TaskStatus = 'active' | 'pending' | 'completed'

/** 园区信息（来自 parks.json） */
export interface Park {
  id: number
  name: string
  address: string
  contact?: string
  phone?: string
}

/** 巡检目录：巡检项目名称、描述及子项目内容（与任务无关） */
export interface CatalogCheckItem {
  id: number
  name: string
}

export interface CatalogInspectionCategory {
  id: number
  name: string
  description?: string
  items: CatalogCheckItem[]
}

export interface InspectionCatalog {
  categories: CatalogInspectionCategory[]
}

/** 任务中某子项的填报结果（仅任务数据） */
export interface CheckItemResult {
  status: CheckItemStatus
  remark?: string
  photos?: string[]
  description?: string
  impact?: string
}

/** 任务详情中的建筑：引用目录中的巡检项目，并保存各子项结果 */
export interface TaskDetailBuildingRef {
  id: number
  name: string
  /** 引用的巡检项目 id 列表（来自 inspection-catalog） */
  categoryIds: number[]
  /** 各子项填报结果，key 为子项 id */
  itemResults: Record<string, CheckItemResult>
}

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

/** 园区内单栋建筑，每栋建筑有独立的巡检项目 */
export interface Building {
  id: number
  name: string
  categories: InspectionCategory[]
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
  /** 园区联系人（来自 parks.json） */
  contact?: string
  /** 园区电话（来自 parks.json） */
  phone?: string
  /** 按建筑维度的巡检项；若为空则使用 categories 作为单建筑数据（兼容旧数据） */
  buildings?: Building[]
  /** 兼容：无 buildings 时使用，视为「园区整体」单建筑 */
  categories?: InspectionCategory[]
}

/** 接口/JSON 返回的任务详情：建筑为引用 + 结果，需与巡检目录合并后得到 TaskDetail；园区信息可用 parkId 引用 parks 数据 */
export interface TaskDetailRaw {
  id: number
  /** 园区 ID，存在时从 parks 解析 name/address/contact/phone；否则使用下面对应的字段 */
  parkId?: number
  parkName?: string
  taskName: string
  address?: string
  deadline: string
  status: TaskStatus
  completedAt?: string
  inspector: string
  buildings?: TaskDetailBuildingRef[]
  categories?: InspectionCategory[]
}
