<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Services\AccessControlService;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Defines the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function share(Request $request): array
    {
        $user = Auth::user();
        $isAuthenticated = Auth::check();
        
        \Log::info('HandleInertiaRequests: Initial auth check', [
            'path' => $request->path(),
            'authenticated' => $isAuthenticated,
            'user' => $user ? $user->team_member_id : null,
            'auth_id' => Auth::id(),
            'session_user_data' => session('user_data')
        ]);
        
        // If Auth::user() returns null but user is authenticated, try to get user from session
        if (!$user && $isAuthenticated) {
            $userId = Auth::id();
            if ($userId) {
                $user = User::find($userId);
                \Log::info('HandleInertiaRequests: Retrieved user from database', [
                    'user_id' => $userId,
                    'user_found' => $user ? true : false,
                    'user_team_member_id' => $user ? $user->team_member_id : null
                ]);
            }
        }
        
        // If still no user but authenticated, create a minimal user object from session data
        if (!$user && $isAuthenticated && session('user_data')) {
            $userData = session('user_data');
            \Log::info('HandleInertiaRequests: Creating user from session data', [
                'session_data' => $userData
            ]);
            
            // Create a new User instance and fill it with session data
            $user = new User();
            $user->forceFill($userData);
        }
        
        // Ensure user data is properly formatted for Inertia
        $userData = null;
        if ($user) {
            $userData = $user->toArray();
            // Ensure the primary key is included
            if (!isset($userData['team_member_id'])) {
                $userData['team_member_id'] = $user->team_member_id;
            }
        }
        
        \Log::info('HandleInertiaRequests: Final auth data', [
            'path' => $request->path(),
            'authenticated' => $isAuthenticated,
            'user' => $user ? $user->team_member_id : null,
            'user_data' => $userData
        ]);
        
        $modules = $this->buildMenuModules($user);

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $userData,
            ],
            'modules' => $modules,
            'cdnBaseUrl' => env('CDN_BASE_URL', ''),
        ]);
    }

    private function buildMenuModules($user): array
    {
        if (!$user || !$user->team_member_id) {
            return [];
        }

        try {
            $accessControl = app(AccessControlService::class);
            $isSuperAdmin = $accessControl->isSuperAdmin($user);

            $schema = config('database.connections.pgsql.schema');
            if (is_array($schema)) {
                $schema = $schema[0] ?? null;
            }
            $table = fn ($name) => $schema ? "{$schema}.{$name}" : $name;

            $roleIds = DB::table($table('fitpass_access_role_user'))
                ->where('team_member_id', $user->team_member_id)
                ->pluck('access_role_id')
                ->all();

            $menuIds = [];
            if (!$isSuperAdmin && !empty($roleIds)) {
                $menuIds = DB::table($table('fitpass_access_role_menus'))
                    ->whereIn('role_id', $roleIds)
                    ->pluck('menu_id')
                    ->all();
            }

            $query = DB::table($table('fitpass_access_menus'))
                ->where('status', 2)
                ->whereNull('parent_menu_id')
                ->whereNotNull('route_name');

            if (!$isSuperAdmin) {
                if (!empty($menuIds)) {
                    $query->whereIn('access_menu_id', $menuIds);
                } else {
                    $query->whereRaw('1 = 0');
                }
            }

            $menus = $query
                ->orderByRaw('COALESCE(order_by, 999999) ASC')
                ->orderBy('access_menu_id')
                ->get([
                    'access_menu_id',
                    'menu_label',
                    'route_name',
                    'icon_class',
                    'order_by',
                ]);

            $validRoutes = array_keys(Route::getRoutes()->getRoutesByName());
            $validRouteMap = array_flip($validRoutes);

            $overrides = DB::table($table('fitpass_access_user_menus'))
                ->where('team_member_id', $user->team_member_id)
                ->pluck('is_visible', 'menu_id')
                ->all();

            $modules = [];
            foreach ($menus as $menu) {
                if (!isset($validRouteMap[$menu->route_name])) {
                    continue;
                }
                if (isset($overrides[$menu->access_menu_id]) && (int) $overrides[$menu->access_menu_id] === 1) {
                    continue;
                }

                $modules[] = [
                    'key' => $menu->access_menu_id,
                    'name' => $menu->menu_label,
                    'icon' => $menu->icon_class ?: 'ri-menu-line',
                    'route' => $menu->route_name,
                    'url' => route($menu->route_name),
                ];
            }

            return $modules;
        } catch (\Throwable $e) {
            \Log::error('Failed to load menu modules', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
