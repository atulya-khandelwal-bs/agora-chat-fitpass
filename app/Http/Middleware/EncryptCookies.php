<?php

namespace App\Http\Middleware;

use Illuminate\Cookie\Middleware\EncryptCookies as Middleware;

class EncryptCookies extends Middleware
{
    /**
     * The names of the cookies that should not be encrypted.
     *
     * CSRF tokens must remain unencrypted so they can be read by JavaScript
     * and sent back in X-CSRF-TOKEN headers. Laravel expects plain token values.
     *
     * @var array<int, string>
     */
    protected $except = [
        'XSRF-TOKEN',
        'XSRF-TOKEN-FITFEAST-V2',
    ];
}
