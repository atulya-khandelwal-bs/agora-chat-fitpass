<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Health Coach bindings
        $this->app->bind(
            \App\Contracts\HealthCoachRepositoryInterface::class,
            \App\Repositories\HealthCoachRepository::class
        );

        $this->app->bind(
            \App\Contracts\HealthCoachServiceInterface::class,
            \App\Services\HealthCoachService::class
        );

        // Fitpass User bindings
        $this->app->bind(
            \App\Contracts\FitpassUserRepositoryInterface::class,
            \App\Repositories\FitpassUserRepository::class
        );

        $this->app->bind(
            \App\Contracts\FitpassUserServiceInterface::class,
            \App\Services\FitpassUserService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);
        if (app()->environment('production')) {
            URL::forceScheme('https'); // Forces all asset URLs to use HTTPS
        }
    }
}
