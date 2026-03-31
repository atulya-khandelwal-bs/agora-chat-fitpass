<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PreventBackToLogin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // IMMEDIATE check: If user is authenticated and trying to access login, redirect immediately
        if (Auth::check() && $request->is('login')) {
            \Log::info('PreventBackToLogin: Authenticated user trying to access login page, redirecting immediately', [
                'user_id' => Auth::id(),
                'path' => $request->path(),
                'referer' => $request->header('referer'),
                'method' => $request->method(),
                'user_agent' => $request->header('User-Agent'),
                'is_back_button' => $request->header('referer') ? 'possible' : 'no_referer'
            ]);
            
            // Redirect immediately without processing the login page
            // Note: Security headers are handled by Nginx to avoid duplicates
            return redirect('/dashboard')->withHeaders([
                'Cache-Control' => 'no-cache, no-store, must-revalidate, private',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        }
        
        // Process the request normally for unauthenticated users
        $response = $next($request);
        
        // Note: Cache control headers are handled by NoCacheMiddleware (runs before this)
        // Security headers (X-Frame-Options, X-Content-Type-Options) are handled by Nginx
        // to avoid duplicate headers that cause 502 errors
        
        \Log::info('PreventBackToLogin: Allowing request', [
            'path' => $request->path(),
            'authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'referer' => $request->header('referer')
        ]);

        return $response;
    }
}
