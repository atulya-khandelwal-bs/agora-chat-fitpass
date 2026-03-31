// Simple route guard - prevents pages from loading when not authenticated
import { auth } from './auth';

// Protected routes that require authentication
const protectedRoutes = [
    '/dashboard',
    '/holiday',
    '/health-coach',
    '/coach-ratings',
    '/fitpass-users',
    '/call-schedule',
    '/task-management',
    '/manage-diets',
    '/',
];

// Public routes that don't require authentication
const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
];

// Wait for Inertia to load the page and authentication state
function waitForInertiaLoad() {
    return new Promise((resolve) => {
        // If Inertia is already loaded, resolve immediately
        if (window?.Inertia?.page?.props) {
            resolve();
            return;
        }

        // Wait for Inertia to load
        const checkInertia = () => {
            if (window?.Inertia?.page?.props) {
                resolve();
            } else {
                requestAnimationFrame(checkInertia);
            }
        };
        checkInertia();
    });
}

// Check if current route requires authentication
async function checkRouteAccess() {
    const currentPath = window.location.pathname;
    
    // Wait for Inertia to load before checking authentication
    await waitForInertiaLoad();
    
    const isAuthenticated = auth.isAuthenticated();
    
    // Check if current route is protected
    const isProtectedRoute = protectedRoutes.some(route => 
        currentPath === route || currentPath.startsWith(route + '/')
    );
    
    // Check if current route is public
    const isPublicRoute = publicRoutes.some(route => 
        currentPath === route || currentPath.startsWith(route + '/')
    );
    
    // If not authenticated and trying to access protected route
    if (!isAuthenticated && isProtectedRoute) {
        window.location.replace(route('login'));
        return false;
    }
    
    // If authenticated and trying to access login page
    if (isAuthenticated && currentPath === '/login') {
        window.location.replace(route('dashboard'));
        return false;
    }
    
    return true;
}

// Initialize route guard
export function initSimpleRouteGuard() {
    // Check after Inertia loads
    waitForInertiaLoad().then(() => {
        checkRouteAccess();
    });
    
    // Check on route changes
    if (window?.Inertia) {
        // Try different event names that Inertia might use
        const events = ['navigate', 'success', 'finish'];
        events.forEach(eventName => {
            try {
                window.Inertia.on(eventName, () => {
                    
                    waitForInertiaLoad().then(() => {
                        checkRouteAccess();
                    });
                });
            } catch (error) {
                // Event might not exist, that's okay
                
            }
        });
    }
    
    // Check on browser navigation
    window.addEventListener('popstate', () => {
        
        waitForInertiaLoad().then(() => {
            checkRouteAccess();
        });
    });
}

// Export for use in other files
export { checkRouteAccess };









