<?php

namespace App\Contracts;

use Illuminate\Http\Request;

interface DietRepositoryInterface
{
    public function getPaginatedDiets(Request $request, int $perPage = 20, ?array $healthCoachIds = null): array;
    public function findById(int $id);
    public function getNutritionSummaryByUser(int $userId, int $limit = 100): array;
    public function getNutritionSummaryByDietToken(int $dietTokenId, int $limit = 100): array;
    public function getNutritionSummaryByUsersDietsId(int $usersDietsId, int $limit = 100): array;
}
