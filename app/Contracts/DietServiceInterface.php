<?php

namespace App\Contracts;

use Illuminate\Http\Request;

interface DietServiceInterface
{
    public function getPaginatedDiets(Request $request, int $perPage = 20): array;
    public function getDietById(int $id);
    public function getDietByIdForUser(int $id, $user);
    public function canUserAccessDietTokenForUser(int $dietTokenId, $user): bool;
    public function canUserAccessUsersDietsIdForUser(int $usersDietsId, $user): bool;
    public function canUserAccessUserIdForUser(int $userId, $user): bool;
    public function getNutritionSummaryByUser(int $userId, int $limit = 100): array;
    public function getNutritionSummaryByDietToken(int $dietTokenId, int $limit = 100): array;
    public function getNutritionSummaryByUsersDietsId(int $usersDietsId, int $limit = 100): array;
}
