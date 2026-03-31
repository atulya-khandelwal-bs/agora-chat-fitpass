import { formatDateTime } from '@/utils/dateFormatter'

export default {
  key: 'coach-ratings',
  actionsColumnWidth: '50px',
  columns: [
    { 'label-id': 'fitpass_id', 'label-name': 'FITPASS ID', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search FITPASS ID', 'label-width': '180px' },
    { 'label-id': 'user_name', 'label-name': 'Name', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search name...', 'label-width': '180px' },
    { 'label-id': 'user_mobile', 'label-name': 'Mobile No.', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search mobile...', 'label-width': '150px' },
    { 'label-id': 'health_coach_name', 'label-name': 'Coach Name', 'label-type': 'select', 'label-class': 'fs-6', 'label-placeholder': 'Select coach...', 'label-width': '180px' },
    { 'label-id': 'rating', 'label-name': 'Average Rating', 'label-type': 'range-inputs', 'label-class': 'fs-6', 'label-placeholder': 'Rating range', 'label-width': '160px', 'min': 1, 'max': 5, 'step': 0.1 },
    { 'label-id': 'create_time', 'label-name': 'Create Time', 'label-type': 'date-range', 'display-type': 'datetime', 'label-class': 'fs-6', 'label-placeholder': 'Select create time range', 'label-width': '220px' },
    { 'label-id': 'referral_source', 'label-name': 'Source', 'label-type': 'search', 'label-class': 'fs-6', 'label-placeholder': 'Search source...', 'label-width': '130px' }
  ],
  filterMapping: {
    fitpass_id: 'user_search',
    user_name: 'user_search',
    user_mobile: 'user_search',
    health_coach_name: 'health_coach_name',
    rating: 'rating',
    referral_source: 'referral_source',
    create_time: 'create_time'
  },
  actions: [
    { key: 'view', text: 'View', icon: 'ri-eye-line', title: 'View' }
  ],
  details: {
    fields: [
      { key: 'fitpass_id', label: 'FITPASS ID', defaultValue: 'N/A' },
      { key: 'user_name', label: 'Name', defaultValue: 'N/A' },
      { key: 'user_mobile', label: 'Mobile No.', defaultValue: 'N/A' },
      { key: 'health_coach_name', label: 'Health Coach Name', defaultValue: 'N/A' },
      { key: 'rating', label: 'Average Rating', defaultValue: 'N/A' },
      { key: 'referral_source', label: 'Source', defaultValue: 'N/A' },
      { key: 'create_time', label: 'Created', formatter: (v) => formatDateTime(v) || 'N/A', defaultValue: 'N/A' },
      { key: 'user_feedback', label: 'User Feedback', type: 'html', defaultValue: 'N/A' },
      { key: 'remarks', label: 'Remarks', type: 'html', defaultValue: 'N/A' },
      { key: 'rating_tags', label: 'Rating Tags', defaultValue: 'N/A' }
    ],
    formatters: {
      create_time: (v) => formatDateTime(v) || 'N/A',
      user_feedback: (v) => v || 'N/A',
      remarks: (v) => v || 'N/A',
      rating_tags: (v) => {
        if (!v || v === null || v === undefined) return 'N/A'
        
        // Handle string representation of arrays (from database)
        if (typeof v === 'string') {
          // Check if it's an empty array string
          if (v.trim() === '[]' || v.trim() === '') return 'N/A'
          
          // Try to parse as JSON array
          try {
            const parsed = JSON.parse(v)
            if (Array.isArray(parsed)) {
              if (parsed.length === 0) return 'N/A'
              return parsed.join(', ') // Space after comma
            }
          } catch (e) {
            // Not valid JSON - might be format like '[tag1, tag2]' or 'tag1,tag2'
            if (v.trim() === '[]') return 'N/A'
            
            // Try to extract tags from string format like '[tag1, tag2]'
            const match = v.match(/\[(.*?)\]/)
            if (match) {
              const tags = match[1].split(',').map(tag => tag.trim()).filter(tag => tag)
              if (tags.length === 0) return 'N/A'
              return tags.join(', ') // Space after comma
            }
            
            // If it's comma-separated without brackets, split and join with space
            if (v.includes(',')) {
              const tags = v.split(',').map(tag => tag.trim()).filter(tag => tag)
              if (tags.length === 0) return 'N/A'
              return tags.join(', ') // Space after comma
            }
            
            return v
          }
        }
        
        // Handle actual arrays
        if (Array.isArray(v)) {
          if (v.length === 0) return 'N/A'
          return v.join(', ') // Space after comma
        }
        
        return v || 'N/A'
      }
    }
  }
}


