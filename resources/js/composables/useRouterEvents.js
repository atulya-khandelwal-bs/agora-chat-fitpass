import { onMounted, onBeforeUnmount } from 'vue'
import { router } from '@inertiajs/vue3'

/**
 * Composable for managing Inertia router event listeners with automatic cleanup
 * 
 * @param {Object} handlers - Object mapping event names to handler functions
 * @returns {Object} - Object with cleanup function and current listeners
 * 
 * @example
 * const { cleanup } = useRouterEvents({
 *   start: () => isLoading.value = true,
 *   finish: () => isLoading.value = false,
 *   error: (errors) => console.error(errors)
 * })
 */
export function useRouterEvents(handlers = {}) {
    const removers = []
    
    onMounted(() => {
        Object.entries(handlers).forEach(([event, handler]) => {
            if (typeof handler === 'function') {
                // Type assertion for router events (start, finish, progress, error, success, etc.)
                // @ts-ignore - router.on accepts string event names dynamically
                const remove = router.on(event, handler)
                removers.push(remove)
            }
        })
    })
    
    const cleanup = () => {
        removers.forEach(remove => {
            if (typeof remove === 'function') {
                remove()
            }
        })
        removers.length = 0
    }
    
    onBeforeUnmount(() => {
        cleanup()
    })
    
    return {
        cleanup,
        removers
    }
}

