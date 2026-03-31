import { usePage } from '@inertiajs/vue3';
import { auth } from './auth';

// List of routes
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

const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
];

function isAuthenticated() {
    try {
        const page = usePage();
        const user = page.props.auth.user;
        return !!user;
    } catch (error) {
        // If usePage is not available (e.g., during initial load), check window.Inertia
        const user = window?.Inertia?.page?.props?.auth?.user;
        return !!user;
    }
}

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

export async function checkRouteAccess() {
    const currentPath = window.location.pathname;
    
    // Wait for Inertia to load before checking authentication
    await waitForInertiaLoad();
    
    // Only check authentication for protected routes
    const isProtectedRoute = protectedRoutes.some(route =>
        currentPath === route || currentPath.startsWith(route + '/')
    );

    const isPublicRoute = publicRoutes.some(route =>
        currentPath === route || currentPath.startsWith(route + '/')
    );

    // If it's a protected route, check authentication
    if (isProtectedRoute) {
        
        
        const loggedIn = isAuthenticated();
        
        
        if (!loggedIn) {
            
            // Only redirect if we're not already on the login page to avoid loops
            if (currentPath !== '/login') {
                window.location.href = route('login');
            }
            return;
        } else {
            
        }
    }

    // If it's a public route and user is authenticated, redirect to dashboard
    if (isPublicRoute && currentPath === '/login') {
        
        const loggedIn = isAuthenticated();
        
        if (loggedIn) {
            
            window.location.replace(route('dashboard'));
            return;
        }
    }
}

// ✅ This is what app.js expects
export function initRouteGuard() {
    waitForInertiaLoad().then(() => {
        checkRouteAccess();
    });

    // Prevent back button from working when logged in
    window.addEventListener('popstate', (event) => {
        const currentPath = window.location.pathname;
        
        // IMMEDIATE check for session cookies when trying to go to login page
        if (currentPath === '/login') {
            const hasSessionCookie = document.cookie.includes('laravel_session') || 
                                   document.cookie.includes('XSRF-TOKEN');
            
            if (hasSessionCookie) {
                
                window.history.replaceState(null, '', route('dashboard'));
                window.location.replace(route('dashboard'));
                return;
            }
        }
        
        // Let server middleware handle authentication checks
        waitForInertiaLoad().then(() => {
            checkRouteAccess();
        });
    });

    if (window?.Inertia) {
        const events = ['navigate', 'success', 'finish'];
        events.forEach(eventName => {
            try {
                window.Inertia.on(eventName, () => {
                    waitForInertiaLoad().then(() => {
                        checkRouteAccess();
                    });
                });
            } catch (error) {
                
            }
        });
    }
}

