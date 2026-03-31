<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ModuleRegistryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../../config/modules.php', 'modules'
        );
    }

    public function boot(): void
    {
        // Nothing to boot for now
    }
}


