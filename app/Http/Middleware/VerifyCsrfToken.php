<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;
use Symfony\Component\HttpFoundation\Cookie;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];

    /**
     * The name of the cookie that contains the CSRF token.
     * 
     * IMPORTANT: Use a unique cookie name to prevent conflicts when loading
     * iframes from other servers (e.g., fitfeast-crm.fitpass.dev/task-management).
     * If both applications use the same CSRF token cookie name, tokens will conflict.
     *
     * @var string
     */
    protected $cookieName = 'XSRF-TOKEN-FITFEAST-V2';

    /**
     * Add the CSRF token to the response cookies.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Symfony\Component\HttpFoundation\Response  $response
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function addCookieToResponse($request, $response)
    {
        $config = config('session');
        $token = $request->session()->token();

        // Set custom cookie name
        $response->headers->setCookie(
            new Cookie(
                $this->cookieName, // 'XSRF-TOKEN-FITFEAST-V2'
                $token,
                time() + (60 * $config['lifetime']),
                $config['path'],
                $config['domain'],
                $config['secure'],
                false,
                false,
                $config['same_site'] ?? null
            )
        );
        
        // Also set default Laravel cookie name for Inertia.js compatibility
        $response->headers->setCookie(
            new Cookie(
                'XSRF-TOKEN', // Default name that Inertia.js looks for
                $token,
                time() + (60 * $config['lifetime']),
                $config['path'],
                $config['domain'],
                $config['secure'],
                false,
                false,
                $config['same_site'] ?? null
            )
        );

        return $response;
    }

    /**
     * Get the CSRF token from the request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function getTokenFromRequest($request)
    {
        $token = $request->input('_token') ?: $request->header('X-CSRF-TOKEN');

        if (!$token && $header = $request->header('X-XSRF-TOKEN')) {
            try {
                $token = $this->encrypter->decrypt($header, false);
            } catch (\Exception $e) {
                // If decryption fails, continue to check cookies
            }
        }

        // Also check for our custom cookie name
        if (!$token) {
            $token = $request->cookie($this->cookieName);
        }

        // Fallback to default cookie name for backward compatibility
        if (!$token) {
            $token = $request->cookie('XSRF-TOKEN');
        }

        return $token;
    }
}
