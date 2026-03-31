import axios from 'axios'
import { modal } from '@/utils/modal'

/**
 * Composable for checking diet reassign/transfer protocol
 * Ensures users have 7 or fewer upcoming diet dates before reassignment/transfer
 */
export function useDietReassignProtocol() {
    /**
     * Check if reassignment/transfer is allowed based on upcoming diet dates protocol
     * @param {Object} options - Configuration options
     * @param {string|number} [options.dietTokenId] - Diet token ID (for reassign to current user)
     * @param {string|number} [options.fitpassId] - Fitpass ID (for transfer/reassign to another user)
     * @param {string|number} [options.currentDietFitpassId] - Current diet's fitpass ID (to determine if it's reassign or transfer)
     * @param {Function} [options.onLoadingChange] - Callback to update loading state
     * @returns {Promise<{blocked: boolean, data: Object|null, error: Error|null, actionType: string}>}
     */
    const checkUpcomingDatesProtocol = async ({ dietTokenId = null, fitpassId = null, currentDietFitpassId = null, onLoadingChange = null }) => {
        if (!dietTokenId && !fitpassId) {
            return { blocked: false, data: null, error: new Error('Either dietTokenId or fitpassId must be provided'), actionType: 'Reassign' }
        }

        try {
            if (onLoadingChange) onLoadingChange(true)

            let checkResponse

            if (fitpassId) {
                // Check by fitpass ID (for transfer/reassign to target user)
                checkResponse = await axios.get('/api/check-upcoming-dates-by-fitpass', {
                    params: { fitpass_id: fitpassId }
                })
            } else {
                // Check by diet token ID (for reassign to current user)
                checkResponse = await axios.get('/manage-diets/check-upcoming-dates', {
                    params: { diet_token_id: dietTokenId }
                })
            }

            // Determine action type: Reassign if fitpass IDs match, Transfer if different
            let actionType = 'Reassign'
            if (fitpassId) {
                // Compare fitpass IDs (convert to string for comparison to handle number/string mismatch)
                const enteredFitpassId = String(fitpassId).trim()
                const currentFitpassId = currentDietFitpassId ? String(currentDietFitpassId).trim() : null
                actionType = (currentFitpassId && enteredFitpassId === currentFitpassId) ? 'Reassign' : 'Transfer'
            }

            if (checkResponse.data.success && checkResponse.data.has_more_than_7) {
                // Clear loading state BEFORE showing the alert so overlay doesn't block it
                if (onLoadingChange) onLoadingChange(false)
                
                await modal.fire({
                    title: `Cannot ${actionType} Diet`,
                    html: `This user already have <strong> ${checkResponse.data.upcoming_count}</strong> upcoming diet dates assigned.`,
                    icon: 'warning',
                    confirmButtonText: 'OK',
                    width: '500px'
                })
                
                return { blocked: true, data: checkResponse.data, error: null, actionType }
            }
            
            return { blocked: false, data: checkResponse.data, error: null, actionType }
        } catch (error) {
            console.error('Failed to check upcoming dates protocol:', error)
            // Determine action type for error case if possible
            let actionType = 'Reassign'
            if (fitpassId && currentDietFitpassId) {
                const enteredFitpassId = String(fitpassId).trim()
                const currentFitpassId = String(currentDietFitpassId).trim()
                actionType = (enteredFitpassId === currentFitpassId) ? 'Reassign' : 'Transfer'
            } else if (fitpassId) {
                actionType = 'Transfer'
            }
            return { blocked: false, data: null, error, actionType }
        } finally {
            if (onLoadingChange) onLoadingChange(false)
        }
    }

    return {
        checkUpcomingDatesProtocol
    }
}

