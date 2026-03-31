/**
 * Application-wide constants
 * 
 * These constants can be easily changed to update values throughout the entire project
 */

/**
 * Display value for empty/null/undefined data in grid views and components
 * Currently set to 'N/A' but can be changed to any value (e.g., '-', '—', 'Not Available', etc.)
 */
export const EMPTY_VALUE_DISPLAY = 'N/A'

/**
 * Check if a value is empty (null, undefined, or empty string)
 * @param {*} value - The value to check
 * @returns {boolean} True if value is null, undefined, or empty string
 */
export const isEmptyValue = (value) => {
    return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')
}

