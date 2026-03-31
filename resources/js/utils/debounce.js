/**
 * Creates a debounced function that delays invocation
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null
            if (!immediate) func(...args)
        }
        
        const callNow = immediate && !timeout
        
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
        
        if (callNow) func(...args)
    }
}

/**
 * Creates a debounced function that returns a promise
 * Useful for async operations
 */
export function debounceAsync(func, wait = 300) {
    let timeout
    let resolveFunc
    let rejectFunc
    
    return function executedFunction(...args) {
        return new Promise((resolve, reject) => {
            clearTimeout(timeout)
            
            // Store resolve/reject for later
            resolveFunc = resolve
            rejectFunc = reject
            
            timeout = setTimeout(async () => {
                try {
                    const result = await func(...args)
                    resolveFunc(result)
                } catch (error) {
                    rejectFunc(error)
                }
            }, wait)
        })
    }
}

