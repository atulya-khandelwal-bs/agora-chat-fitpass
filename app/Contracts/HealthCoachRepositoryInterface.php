<?php

namespace App\Contracts;

use App\Models\HealthCoach;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Database\Eloquent\Collection;

interface HealthCoachRepositoryInterface
{
    public function getPaginatedHealthCoaches(Request $request, int $perPage = 20): Paginator;
    public function findById(int $id): ?HealthCoach;
    public function create(array $data): HealthCoach;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function getActiveHealthCoaches(): Collection;
    public function getHealthCoachForEdit(int $healthCoachId): ?HealthCoach;
    public function getHealthCoachNames(): array;
    public function getAssignedHealthCoachNames(): array;
}