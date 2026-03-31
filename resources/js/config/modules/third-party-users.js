import { formatDate, formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'third-party-users',
  actionsColumnWidth: '80px',
  columns: [
    { 'label-id': 'fitpass_id', 'label-name': 'FITPASS ID', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '140px' },
    { 'label-id': 'corporate_name', 'label-name': 'Corporate Name', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'All corporates', 'label-width': '180px' },
    { 'label-id': 'benefit_number', 'label-name': 'Benefit Number', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '250px' },
    { 'label-id': 'third_party_user_id', 'label-name': 'Third Party User ID', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '280px' },
    { 'label-id': 'product_sku', 'label-name': 'Product SKU', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '150px' },
    { 'label-id': 'benefit_start_date', 'label-name': 'Benefit Start Date', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date range', 'label-width': '120px' },
    { 'label-id': 'benefit_end_date', 'label-name': 'Benefit End Date', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date range', 'label-width': '120px' },
    { 'label-id': 'coupon_code', 'label-name': 'Coupon Code', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '120px' },
    { 'label-id': 'status', 'label-name': 'Status', 'label-type': 'select', 'display-type': 'badge', 'badge-width': 'w-90', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '120px' },
    { 'label-id': 'create_time', 'label-name': 'Create Time', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date range', 'label-width': '120px' }
  ],
  filterMapping: {
    fitpass_id: 'fitpass_id_search',
    corporate_name: 'corporate_name_search',
    benefit_number: 'benefit_number_search',
    third_party_user_id: 'third_party_user_id_search',
    product_sku: 'product_sku_search',
    coupon_code: 'coupon_code_search',
    status: 'status',
    benefit_start_date: 'benefit_start_date',
    benefit_end_date: 'benefit_end_date',
    create_time: 'create_time'
  },
  actions: [
    { key: 'view', text: 'View', icon: 'ri-eye-line', title: 'View' }
  ],
  displayRules: {
    status: {
      'Inactive': { type: 'badge', variant: 'danger', text: 'Inactive' },
      'Active': { type: 'badge', variant: 'success', text: 'Active' }
    }
  },
  details: {
    fields: [
      { key: 'fitpass_id', label: 'FITPASS ID', showIf: 'fitpass_id' },
      { key: 'corporate_name', label: 'Corporate Name', showIf: 'corporate_name' },
      { key: 'benefit_number', label: 'Benefit Number', showIf: 'benefit_number' },
      { key: 'third_party_user_id', label: 'Third Party User ID', showIf: 'third_party_user_id' },
      { key: 'product_sku', label: 'Product SKU', showIf: 'product_sku' },
      { key: 'benefit_start_date', label: 'Benefit Start Date', formatter: (v) => formatDate(v) },
      { key: 'benefit_end_date', label: 'Benefit End Date', formatter: (v) => formatDate(v) },
      { key: 'coupon_code', label: 'Coupon Code', showIf: 'coupon_code' },
      { key: 'status_label', label: 'Status', showIf: 'status_label' },
      { key: 'created_by', label: 'Created By', showIf: 'created_by' },
      { key: 'create_time', label: 'Created', formatter: (v) => formatDateTime(v) },
      { key: 'updated_by', label: 'Updated By', showIf: 'updated_by' },
      { key: 'update_time', label: 'Updated', formatter: (v) => formatDateTime(v) }
    ],
    formatters: {
      benefit_start_date: (v) => formatDate(v),
      benefit_end_date: (v) => formatDate(v),
      create_time: (v) => formatDateTime(v),
      update_time: (v) => formatDateTime(v)
    }
  }
}

