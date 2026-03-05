import type {
  TaskListData,
  TaskDetail,
  TaskDetailRaw,
  TaskDetailBuildingRef,
  Building,
  InspectionCategory,
  CheckItem,
  CheckItemResult,
  InspectionCatalog,
  Park,
} from '../types/task'
import mockData from '../mock/tasks.json'
import mockDetailData from '../mock/task-detail.json'
import catalogData from '../mock/inspection-catalog.json'
import parksData from '../mock/parks.json'

const catalog = catalogData as InspectionCatalog
const parks = (parksData as { parks: Park[] }).parks
const parkById = new Map(parks.map((p) => [p.id, p]))

const categoryById = new Map(
  catalog.categories.map((c) => [c.id, c]),
)

function mergeBuildingRef(ref: TaskDetailBuildingRef): Building {
  const categories: InspectionCategory[] = ref.categoryIds
    .map((id) => categoryById.get(id))
    .filter(Boolean)
    .map((cat) => {
      const items: CheckItem[] = cat!.items.map((item) => {
        const result: CheckItemResult | undefined = ref.itemResults[String(item.id)]
        return {
          id: item.id,
          name: item.name,
          status: result?.status ?? 'unchecked',
          remark: result?.remark,
          photos: result?.photos,
          description: result?.description,
          impact: result?.impact,
        }
      })
      return {
        id: cat!.id,
        name: cat!.name,
        description: cat!.description,
        items,
      }
    })
  return {
    id: ref.id,
    name: ref.name,
    categories,
  }
}

function resolveTaskDetail(raw: TaskDetailRaw): TaskDetail {
  const park = raw.parkId != null ? parkById.get(raw.parkId) : null
  const base = {
    id: raw.id,
    parkName: park?.name ?? raw.parkName ?? '',
    taskName: raw.taskName,
    address: park?.address ?? raw.address ?? '',
    deadline: raw.deadline,
    status: raw.status,
    completedAt: raw.completedAt,
    inspector: raw.inspector,
    contact: park?.contact,
    phone: park?.phone,
  }
  if (raw.buildings?.length) {
    return {
      ...base,
      buildings: raw.buildings.map(mergeBuildingRef),
    }
  }
  if (raw.categories?.length) {
    return {
      ...base,
      categories: raw.categories,
    }
  }
  return { ...base, buildings: [] }
}

/**
 * TODO: 替换为真实接口调用，如 `fetch('/api/tasks').then(r => r.json())`
 */
export async function fetchTaskList(): Promise<TaskListData> {
  return mockData as TaskListData
}

export async function fetchTaskDetail(id: number): Promise<TaskDetail | null> {
  const record = mockDetailData as unknown as Record<string, TaskDetailRaw>
  const raw = record[String(id)] ?? null
  if (!raw) return null
  return resolveTaskDetail(raw)
}
