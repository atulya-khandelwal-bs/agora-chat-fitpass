import { router } from '@inertiajs/vue3'

/**
 * Creates a router.get wrapper that preserves query parameters
 * @param {Object} preserveParams - Object with params to preserve
 * @returns {Function} - Wrapped router.get function
 */
export function createPreserveParamsRouter(preserveParams = {}) {
    return (url, data = {}, options = {}) => {
        const mergedData = { ...preserveParams, ...data }
        return router.get(url, mergedData, options)
    }
}

/**
 * Preserves current URL query params when navigating
 * @param {Function} action - Action function that receives wrapped router
 */
export function withPreservedParams(action) {
    const currentParams = new URLSearchParams(window.location.search)
    const preservedParams = {}
    
    currentParams.forEach((value, key) => {
        preservedParams[key] = value
    })
    
    const wrappedRouter = {
        ...router,
        get: createPreserveParamsRouter(preservedParams),
        visit: (url, options = {}) => {
            if (typeof url === 'string') {
                const urlObj = new URL(url, window.location.origin)
                Object.entries(preservedParams).forEach(([key, value]) => {
                    if (!urlObj.searchParams.has(key)) {
                        urlObj.searchParams.set(key, value)
                    }
                })
                url = urlObj.pathname + urlObj.search
            }
            return router.visit(url, options)
        }
    }
    
    return action(wrappedRouter)
}

