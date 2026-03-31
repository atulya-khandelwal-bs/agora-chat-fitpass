<?php

namespace App\Contracts;

use App\DTOs\HolidayEditDTO;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;

interface HolidayServiceInterface
{
    public function getPaginatedHolidays(Request $request, int $perPage = 20): Paginator;
    public function getHolidayForEdit(int $holidayId): HolidayEditDTO;
    public function createHoliday(array $data): array;
    public function updateHolidayGroup(int $holidayId, array $data): array;
    public function deleteHoliday(int $id): bool;
    public function getRelatedHolidays(int $holidayId);
    public function getActiveHealthCoaches();
    public function getDistinctCreatedByNames(): array;
    public function getDistinctApprovedByNames(): array;
}
