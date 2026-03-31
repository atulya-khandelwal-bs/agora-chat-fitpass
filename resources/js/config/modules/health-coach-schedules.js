import { formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'health-coach-schedules',
  actionsColumnWidth: '20px',
  columns: [
    { 'label-id': 'start_time', 'label-name': 'Start Time', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search time...', 'label-width': '100px' },
    { 'label-id': 'schedule_days', 'label-name': 'Days', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search days...', 'label-width': '200px' },
    { 'label-id': 'status', 'label-name': 'Status', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '60px', 'label-align': 'center' },
  ],
  filterMapping: {
    time_search: 'start_time',
    days_search: 'schedule_days',
    status: 'status'
  },
  actions: [
    { key: 'edit', text: 'Edit', icon: 'ri-edit-line', title: 'Edit', href: (item) => `/health-coach/${item.health_coach_id}/schedules/${item.health_coach_schedule_id}/edit` }
  ],
  details: {
    fields: [
      { key: 'start_time', label: 'Start Time', defaultValue: 'N/A' },
      { key: 'schedule_days', label: 'Days', defaultValue: 'N/A' },
      { key: 'status', label: 'Status', defaultValue: 'N/A' },
      { key: 'create_time', label: 'Created', formatter: (v) => formatDateTime(v) || 'N/A', defaultValue: 'N/A' },
      { key: 'update_time', label: 'Updated', formatter: (v) => formatDateTime(v, 'NA'), defaultValue: 'NA' }
    ],
    formatters: {
      create_time: (v) => formatDateTime(v) || 'N/A',
      update_time: (v) => formatDateTime(v, 'NA')
    }
  }
}

