import { formatDate, formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'diets',
  actionsColumnWidth: '120px',
  showActionsColumn: true,
  rowspanColumns: [
    'reference_id',
    'fitpass_id',
    'name',
    'date_of_diet',
    'diet_given_by',
    'status_bool',
    'deleted_bool'
  ],
  columns: [
    { 'label-id': 'reference_id', 'label-name': 'Reference ID', 'label-type': 'text', 'label-class': 'fs-6', 'label-width': '140px' , 'label-placeholder': 'Search..'},
    { 'label-id': 'fitpass_id', 'label-name': 'FITPASS ID', 'label-type': 'text', 'label-class': 'fs-6', 'label-width': '140px' },
    { 'label-id': 'name', 'label-name': 'Name', 'label-type': 'text', 'label-class': 'fs-6', 'label-width': '180px' },
    { 'label-id': 'date_of_diet', 'label-name': 'Diet start date', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date range', 'label-width': '180px' },
    { 'label-id': 'diet_given_by', 'label-name': 'Diet Given By', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search coach', 'label-width': '150px' },
    { 'label-id': 'status_bool', 'label-name': 'Status', 'label-type': 'select', 'badge-width': 'w-90', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '100px' },
    { 'label-id': 'deleted_bool', 'label-name': 'Deleted', 'label-type': 'select', 'badge-width': 'w-90', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '100px' }
  ],
  filterMapping: {
    reference_id: 'reference_id',
    fitpass_id: 'fitpass_id',
    name: 'name',
    food_preference: 'food_preference',
    gender: 'gender',
    diet_given_by: 'diet_given_by',
    date_of_diet: 'diet_date_range',
    status_bool: 'status_bool',
    deleted_bool: 'deleted_bool'
  },
  actions: [],
  actions: [
    { key: 'edit', text: 'Edit', icon: 'ri-edit-line', title: 'Edit' },
    { key: 'reassign', text: 'Reassign', icon: 'ri-repeat-line', title: 'Reassign to Current User' }
  ],
  details: {
    fields: [
      { key: 'reference_id', label: 'Reference ID' },
      { key: 'name', label: 'Name' },
      { key: 'food_preference', label: 'Food Preference' },
      { key: 'gender', label: 'Gender' },
      { key: 'date_of_diet', label: 'Diet date', formatter: (v) => v ? formatDate(v) : '-' },
      { key: 'diet_given_by', label: 'Diet Given By' },
      { key: 'status_bool', label: 'Status' },
      { key: 'deleted_bool', label: 'Deleted' },
      { key: 'remarks', label: 'Remarks', showIf: 'remarks' },
      { key: 'user_meal_note', label: 'Meal Note', showIf: 'user_meal_note' }
    ],
    formatters: {
      date_of_diet: (v) => v ? formatDate(v) : '-'
    }
  }
}


