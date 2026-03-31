import { formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'health-coach',
  columns: [
    { 'label-id': 'health_coach_name', 'label-name': 'Name', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search name...', 'label-width': '250px' },
    { 'label-id': 'specialist', 'label-name': 'Specialist', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search specialist...', 'label-width': '200px' },
    { 'label-id': 'number_consultations', 'label-name': 'Consultations', 'label-type': 'range-inputs', 'label-class': 'fs-6', 'label-placeholder': 'Consultations range', 'label-width': '120px', 'min': 0, 'max': 10000, 'step': 1 },
    { 'label-id': 'health_experience', 'label-name': 'Experience', 'label-type': 'range-inputs', 'label-class': 'fs-6', 'label-placeholder': 'Experience range', 'label-width': '120px', 'min': 0, 'max': 20, 'step': 1 },
    { 'label-id': 'avg_rating', 'label-name': 'Average Rating', 'label-type': 'range-inputs', 'label-class': 'fs-6', 'label-placeholder': 'Rating range', 'label-width': '120px', 'min': 0, 'max': 5, 'step': 0.1 },
    { 'label-id': 'status', 'label-name': 'Status', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '80px', 'label-align': 'center' },
  ],
  filterMapping: {
    name_search: 'health_coach_name',
    specialist_search: 'specialist',
    status: 'status',
    health_experience: 'health_experience',
    avg_rating: 'avg_rating'
  },
  actions: [
    { key: 'view', text: 'View', icon: 'ri-eye-line', title: 'View' },
    { key: 'edit', text: 'Edit', icon: 'ri-edit-line', title: 'Edit' },
    { key: 'schedule', text: 'Schedules', icon: 'ri-calendar-line', title: 'Schedules', href: (item) => `/health-coach/${item.health_coach_id}/schedules` }
  ],
  details: {
    fields: [
      { key: 'specialist', label: 'Specialist', defaultValue: 'N/A' },
      { key: 'health_experience', label: 'Experience', formatter: (v) => {
          if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return 'N/A'
          return `${v} years`
        }, defaultValue: 'N/A'
      },
      { key: 'avg_rating', label: 'Average Rating', formatter: (v) => {
          if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return 'N/A'
          const n = typeof v === 'string' ? parseFloat(v) : v
          return isNaN(n) ? 'N/A' : n.toFixed(1)
        }, defaultValue: 'N/A'
      },
      { key: 'number_consultations', label: 'Consultations', defaultValue: 'N/A' },
      { key: 'about_us', label: 'About', type: 'html', defaultValue: 'N/A' },
      { key: 'create_time', label: 'Created', formatter: (v) => formatDateTime(v) || 'N/A', defaultValue: 'N/A' },
      { key: 'update_time', label: 'Updated', formatter: (v) => formatDateTime(v, 'NA'), defaultValue: 'NA' }
    ],
    formatters: {
      create_time: (v) => formatDateTime(v) || 'N/A',
      update_time: (v) => formatDateTime(v, 'NA')
    }
  }
}

