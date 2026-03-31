import { onBeforeUnmount } from 'vue'

/**
 * Creates a cancellable request wrapper
 */
export class RequestCanceller {
    constructor() {
        this.cancelled = false
        this.abortController = null
    }
    
    cancel() {
        this.cancelled = true
        if (this.abortController) {
            this.abortController.abort()
        }
    }
    
    reset() {
        this.cancelled = false
        this.abortController = new AbortController()
        return this.abortController.signal
    }
    
    isCancelled() {
        return this.cancelled
    }
}

/**
 * Composable for managing request cancellation
 */
export function useRequestCancellation() {
    const canceller = new RequestCanceller()
    
    onBeforeUnmount(() => {
        canceller.cancel()
    })
    
    return {
        canceller,
        cancel: () => canceller.cancel(),
        reset: () => canceller.reset(),
        isCancelled: () => canceller.isCancelled()
    }
}

