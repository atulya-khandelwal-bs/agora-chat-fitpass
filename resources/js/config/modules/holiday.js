import { formatDate, formatDateTime } from '@/utils/dateFormatter'

const formatHolidayStatus = (value) => {
  if (value === null || value === undefined) return 'Pending'
  const numeric = Number(value)
  if (!Number.isNaN(numeric)) {
    if (numeric === 2) return 'Approved'
    if (numeric === 3) return 'Rejected'
    return 'Pending'
  }
  const text = String(value).toLowerCase()
  if (text.includes('approv')) return 'Approved'
  if (text.includes('reject')) return 'Rejected'
  if (text.includes('pend')) return 'Pending'
  return 'Pending'
}

export default {
  key: 'holiday',
  actionsColumnWidth: '100px',
  columns: [
    { 'label-id': 'status', 'label-name': 'Status', 'label-type': 'select', 'display-type': 'badge', 'badge-width': 'w-110', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '140px' },
    { 'label-id': 'title', 'label-name': 'Title', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search..', 'label-width': '280px' },
    { 'label-id': 'start_date', 'label-name': 'Start Date', 'label-type': 'date', 'display-type': 'datetime-display', 'enable-time': true, 'label-class': 'fs-6', 'label-placeholder': 'Select start date & time', 'label-width': '200px' },
    { 'label-id': 'end_date', 'label-name': 'End Date', 'label-type': 'date', 'display-type': 'datetime-display', 'enable-time': true, 'label-class': 'fs-6', 'label-placeholder': 'Select end date & time', 'label-width': '200px' },
    { 'label-id': 'healthcoach_name', 'label-name': 'Coach Name', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select coach...', 'label-width': '180px' },
    { 'label-id': 'create_time', 'label-name': 'Create Time', 'label-type': 'date-range', 'display-type': 'datetime-display', 'enable-time': true, 'label-class': 'fs-6', 'label-placeholder': 'Select create time range', 'label-width': '220px' },
    { 'label-id': 'created_by', 'label-name': 'Created By', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select name...', 'label-width': '170px' },
    { 'label-id': 'approved_by', 'label-name': 'Updated By', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select name...', 'label-width': '170px' },
    { 'label-id': 'public_holiday', 'label-name': 'Type', 'label-type': 'select', 'badge-width': 'w-90', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '120px' },
    
  ],
  filterMapping: {
    title: 'search',
    healthcoach_name: 'healthcoach_name',
    start_date: 'date_from',
    end_date: 'date_to',
    public_holiday: 'public_holiday',
    status: 'status',
    create_time: 'create_time',
    created_by: 'created_by',
    approved_by: 'approved_by'
  },
  actions: [
    { key: 'view', text: 'View', icon: 'ri-eye-line', title: 'View' },
    { key: 'edit', text: 'Edit', icon: 'ri-edit-line', title: 'Edit' }
  ],
  tooltipOverrides: {
    healthcoach_name: { field: 'healthcoach_name_tooltip' }
  },
  displayRules: {
    status: {
      1: { type: 'badge', variant: 'warning', text: 'Pending' },
      2: { type: 'badge', variant: 'success', text: 'Approved' },
      3: { type: 'badge', variant: 'danger', text: 'Rejected' }
    },
    public_holiday: {
      2: { type: 'badge', variant: 'primary', text: 'Public' },
      1: { type: 'badge', variant: 'info', text: 'Personal' }
    }
  },
  details: {
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'public_holiday', label: 'Type', formatter: (v) => v === 2 ? 'Public Holiday' : 'Personal Holiday' },
      { key: 'status', label: 'Status', formatter: (v) => formatHolidayStatus(v) },
      { key: 'start_date', label: 'Start Date', formatter: (v) => formatDateTime(v) },
      { key: 'end_date', label: 'End Date', formatter: (v) => formatDateTime(v) },
      { key: 'comma_healthcoach_names', label: 'Health Coach Names', defaultValue: 'Not assigned' },
      { key: 'description', label: 'Description', type: 'html', showIf: 'description' },
      { key: 'app_display_message', label: 'App Display Message', type: 'html', showIf: 'app_display_message' },
      // { key: 'remarks', label: 'Remarks', type: 'html', showIf: 'remarks' },
      { key: 'created_by', label: 'Created By', defaultValue: 'Unknown' },
      { key: 'create_time', label: 'Created At', formatter: (v) => formatDateTime(v) },
      { key: 'updated_by', label: 'Updated By', defaultValue: 'NA' },
      { key: 'update_time', label: 'Updated At', formatter: (v) => v ? formatDateTime(v) : 'NA' },
      // Removed: Holiday Group ID, Related Entries, Team Member, Team Member Email,
      // Assigned Health Coach, Health Coach Specialty, Health Coach About
    ],
    formatters: {
      start_date: (v) => formatDateTime(v),
      end_date: (v) => formatDateTime(v),
      create_time: (v) => formatDateTime(v),
      update_time: (v) => v ? formatDateTime(v) : 'NA',
      public_holiday: (v) => v === 2 ? 'Public Holiday' : 'Personal Holiday',
      status: (v) => formatHolidayStatus(v),
      related_count: (value) => `${value} entry${value !== 1 ? 'ies' : ''}`
    }
  }
}
