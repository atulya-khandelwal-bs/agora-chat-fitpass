<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use App\Models\User;

class ApiTokenAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        
        // Check if token exists in cache (file-based storage)
        $userData = Cache::get('user_token_' . $token);
        
        if (!$userData) {
            return response()->json(['message' => 'Invalid token'], 401);
        }
        
        // Create user instance from cached data
        $user = new User();
        $user->team_member_id = $userData['team_member_id'];
        $user->email_address = $userData['email_address'];
        $user->first_name = $userData['first_name'];
        $user->access_role_id = $userData['access_role_id'];
        $user->role_display_name = $userData['role_display_name'];
        $user->departments = $userData['departments'];
        $user->mobile_number = $userData['mobile_number'];
        $user->executive_mobile_number = $userData['executive_mobile_number'];
        
        // Set the authenticated user
        auth()->setUser($user);
        
        // Add user data to request for easy access
        $request->merge(['user' => $userData]);
        
        return $next($request);
    }
}
