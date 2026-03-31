import { formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'fitpass-users',
  actionsColumnWidth: '80px',
  columns: [
    { 'label-id': 'fitpass_id', 'label-name': 'FITPASS ID', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '170px' },
    { 'label-id': 'user_name', 'label-name': 'Name', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search name...', 'label-width': '200px' },
    { 'label-id': 'user_mobile', 'label-name': 'Mobile No.', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '150px' },
    { 'label-id': 'deletion_status', 'label-name': 'Status', 'label-type': 'select', 'display-type': 'badge', 'badge-width': 'w-90', 'label-class': 'fs-6', 'label-placeholder': 'All', 'label-width': '120px' },
    { 'label-id': 'membership_end_date', 'label-name': 'Membership End', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date', 'label-width': '200px' },
    { 'label-id': 'healthcoach_name', 'label-name': 'Coach Name', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select coach', 'label-width': '200px', clickable: true },
    { 'label-id': 'last_followup', 'label-name': 'Last Followup', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date', 'label-width': '200px' },
    { 'label-id': 'next_followup', 'label-name': 'Next Followup', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date', 'label-width': '200px' },
    { 'label-id': 'diet_till_date', 'label-name': 'Diet Till Date', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date', 'label-width': '200px' },
    { 'label-id': 'source', 'label-name': 'Source', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search...', 'label-width': '150px' },
    { 'label-id': 'corporate_name', 'label-name': 'Corporate Name', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'All corporates', 'label-width': '200px' },
    { 'label-id': 'create_time', 'label-name': 'Create Time', 'label-type': 'date-range', 'display-type': 'date', 'label-class': 'fs-6', 'label-placeholder': 'Select date', 'label-width': '200px' }
  ],
  filterMapping: {
    name_search: 'user_name',
    mobile_search: 'user_mobile',
    email_search: 'user_email',
    fitpass_id_search: 'fitpass_id',
    user_type: 'user_type',
    is_email_verify: 'is_email_verify',
    is_mobile_verified: 'is_mobile_verified',
    is_deleted: 'is_deleted',
    deletion_status: 'is_deleted',
    source_search: 'register_referral_source',
    state_search: 'state_name',
    last_seen: 'last_seen',
    create_time: 'create_time',
    assigned_date: 'assigned_date',
    diet_till_date: 'diet_till_date',
    last_followup: 'last_followup',
    next_followup: 'next_followup',
    membership_end_date: 'membership_end_date',
    healthcoach_name: 'healthcoach_name',
    corporate_name_search: 'corporate_name'
  },
  actions: [
    { key: 'assign', text: 'Assign Diet', icon: 'ri-file-add-line', title: 'Assign Diet' }
  ],
  displayRules: {
    deletion_status: {
      'Active': { type: 'badge', variant: 'success', text: 'Active' },
      'Deleted': { type: 'badge', variant: 'danger', text: 'Deleted' }
    }
  },
  details: {
    fields: [
      { key: 'fitpass_id', label: 'FITPASS ID', showIf: 'fitpass_id' },
      { key: 'user_name', label: 'Name', showIf: 'user_name' },
      { key: 'formatted_mobile', label: 'Mobile Number', showIf: 'formatted_mobile' },
      { key: 'user_email', label: 'Email', showIf: 'user_email' },
      { key: 'user_type_label', label: 'User Type', showIf: 'user_type_label' },
      { key: 'email_verification_status', label: 'Email Verification', showIf: 'email_verification_status' },
      { key: 'mobile_verification_status', label: 'Mobile Verification', showIf: 'mobile_verification_status' },
      { key: 'source', label: 'Source', showIf: 'source' },
      { key: 'state_name', label: 'State', showIf: 'state_name' },
      { key: 'healthcoach_name', label: 'Health Coach', showIf: 'healthcoach_name' },
      { key: 'register_pin_code', label: 'PIN Code', showIf: 'register_pin_code' },
      { key: 'last_seen', label: 'Last Seen', formatter: (v) => formatDateTime(v) },
      { key: 'create_time', label: 'Created', formatter: (v) => formatDateTime(v) },
      { key: 'update_time', label: 'Updated', formatter: (v) => formatDateTime(v) }
    ],
    formatters: {
      last_seen: (v) => formatDateTime(v),
      create_time: (v) => formatDateTime(v),
      update_time: (v) => formatDateTime(v)
    }
  }
}


