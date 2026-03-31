import { formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'call-schedule',
  actionsColumnWidth: '100px',
  columns: [
    { 'label-id': 'fitpass_id', 'label-name': 'FITPASS ID', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search FITPASS ID', 'label-width': '180px' },
    { 'label-id': 'user_name', 'label-name': 'Name', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search name...', 'label-width': '180px' },
    { 'label-id': 'user_mobile', 'label-name': 'Mobile No.', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search..', 'label-width': '120px' },
    { 'label-id': 'call_datetime', 'label-name': 'Calling Time', 'label-type': 'date-range', 'display-type': 'datetime', 'label-class': 'fs-6', 'label-placeholder': 'Select date range', 'label-width': '180px' },
    { 'label-id': 'call_status', 'label-name': 'Call Status', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select status', 'label-width': '120px' },
    { 'label-id': 'health_coach_name', 'label-name': 'Coach Name', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select coach', 'label-width': '220px' },
    { 'label-id': 'call_source', 'label-name': 'Schedule Source', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select source', 'label-width': '160px' },
    { 'label-id': 'create_time', 'label-name': 'Create Time', 'label-type': 'date-range', 'display-type': 'datetime', 'label-class': 'fs-6', 'label-placeholder': 'Select date range', 'label-width': '180px' },
    { 'label-id': 'updated_by', 'label-name': 'Updated By', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select updated by', 'label-width': '160px' }
  ],
  filterMapping: {
    fitpass_id: 'user_search',
    user_name: 'user_search',
    user_mobile: 'user_search',
    health_coach_name: 'health_coach_name',
    call_status: 'call_status',
    call_source: 'call_source',
    updated_by: 'updated_by',
    call_datetime: 'call_datetime',
    create_time: 'create_time'
  },
  actions: [
    { key: 'view', text: 'View', icon: 'ri-eye-line', title: 'View' }
  ],
  details: {
    fields: [
      { key: 'fitpass_id', label: 'FITPASS ID' },
      { key: 'user_name', label: 'User Name' },
      { key: 'user_mobile', label: 'Mobile Number' },
      { key: 'call_datetime', label: 'Scheduled Call Time', formatter: (v) => formatDateTime(v) },
      { key: 'call_status_label', label: 'Call Status' },
      { key: 'health_coach_name', label: 'Health Coach' },
      { key: 'call_source', label: 'Schedule Source' },
      { key: 'call_type_label', label: 'Call Type' },
      { key: 'user_type_label', label: 'User Type' },
      { key: 'call_purpose', label: 'Call Purpose', showIf: 'call_purpose' },
      { key: 'internal_remarks', label: 'Internal Remarks', showIf: 'internal_remarks' },
      { key: 'customer_remarks', label: 'Customer Remarks', showIf: 'customer_remarks' },
      { key: 'notification_sent_status', label: 'Notification Status', formatter: (v) => v === 1 ? 'Sent' : v === 0 ? 'Not Sent' : 'Unknown' },
      { key: 'trigger_schedule_id', label: 'Trigger Schedule ID', showIf: 'trigger_schedule_id' },
      { key: 'third_party_user_id', label: 'Third Party User ID', showIf: 'third_party_user_id' },
      { key: 'call_completed_time', label: 'Call Completed Time', formatter: (v) => formatDateTime(v, 'NA'), showIf: 'call_completed_time' },
      { key: 'call_cancel_time', label: 'Call Cancelled Time', formatter: (v) => formatDateTime(v, 'NA'), showIf: 'call_cancel_time' },
      { key: 'call_cancel_by', label: 'Cancelled By', showIf: 'call_cancel_by' },
      { key: 'create_time', label: 'Created At', formatter: (v) => formatDateTime(v) },
      { key: 'created_by', label: 'Created By' },
      { key: 'update_time', label: 'Last Updated', formatter: (v) => v ? formatDateTime(v) : '-', showIf: 'update_time' },
      { key: 'updated_by', label: 'Updated By', showIf: 'updated_by' }
    ],
    formatters: {
      call_datetime: (v) => formatDateTime(v),
      create_time: (v) => formatDateTime(v),
      update_time: (v) => v ? formatDateTime(v) : '-',
      call_cancel_time: (v) => formatDateTime(v, 'NA'),
      call_completed_time: (v) => formatDateTime(v, 'NA'),
      notification_sent_status: (v) => v === 1 ? 'Sent' : v === 0 ? 'Not Sent' : 'Unknown'
    }
  }
}

