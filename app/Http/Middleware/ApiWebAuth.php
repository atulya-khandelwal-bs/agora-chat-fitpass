<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Symfony\Component\HttpFoundation\Response;

class ApiWebAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Define protected routes that require authentication
        $protectedRoutes = [
            '/dashboard',
            '/holiday',
            '/health-coach',
            '/coach-ratings',
            '/fitpass-users',
            '/call-schedule',
            '/task-management',
            '/manage-diets',
            '/api/diet-meals',
            '/api/diet-nutrition-summary',
            '/api/diet-meal-note',
            '/api/diets',
            '/fp-chat',
            '/',
        ];

        // Check if current path is a protected route
        $isProtectedRoute = false;
        $currentPath = $request->path();
        
        foreach ($protectedRoutes as $route) {
            $route = trim($route, '/');
            
            // Check for exact match
            if ($currentPath === $route) {
                $isProtectedRoute = true;
                break;
            }
            
            // Check if current path starts with the protected route (for nested routes)
            if (strpos($currentPath, $route . '/') === 0) {
                $isProtectedRoute = true;
                break;
            }
        }

        // If it's a protected route, check authentication regardless of request type
        if ($isProtectedRoute) {
            if (!Auth::check()) {
                // For Inertia requests, return Inertia redirect
                if ($request->header('X-Inertia')) {
                    return redirect()->route('login');
                }
                
                // For non-Inertia requests (direct URL access), redirect to login
                return redirect()->route('login');
            }
        }

        // For API requests, check authentication
        // BUT: Allow session-based authenticated users for web API endpoints
        if ($request->expectsJson()) {
            // Check if user is authenticated via session (Laravel Auth)
            if (!Auth::check()) {
                // Only check bearer token if not authenticated via session
                $token = $request->bearerToken();
                if (!$token) {
                    return response()->json(['message' => 'Unauthenticated.'], 401);
                }
            }
        }

        return $next($request);
    }
}
