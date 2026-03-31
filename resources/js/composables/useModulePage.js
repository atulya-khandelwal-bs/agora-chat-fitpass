/**
 * useModulePage - Reusable composable for module listing pages
 * 
 * This composable extracts common logic from module pages including:
 * - Filter handling (with preservation/restoration)
 * - Pagination
 * - Sorting
 * - Configuration loading
 * - Loading states
 * 
 * Usage:
 * ```javascript
 * const {
 *   moduleConfig,
 *   isConfigLoading,
 *   sortBy,
 *   sortOrder,
 *   isFiltering,
 *   gridViewRef,
 *   handleFilterChange,
 *   handleClearFilters,
 *   handleSort,
 *   goToPage,
 *   paginationInfo
 * } = useModulePage({
 *   moduleKey: 'holiday',
 *   data: props.holidays,
 *   filters: props.filters,
 *   sorting: props.sorting,
 *   routeName: 'holiday.index',
 *   defaultSortBy: 'title',
 *   defaultSortOrder: 'desc'
 * })
 * ```
 */

import { ref, computed, nextTick } from 'vue'
import { router } from '@inertiajs/vue3'
import { loadModuleConfig } from '@/utils/moduleConfigLoader'

// Get route function from global scope (Ziggy)
// ZiggyVue makes route available globally, but we need to access it safely
const getRoute = () => {
    // Try multiple ways to access route function
    if (typeof route !== 'undefined') return route
    if (typeof window !== 'undefined' && window.route) return window.route
    // Fallback: route might be injected by Vue
    return (routeName, params = {}) => {
        // If route is not available, construct URL manually
        return `/${routeName.replace('.', '/')}`
    }
}

export function useModulePage(options) {
    const {
        moduleKey,
        data,
        filters,
        sorting,
        routeName,
        routeParams = {},
        defaultSortBy = 'id',
        defaultSortOrder = 'desc',
        filterMappingOverride = null,
        filterValueTransformers = {},
        customPaginationInfo = null,
        onlyProps = null,
        onNavigate = null
    } = options

    // Make data reactive - wrap in a computed that always reads fresh
    const reactiveData = computed(() => {
        const latestData = typeof data === 'function' ? data() : data
        return latestData || {}
    })

    // Refs
    const moduleConfig = ref(null)
    const isConfigLoading = ref(true)
    const sortBy = ref(sorting?.sort_by || defaultSortBy)
    const sortOrder = ref(sorting?.sort_order || defaultSortOrder)
    const isFiltering = ref(false)
    const gridViewRef = ref(null)
    const savedFilters = ref(null)

    // Load module configuration
    const loadConfig = async () => {
        try {
            moduleConfig.value = await loadModuleConfig(moduleKey)
        } catch (error) {
            moduleConfig.value = {}
        } finally {
            isConfigLoading.value = false
        }
    }

    // Initialize config
    loadConfig()

    // Get filter mapping from config
    const filterMapping = computed(() => {
        return filterMappingOverride || moduleConfig.value?.filterMapping || {}
    })

    // Generic filter transformer to handle different filter types
    const transformFilterValue = (key, filterValue) => {
        // Check for custom transformers first
        if (filterValueTransformers[key]) {
            return filterValueTransformers[key](filterValue)
        }

        // Handle date-range filters
        if (filterValue && typeof filterValue === 'string' && filterValue.includes(' to ')) {
            return transformDateRange(key, filterValue)
        }

        // Handle range-inputs (object with min/max)
        if (filterValue && typeof filterValue === 'object' && !Array.isArray(filterValue) && 'min' in filterValue && 'max' in filterValue) {
            return transformRangeInput(key, filterValue)
        }

        // Default: return as-is
        return { [key]: filterValue }
    }

    // Get backend column config to determine filter type
    const getColumnConfig = (key) => {
        return moduleConfig.value?.columns?.find(col => col['label-id'] === key)
    }

    // Transform date range filter
    const transformDateRange = (key, filterValue) => {
        const isEmpty = !filterValue || filterValue.toString().trim() === ''
        
        if (isEmpty) {
            return {
                [`${key}_from`]: '',
                [`${key}_to`]: ''
            }
        }

        const dates = filterValue.split(' to ')
        if (dates.length === 2) {
            // Special handling for fitpass-users date ranges
            if (moduleKey === 'fitpass-users') {
                if (key === 'last_seen') {
                    return { last_login_from: dates[0], last_login_to: dates[1] }
                } else if (key === 'assigned_date') {
                    return { assigned_from: dates[0], assigned_to: dates[1] }
                } else if (key === 'diet_till_date') {
                    return { diet_till_from: dates[0], diet_till_to: dates[1] }
                } else if (key === 'membership_end_date') {
                    return { membership_end_from: dates[0], membership_end_to: dates[1] }
                }
            }
            
            // Special handling for call-schedule date ranges
            if (moduleKey === 'call-schedule') {
                if (key === 'call_datetime') {
                    return { call_datetime_from: dates[0], call_datetime_to: dates[1] }
                } else if (key === 'update_time') {
                    return { update_time_from: dates[0], update_time_to: dates[1] }
                }
            }
            
            // Special handling for diets date ranges (backend expects create_time_from/to for date_of_diet filter)
            if (moduleKey === 'diets' && (key === 'create_time' || key === 'date_of_diet')) {
                return { create_time_from: dates[0], create_time_to: dates[1] }
            }
            
            return {
                [`${key}_from`]: dates[0],
                [`${key}_to`]: dates[1]
            }
        }

        return {
            [`${key}_from`]: '',
            [`${key}_to`]: ''
        }
    }

    // Helper to build the 'only' array for Inertia
    const buildOnlyArray = () => {
        if (onlyProps && onlyProps.length) {
            return Array.isArray(onlyProps) ? onlyProps : [onlyProps]
        }

        const propNameMap = {
            'holiday': 'holidays',
            'health-coach': 'healthCoaches',
            'coach-ratings': 'ratings',
            'fitpass-users': 'fitpassUsers',
            'call-schedule': 'callSchedules',
            'diets': 'diets',
            'third-party-users': 'thirdPartyUsers'
        }
        
        return [
            propNameMap[moduleKey] || moduleKey,
            'filters',
            'sorting'
        ]
    }

    // Transform range input filter (object with min/max)
    const transformRangeInput = (key, filterValue) => {
        const isEmpty = !filterValue || 
            (!filterValue.min && !filterValue.max) || 
            (filterValue.min?.toString().trim() === '' && filterValue.max?.toString().trim() === '')

        // Special handling for specific modules that use non-standard parameter names
        // For health-coach: health_experience -> min_experience (not min_health_experience)
        let minParam = `min_${key}`
        let maxParam = `max_${key}`
        
        if (key === 'health_experience') {
            minParam = 'min_experience'
            maxParam = 'max_experience'
        } else if (key === 'number_consultations') {
            minParam = 'min_consultations'
            maxParam = 'max_consultations'
        } else if (key === 'avg_rating') {
            minParam = 'min_rating'
            maxParam = 'max_rating'
        } else if (key === 'rating') {
            // Backend expects rating_min and rating_max for coach-ratings module
            minParam = 'rating_min'
            maxParam = 'rating_max'
        }

        if (isEmpty) {
            return {
                [minParam]: '',
                [maxParam]: ''
            }
        }

        return {
            [minParam]: filterValue.min || '',
            [maxParam]: filterValue.max || ''
        }
    }

    // Build query params for filtering
    const buildFilterQueryParams = (allFilters) => {
        const queryParams = { page: 1 }
        
        // Track if user_search has been set (for multiple-to-one mapping)
        let userSearchValue = ''
        
        Object.keys(allFilters).forEach(key => {
            const filterValue = allFilters[key]
            
            // Transform the filter value (use frontend key for column-specific logic like date ranges)
            const transformed = transformFilterValue(key, filterValue)
            
            // If transformation returns multiple params (like date_from/date_to), use them as-is
            // Otherwise, use the backend param name
            const transformedKeys = Object.keys(transformed)
            if (transformedKeys.length > 1) {
                // Multiple params returned (date range, range inputs, etc.)
                Object.assign(queryParams, transformed)
            } else {
                // Single param - need to use the backend param name
                const backendParam = filterMapping.value[key] || key
                const paramValue = transformed[Object.keys(transformed)[0]]
                
                // Special handling by module
                if (moduleKey === 'call-schedule') {
                    // Call schedule specific mappings - user_search pattern same as coach-ratings
                    if (['fitpass_id', 'user_name', 'user_mobile'].includes(key)) {
                        if (paramValue && paramValue.toString().trim() !== '') {
                            userSearchValue = paramValue
                        }
                    } else if (key === 'health_coach_name') {
                        queryParams['health_coach_name'] = paramValue
                    } else {
                        queryParams[backendParam] = paramValue
                    }
                } else if (moduleKey === 'fitpass-users') {
                    // Fitpass users specific mappings
                    if (key === 'user_name') {
                        queryParams['name_search'] = paramValue
                    } else if (key === 'user_mobile') {
                        queryParams['mobile_search'] = paramValue
                    } else if (key === 'user_email') {
                        queryParams['email_search'] = paramValue
                    } else if (key === 'fitpass_id') {
                        queryParams['fitpass_id_search'] = paramValue
                    } else if (key === 'source') {
                        queryParams['source_search'] = paramValue
                    } else if (key === 'state_name') {
                        queryParams['state_search'] = paramValue
                    } else if (key === 'corporate_name') {
                        queryParams['corporate_name_search'] = paramValue
                    } else if (key === 'deletion_status') {
                        queryParams['is_deleted'] = paramValue
                    } else {
                        queryParams[key] = paramValue
                    }
                } else if (moduleKey === 'third-party-users') {
                    // Third party users specific mappings
                    if (key === 'fitpass_id') {
                        queryParams['fitpass_id_search'] = paramValue
                    } else if (key === 'corporate_name') {
                        queryParams['corporate_name_search'] = paramValue
                    } else if (key === 'benefit_number') {
                        queryParams['benefit_number_search'] = paramValue
                    } else if (key === 'third_party_user_id') {
                        queryParams['third_party_user_id_search'] = paramValue
                    } else if (key === 'product_sku') {
                        queryParams['product_sku_search'] = paramValue
                    } else if (key === 'coupon_code') {
                        queryParams['coupon_code_search'] = paramValue
                    } else {
                        queryParams[key] = paramValue
                    }
                } else if (moduleKey === 'coach-ratings') {
                    // Coach ratings specific mappings
                    if (['fitpass_id', 'user_name', 'user_mobile'].includes(key)) {
                        if (paramValue && paramValue.toString().trim() !== '') {
                            userSearchValue = paramValue
                        }
                    } else if (key === 'health_coach_name') {
                        queryParams['health_coach_name'] = paramValue
                    } else {
                        queryParams[backendParam] = paramValue
                    }
                } else if (moduleKey === 'health-coach') {
                    // Health coach specific mappings
                    if (key === 'health_coach_name') {
                        queryParams['name_search'] = paramValue
                    } else if (key === 'specialist') {
                        queryParams['specialist_search'] = paramValue
                    } else {
                        queryParams[backendParam] = paramValue
                    }
                } else {
                    // Default handling
                    queryParams[backendParam] = paramValue
                }
            }
        })
        
        // Add user_search if any of the user search filters were set
        if (userSearchValue) {
            queryParams['user_search'] = userSearchValue
        }

        return queryParams
    }

    // Handle filter changes from GridView
    const handleFilterChange = async ({ columnId, value, allFilters }) => {
        // Preserve current filter state
        if (gridViewRef.value?.preserveCurrentFilters) {
            savedFilters.value = gridViewRef.value.preserveCurrentFilters()
        }

        isFiltering.value = true

        // Build query parameters
        const queryParams = buildFilterQueryParams(allFilters)

        // Make request
        router.get(getRoute()(routeName, routeParams), queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: buildOnlyArray(),
            onStart: () => {
                isFiltering.value = true
            },
            onFinish: () => {
                isFiltering.value = false
                
                // Restore filters after data loads
                if (gridViewRef.value?.restoreFilters && savedFilters.value) {
                    nextTick(() => {
                        gridViewRef.value.restoreFilters(savedFilters.value)
                    })
                }
            }
        })
    }

    // Handle clear filters
    const handleClearFilters = () => {
        savedFilters.value = null
        isFiltering.value = true

        // Build empty query params - clear all filters explicitly
        const queryParams = { page: 1 }
        
        // Get all column IDs from config to clear them
        const columns = moduleConfig.value?.columns || []
        columns.forEach(column => {
            if (column['label-id'] && column['label-type']) {
                const columnId = column['label-id']
                
                if (column['label-type'] === 'date-range') {
                    queryParams[`${columnId}_from`] = ''
                    queryParams[`${columnId}_to`] = ''
                } else if (column['label-type'] === 'range-inputs') {
                    queryParams[`min_${columnId}`] = ''
                    queryParams[`max_${columnId}`] = ''
                } else {
                    const backendParam = filterMapping.value[columnId] || columnId
                    queryParams[backendParam] = ''
                }
            }
        })
        
        // Remove view parameter when clearing filters to prevent offcanvas from reopening
        // This ensures that if user had opened offcanvas and then clears filters, 
        // the offcanvas won't reopen on the next page load
        // Explicitly ensure view is not in queryParams
        delete queryParams.view
        
        // Also remove from current URL immediately to prevent any race conditions
        // This ensures the URL is clean before Inertia navigates
        if (typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href)
            if (currentUrl.searchParams.has('view')) {
                currentUrl.searchParams.delete('view')
                const cleanUrl = currentUrl.pathname + (currentUrl.search ? `?${currentUrl.searchParams.toString()}` : '') + currentUrl.hash
                window.history.replaceState({}, '', cleanUrl)
            }
        }

        router.get(getRoute()(routeName, routeParams), queryParams, {
            preserveState: false,
            preserveScroll: false,
            replace: true,
            only: buildOnlyArray(),
            onStart: () => {
                isFiltering.value = true
            },
            onFinish: () => {
                isFiltering.value = false
                
                // Use nextTick to ensure DOM is fully updated before resetting flag
                nextTick(() => {
                    if (gridViewRef.value?.resetClearingFlag) {
                        gridViewRef.value.resetClearingFlag()
                    }
                    
                    if (gridViewRef.value?.restoreFilters && savedFilters.value) {
                        nextTick(() => {
                            gridViewRef.value.restoreFilters(savedFilters.value)
                        })
                    }
                })
            }
        })
    }

    // Handle sorting
    const handleSort = (columnId) => {
        if (sortBy.value === columnId) {
            sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
        } else {
            sortBy.value = columnId
            sortOrder.value = 'asc'
        }

        // Start from current URL query so all active filters are preserved
        const currentParams = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams()

        /** @type {Record<string, string>} */
        const queryParams = {}
        currentParams.forEach((value, key) => {
            queryParams[key] = value
        })

        // Always reset to first page when sorting changes
        queryParams.page = String(1)
        queryParams.sort_by = String(sortBy.value || '')
        queryParams.sort_order = String(sortOrder.value || '')

        router.get(getRoute()(routeName, routeParams), queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: buildOnlyArray(),
            onStart: () => { isFiltering.value = true },
            onFinish: () => { isFiltering.value = false }
        })
    }

    const runCustomNavigation = async (context) => {
        if (typeof onNavigate !== 'function') {
            return false
        }

        try {
            const result = await Promise.resolve(onNavigate(context))
            // Treat undefined/null as handled to allow handlers that don't explicitly return
            return result !== false
        } catch (error) {
            console.error('useModulePage onNavigate handler failed', error)
            return false
        }
    }

    // Handle pagination
    const goToPage = async (page) => {
        if (gridViewRef.value?.preserveCurrentFilters) {
            savedFilters.value = gridViewRef.value.preserveCurrentFilters()
        }

        isFiltering.value = true

        // Start from current URL query so all active filters are preserved
        const currentParams = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams()

        /** @type {Record<string, string>} */
        const queryParams = {}
        currentParams.forEach((value, key) => {
            queryParams[key] = value
        })

        queryParams.page = String(page)
        queryParams.sort_by = String(sortBy.value || '')
        queryParams.sort_order = String(sortOrder.value || '')

        const context = {
            type: 'pagination',
            page,
            queryParams,
            routeName,
            routeParams
        }

        const handled = await runCustomNavigation(context)
        if (handled) {
            isFiltering.value = false
            return
        }

        router.get(getRoute()(routeName, routeParams), queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: buildOnlyArray(),
            onStart: () => { isFiltering.value = true },
            onFinish: () => {
                isFiltering.value = false
                
                if (gridViewRef.value?.restoreFilters && savedFilters.value) {
                    nextTick(() => {
                        gridViewRef.value.restoreFilters(savedFilters.value)
                    })
                }
            }
        })
    }

    // Get pagination info (simple pagination - no total count)
    const paginationInfo = computed(() => {
        if (customPaginationInfo) {
            return customPaginationInfo.value
        }

        const info = reactiveData.value || {}
        const hasMore = info.has_more_pages !== undefined ? info.has_more_pages : (info.next_page_url !== null)
        const currentPage = info.current_page || 1
        
        return {
            total: null, // Not available with simple pagination
            from: info.from || 0,
            to: info.to || 0,
            currentPage: currentPage,
            lastPage: null, // Not available with simple pagination - use hasMore instead
            hasMore: hasMore,
            hasPages: hasMore || currentPage > 1 // Show pagination if there's more pages or we're past page 1
        }
    })

    return {
        // Configuration
        moduleConfig,
        isConfigLoading,
        filterMapping,

        // State
        sortBy,
        sortOrder,
        isFiltering,
        gridViewRef,
        savedFilters,

        // Handlers
        handleFilterChange,
        handleClearFilters,
        handleSort,
        goToPage,

        // Computed
        paginationInfo
    }
}
