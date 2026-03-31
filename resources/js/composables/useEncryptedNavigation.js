import { router } from '@inertiajs/vue3'

export function useEncryptedNavigation(routeFunction) {
    /**
     * Navigate to view details with encrypted ID using a simple approach
     * @param {string} routeName - The route name (e.g., 'holiday.index')
     * @param {string|number} id - The ID to encrypt
     * @param {string} viewParam - The view parameter name (default: 'view')
     * @param {Object} options - Inertia options
     */
    const viewWithEncryption = async (routeName, id, viewParam = 'view', options = {}) => {
        try {
            // Create a generic encrypt-token route for any module
            const moduleName = routeName.split('.')[0] // Extract module name from route
            const encryptRouteName = options.encryptRouteName || `${moduleName}.encrypt-token`
            
            // Use the passed route function or fallback to window.route
            const route = routeFunction || window.route
            
            // Navigate to encrypt-token route which will handle the redirect
            router.get(route(encryptRouteName, { id: id }), {}, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    // The encrypted token will be in page.props.encryptedToken
                    if (page.props.encryptedToken) {
                        // Navigate to the target route with encrypted token
                        router.get(route(routeName), { [viewParam]: page.props.encryptedToken }, {
                            preserveState: true,
                            preserveScroll: true,
                            ...options
                        })
                    }
                },
                onError: (errors) => {
                    // Fallback to regular navigation
                    router.get(route(routeName), { [viewParam]: id }, {
                        preserveState: true,
                        preserveScroll: true,
                        ...options
                    })
                }
            })
        } catch (error) {
            // Fallback to regular navigation
            const route = routeFunction || window.route
            router.get(route(routeName), { [viewParam]: id }, {
                preserveState: true,
                preserveScroll: true,
                ...options
            })
        }
    }

    return {
        viewWithEncryption
    }
}
