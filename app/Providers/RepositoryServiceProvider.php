<?php

namespace App\Providers;

use App\Contracts\HolidayRepositoryInterface;
use App\Contracts\DietRepositoryInterface;
use App\Contracts\HealthCoachRepositoryInterface;
use App\Contracts\HealthCoachRatingRepositoryInterface;
use App\Contracts\HolidayServiceInterface;
use App\Contracts\DietServiceInterface;
use App\Contracts\HealthCoachServiceInterface;
use App\Contracts\HealthCoachRatingServiceInterface;
use App\Repositories\HolidayRepository;
use App\Repositories\DietRepository;
use App\Repositories\HealthCoachRepository;
use App\Repositories\HealthCoachRatingRepository;
use App\Services\HolidayService;
use App\Services\AccessControlService;
use App\Services\DietService;
use App\Services\HealthCoachService;
use App\Services\HealthCoachRatingService;
use App\Services\AWS\S3\S3ClientService;

use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register repositories
        $this->app->bind(HolidayRepositoryInterface::class, HolidayRepository::class);
        $this->app->bind(DietRepositoryInterface::class, DietRepository::class);
        $this->app->bind(HealthCoachRepositoryInterface::class, HealthCoachRepository::class);
        $this->app->bind(HealthCoachRatingRepositoryInterface::class, HealthCoachRatingRepository::class);
        
        // Register services
        $this->app->bind(HolidayServiceInterface::class, function ($app) {
            return new HolidayService(
                $app->make(HolidayRepositoryInterface::class),
                $app->make(HealthCoachRepositoryInterface::class),
                $app->make(AccessControlService::class)
            );
        });
        $this->app->bind(DietServiceInterface::class, function ($app) {
            return new DietService(
                $app->make(DietRepositoryInterface::class),
                $app->make(AccessControlService::class)
            );
        });
        
        $this->app->bind(HealthCoachServiceInterface::class, function ($app) {
            return new HealthCoachService(
                $app->make(HealthCoachRepositoryInterface::class),
                $app->make(S3ClientService::class)
            );
        });
        
        $this->app->bind(HealthCoachRatingServiceInterface::class, function ($app) {
            return new HealthCoachRatingService(
                $app->make(HealthCoachRatingRepositoryInterface::class),
                $app->make(AccessControlService::class)
            );
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
