<?php

namespace App\Traits;

use Illuminate\Http\Request;

trait HasEncryptedTokens
{
    /**
     * Get encrypted token for any entity ID (internal trait method)
     * 
     * @param int $id The entity ID to encrypt
     * @param string $routeName The route name to redirect to (e.g., 'module.index')
     * @param callable $verificationCallback Optional callback to verify entity exists
     * @return \Illuminate\Http\RedirectResponse
     */
    public function generateEncryptedToken(int $id, string $routeName, callable $verificationCallback = null)
    {
        try {
            // If verification callback provided, use it to check if entity exists
            if ($verificationCallback) {
                $entity = $verificationCallback($id);
                if (!$entity) {
                    return back()->withErrors(['error' => 'Item not found.']);
                }
            }

            // Simple encryption using Laravel's built-in encrypt
            $encryptedToken = encrypt($id);

            // Redirect directly to the specified route with encrypted token
            return redirect()->route($routeName, ['view' => $encryptedToken]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to generate encrypted token: ' . $e->getMessage()]);
        }
    }

    /**
     * Generic method to create encrypted token for any module
     * Usage: $this->createEncryptedTokenForModule($id, 'module.index', $this->service, 'getById')
     */
    public function createEncryptedTokenForModule(int $id, string $routeName, $service, string $method = 'getById')
    {
        return $this->generateEncryptedToken($id, $routeName, function($id) use ($service, $method) {
            return $service->$method($id);
        });
    }
}
