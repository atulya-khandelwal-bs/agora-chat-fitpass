// resources/js/utils/auth.js
import { router } from '@inertiajs/vue3';

export const auth = {
    // Get current user from Inertia shared props
    getUser() {
        // Try to get user from Inertia page props
        const user = window?.Inertia?.page?.props?.auth?.user || null;
        
        return user;
    },

    // Check if user is authenticated
    isAuthenticated() {
        const authenticated = !!this.getUser();
        
        return authenticated;
    },

    // Logout user using direct fetch request
    async logout() {
        try {
            await this.refreshCSRFToken();
            const csrfToken = this.getCSRFToken();
            
            if (!csrfToken) {
                this.clearAuthData();
                window.location.href = route('login');
                return;
            }
            
            // Use direct fetch request to logout
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                this.clearAuthData();
                window.location.href = route('login');
            } else {
                this.clearAuthData();
                window.location.href = route('login');
            }
        } catch (error) {
            // Clear auth data even if logout fails
            this.clearAuthData();
            // Fallback to direct redirect if logout fails
            window.location.href = route('login');
        }
    },

    // Get CSRF token from meta tag or cookie
    // Prefer meta tag first (set by Laravel/Inertia) as it's always the correct plain token
    getCSRFToken() {
        // 1. First try meta tag (most reliable - set by Laravel/Inertia)
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken && metaToken.getAttribute('content')) {
            return metaToken.getAttribute('content');
        }

        // 2. Fallback to cookie (should now be plain/unencrypted after backend fix)
        const cookieToken = this.getCookieToken();
        if (cookieToken) {
            return cookieToken;
        }

        return null;
    },

    getCookieToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN-FITFEAST-V2' || name === 'XSRF-TOKEN') {
                return decodeURIComponent(value);
            }
        }
        return null;
    },

    // Clear all authentication data
    clearAuthData() {
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_state');
        localStorage.removeItem('user');
        localStorage.clear();
        
        // Clear sessionStorage
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_state');
        sessionStorage.removeItem('user');
        sessionStorage.clear();
        
        // Clear all cookies except CSRF token
        document.cookie.split(";").forEach(function(c) { 
            const cookieName = c.split('=')[0].trim();
            // Don't clear CSRF token cookies (both old and new names)
            if (!cookieName.includes('csrf') && !cookieName.includes('XSRF')) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            }
        });
        
        // Clear any other potential auth data
        if (window.auth) {
            window.auth = null;
        }
    },

    // Refresh CSRF token
    async refreshCSRFToken() {
        try {
            const response = await fetch('/sanctum/csrf-cookie', {
                method: 'GET',
                credentials: 'include',
                mode: 'cors'
            });
            
            if (response.ok) {
                const newToken = this.getCookieToken();
                // Only update meta tag if token is valid (plain token should be ~40 chars)
                // This prevents overwriting with encrypted values
                if (newToken && newToken.length >= 30 && newToken.length <= 50) {
                    const metaTag = document.querySelector('meta[name="csrf-token"]');
                    if (metaTag) {
                        metaTag.setAttribute('content', newToken);
                    }
                    if (window.axios) {
                        window.axios.defaults.headers.common['X-XSRF-TOKEN'] = newToken;
                    }
                }
            }
            
            return response.ok;
        } catch (error) {
            console.error('CSRF token refresh error:', error);
            return false;
        }
    },
};
