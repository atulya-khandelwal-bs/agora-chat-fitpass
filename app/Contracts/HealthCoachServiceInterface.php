<?php

namespace App\Contracts;

use App\DTOs\HealthCoachDTO;
use App\DTOs\HealthCoachEditDTO;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Database\Eloquent\Collection;

interface HealthCoachServiceInterface
{
    public function getPaginatedHealthCoaches(Request $request, int $perPage = 20): Paginator;
    public function getHealthCoachForEdit(int $healthCoachId): HealthCoachEditDTO;
    public function createHealthCoach(array $data): array;
    public function updateHealthCoach(int $healthCoachId, array $data): array;
    public function deleteHealthCoach(int $healthCoachId): bool;
    public function getActiveHealthCoaches(): Collection;
    public function getHealthCoachNames(): array;
    public function getAssignedHealthCoachNames(): array;
}
