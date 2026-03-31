/**
 * Generic Date Formatting Utilities
 * Provides reusable date formatting functions across the application
 */

/**
 * Format a date string to a user-friendly date format
 * @param {string|Date} dateString - The date to format
 * @param {string} fallback - Fallback text when date is invalid (default: '-')
 * @returns {string} Formatted date string (e.g., "14 Nov 2024")
 */
export const formatDate = (dateString, fallback = '-') => {
    if (!dateString) return fallback
    
    try {
        const date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return fallback
        }
        
        // Format as "14 Nov 2024" (date first, then month)
        const day = date.getDate()
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        const year = date.getFullYear()
        return `${day} ${month} ${year}`
    } catch (error) {
        return fallback
    }
}

/**
 * Format a date string to a user-friendly date and time format
 * @param {string|Date} dateString - The date to format
 * @param {string} fallback - Fallback text when date is invalid (default: '-')
 * @returns {string} Formatted date and time string (e.g., "14 Nov 2024, 2:30 PM")
 */
export const formatDateTime = (dateString, fallback = '-') => {
    if (!dateString) return fallback
    
    try {
        const date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return fallback
        }
        
        // Format as "14 Nov 2024, 2:30 PM" (date first, then month)
        const day = date.getDate()
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        const year = date.getFullYear()
        const time = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
        return `${day} ${month} ${year}, ${time}`
    } catch (error) {
        return fallback
    }
}

/**
 * Format a date string to a short date format
 * @param {string|Date} dateString - The date to format
 * @param {string} fallback - Fallback text when date is invalid (default: '-')
 * @returns {string} Formatted short date string (e.g., "01/15/2024")
 */
export const formatShortDate = (dateString, fallback = '-') => {
    if (!dateString) return fallback
    
    try {
        const date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return fallback
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    } catch (error) {
        return fallback
    }
}

/**
 * Format a date string to a long date format
 * @param {string|Date} dateString - The date to format
 * @param {string} fallback - Fallback text when date is invalid (default: '-')
 * @returns {string} Formatted long date string (e.g., "January 15, 2024")
 */
export const formatLongDate = (dateString, fallback = '-') => {
    if (!dateString) return fallback
    
    try {
        const date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return fallback
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    } catch (error) {
        return fallback
    }
}

/**
 * Format a date string to a relative time format
 * @param {string|Date} dateString - The date to format
 * @param {string} fallback - Fallback text when date is invalid (default: '-')
 * @returns {string} Formatted relative time string (e.g., "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (dateString, fallback = '-') => {
    if (!dateString) return fallback
    
    try {
        const date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return fallback
        }
        
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)
        
        if (diffInSeconds < 60) {
            return 'Just now'
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60)
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600)
            return `${hours} hour${hours > 1 ? 's' : ''} ago`
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400)
            return `${days} day${days > 1 ? 's' : ''} ago`
        } else {
            return formatDate(dateString, fallback)
        }
    } catch (error) {
        return fallback
    }
}

/**
 * Check if a date string is valid
 * @param {string|Date} dateString - The date to validate
 * @returns {boolean} True if date is valid, false otherwise
 */
export const isValidDate = (dateString) => {
    if (!dateString) return false
    
    try {
        const date = new Date(dateString)
        return !isNaN(date.getTime())
    } catch (error) {
        return false
    }
}

/**
 * Get the default date formatting functions for easy importing
 */
export default {
    formatDate,
    formatDateTime,
    formatShortDate,
    formatLongDate,
    formatRelativeTime,
    isValidDate
}
