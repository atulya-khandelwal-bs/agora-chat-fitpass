import axios from 'axios'
import { modal } from '@/utils/modal'

export function useAxiosView() {
    const viewResource = async ({
        endpoint,
        params = {},
        dataKey = 'data',
        onSuccess = null,
        showOffcanvas = null,
        setData = null
    }) => {
        try {
            const response = await axios.get(endpoint, { params })
            
            if (response.data?.success && response.data?.[dataKey]) {
                const data = response.data[dataKey]
                
                // Handle setData - can be a function or a ref
                if (setData) {
                    if (typeof setData === 'function') {
                        setData(data)
                    } else if (setData && 'value' in setData) {
                        // It's a ref - set the value property
                        setData.value = data
                    }
                }
                if (showOffcanvas && 'value' in showOffcanvas) {
                    showOffcanvas.value = true
                }
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess(data)
                }
                
                return { success: true, data }
            } else {
                modal.fire('Error', response.data?.message || 'No data found', 'info')
                return { success: false, error: 'No data found' }
            }
        } catch (error) {
            // Log error for debugging
            console.error('useAxiosView error:', {
                endpoint,
                params,
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                request: error.request
            })
            
            if (error.response) {
                const status = error.response.status
                const errorData = error.response.data
                
                switch (status) {
                    case 401:
                        modal.fire('Unauthorized', 'Please log in to view this resource', 'warning')
                        break
                    case 403:
                        modal.fire('Access Denied', errorData?.message || 'You do not have permission to view this resource', 'error')
                        break
                    case 404:
                        modal.fire('Not Found', errorData?.message || 'Resource not found', 'info')
                        break
                    case 500:
                        modal.fire('Server Error', errorData?.message || errorData?.error || 'An error occurred on the server', 'error')
                        break
                    default:
                        modal.fire('Error', errorData?.message || errorData?.error || 'Failed to load details', 'error')
                }
                
                return { success: false, error: errorData?.message || errorData?.error || 'Request failed', status }
            } else if (error.request) {
                // Request was made but no response received
                modal.fire('Error', 'No response from server. Please check your connection.', 'error')
                return { success: false, error: 'No response from server' }
            } else {
                // Error setting up the request
                modal.fire('Error', error.message || 'Failed to make request', 'error')
                return { success: false, error: error.message || 'Request setup failed' }
            }
        }
    }
    
    return { viewResource }
}

