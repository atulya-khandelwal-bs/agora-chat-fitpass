/**
 * useOffcanvasView - Composable for managing offcanvas view state globally
 * 
 * This composable provides a consistent way to handle offcanvas views across all listing pages.
 * It automatically closes the offcanvas when filters are cleared by checking for the 'view' parameter in the URL.
 * 
 * Usage:
 * ```javascript
 * const { showViewOffcanvas, closeOffcanvas } = useOffcanvasView({
 *   viewId: () => props.viewId,
 *   viewData: () => props.thirdPartyUserToView,
 *   onClose: () => { thirdPartyUserToView.value = null }
 * })
 * ```
 */

import { ref, watch, computed } from 'vue'

export function useOffcanvasView(options = {}) {
    const {
        viewId = () => null,
        viewData = () => null,
        onClose = () => {}
    } = options

    const showViewOffcanvas = ref(false)
    const viewItem = ref(null)

    // Check if view parameter exists in URL
    const hasViewParam = () => {
        if (typeof window === 'undefined') return false
        try {
            return new URL(window.location.href).searchParams.has('view')
        } catch {
            return false
        }
    }

    // Watch for viewId changes
    watch(viewId, (newViewId) => {
        const hasView = hasViewParam()
        const data = viewData()
        
        // Only open offcanvas if we have viewId, valid data, AND view parameter in URL
        if (newViewId && data && hasView) {
            viewItem.value = data
            showViewOffcanvas.value = true
        } else {
            // If no view param or invalid data, close offcanvas
            showViewOffcanvas.value = false
            if (!newViewId) {
                viewItem.value = null
                onClose()
            }
        }
    }, { immediate: true })

    // Watch for viewData changes
    watch(viewData, (newData) => {
        const hasView = hasViewParam()
        const id = viewId()
        
        // Only open offcanvas if we have valid data AND view parameter in URL
        if (newData && typeof newData === 'object' && Object.keys(newData).length > 0 && hasView) {
            viewItem.value = newData
            showViewOffcanvas.value = true
        } else {
            // If no view param or invalid data, close offcanvas
            showViewOffcanvas.value = false
            if (!newData) {
                viewItem.value = null
                onClose()
            }
        }
    }, { immediate: true })

    // Watch for URL changes (when view param is removed)
    if (typeof window !== 'undefined') {
        const checkViewParam = () => {
            if (!hasViewParam() && showViewOffcanvas.value) {
                showViewOffcanvas.value = false
                viewItem.value = null
                onClose()
            }
        }
        
        // Check on URL changes
        window.addEventListener('popstate', checkViewParam)
        
        // Also check periodically (in case URL is changed programmatically)
        const intervalId = setInterval(checkViewParam, 100)
        
        // Cleanup on unmount would be handled by the component
    }

    const closeOffcanvas = () => {
        showViewOffcanvas.value = false
        viewItem.value = null
        onClose()
    }

    return {
        showViewOffcanvas,
        viewItem,
        closeOffcanvas
    }
}

