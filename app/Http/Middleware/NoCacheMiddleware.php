<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class NoCacheMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Add cache control headers to prevent caching
        // Only set if not already set (to avoid duplicates from Nginx or other middleware)
        if (!$response->headers->has('Cache-Control')) {
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        }
        if (!$response->headers->has('Pragma')) {
            $response->headers->set('Pragma', 'no-cache');
        }
        if (!$response->headers->has('Expires')) {
            $response->headers->set('Expires', '0');
        }

        return $response;
    }
}
