<?php

namespace App\Contracts;

use App\Models\FitpassUser;
use App\DTOs\FitpassUserDTO;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Database\Eloquent\Collection;

interface FitpassUserServiceInterface
{
    public function getPaginatedFitpassUsers(Request $request, int $perPage = 20): Paginator;
    
    public function getSearchCount(Request $request): int;
    public function getFitpassUserById(int $fitpassUserId): ?FitpassUserDTO;
    public function getFitpassUserByIdForUser(int $fitpassUserId, $user): ?FitpassUserDTO;
    public function getAssignedHealthCoachNamesForUser($user): array;
    public function getFitpassUserStatuses(): array;
    public function getFitpassUserTypes(): array;
}
