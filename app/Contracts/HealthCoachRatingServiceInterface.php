<?php

namespace App\Contracts;

use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;

interface HealthCoachRatingServiceInterface
{
    /**
     * Get paginated health coach ratings with filters
     */
    public function getPaginatedRatings(Request $request, int $perPage = 20): Paginator;

    public function getRatingByIdForUser(int $ratingId, $user): ?\App\Models\HealthCoachRating;
    public function getHealthCoachNamesForUser($user): array;

    public function getReferralSources(): array;
}
