import { ref, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'

/**
 * Composable for handling navigation loading states
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to enable loading states (default: true)
 * @param {boolean} options.initialState - Initial loading state (default: false)
 * @returns {Object} - Loading state and utilities
 */
export function useNavigationLoading(options = {}) {
  const { enabled = true, initialState = false } = options
  
  const isLoading = ref(initialState)
  
  const setupNavigationListeners = () => {
    if (!enabled) return
    
    // Listen for Inertia navigation events
    router.on('start', () => {
      isLoading.value = true
    })
    
    router.on('finish', () => {
      isLoading.value = false
    })
  }
  
  const cleanupNavigationListeners = () => {
    if (!enabled) return
    
    // Clean up listeners if needed
    router.off('start')
    router.off('finish')
  }
  
  // Auto-setup on mount
  onMounted(() => {
    isLoading.value = false
    setupNavigationListeners()
  })
  
  return {
    isLoading,
    setupNavigationListeners,
    cleanupNavigationListeners
  }
}
