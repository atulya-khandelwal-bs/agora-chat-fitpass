<?php

namespace App\Contracts;

use App\Models\FitpassUser;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;

interface FitpassUserRepositoryInterface
{
    public function getPaginatedFitpassUsers(Request $request, int $perPage = 20, ?array $healthCoachIds = null): Paginator;
    public function findById(int $id): ?FitpassUser;
    public function getSearchCount(Request $request, ?array $healthCoachIds = null): int;
    public function getFitpassUserStatuses(): array;
    public function getFitpassUserTypes(): array;
}
