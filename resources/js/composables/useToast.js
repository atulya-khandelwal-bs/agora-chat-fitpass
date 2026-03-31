/**
 * useToast - Composable for showing toast notifications
 * 
 * Usage:
 * import { useToast } from '@/Composables/useToast'
 * 
 * const toast = useToast()
 * toast.success('Operation completed successfully!')
 * toast.error('Something went wrong!')
 * 
 * @returns {Object} - Toast methods
 */
export function useToast() {
    /**
     * Show a toast notification
     * @param {string} type - 'success' or 'error'
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds (0 = no auto-close)
     */
    const showToast = (type, message, duration = 3000, options = {}) => {
        if (typeof duration === 'object' && duration !== null) {
            options = duration
            duration = 3000
        }
        const event = new CustomEvent('show-toast', {
            detail: {
                type,
                message,
                duration,
                ...options
            }
        })
        window.dispatchEvent(event)
    }

    /**
     * Show a success toast (green)
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     */
    const success = (message, duration = 3000, options = {}) => {
        if (typeof duration === 'object' && duration !== null) {
            options = duration
            duration = 3000
        }
        showToast('success', message, duration, options)
    }

    /**
     * Show an error toast (red)
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     */
    const error = (message, duration = 3000, options = {}) => {
        if (typeof duration === 'object' && duration !== null) {
            options = duration
            duration = 3000
        }
        showToast('error', message, duration, options)
    }

    return {
        showToast,
        success,
        error
    }
}
