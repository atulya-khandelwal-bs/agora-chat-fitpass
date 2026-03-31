<?php

namespace App\Contracts;

use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;

interface HealthCoachRatingRepositoryInterface
{
    /**
     * Get paginated health coach ratings with filters
     */
    public function getPaginatedRatings(Request $request, int $perPage = 20, ?array $healthCoachIds = null): Paginator;
}
