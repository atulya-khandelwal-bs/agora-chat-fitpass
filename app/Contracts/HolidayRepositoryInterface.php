<?php

namespace App\Contracts;

use App\Models\HolidayCalendar;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;

interface HolidayRepositoryInterface
{
    public function getPaginatedHolidays(Request $request, int $perPage = 20, ?array $healthCoachIds = null, ?int $createdById = null, ?string $createdByName = null): Paginator;
    public function findByHolidayId(int $holidayId): ?HolidayCalendar;
    public function getHolidayForEditOptimized(int $holidayId): ?array;
    public function getSelectedHealthcoachIds(int $holidayId): array;
    public function getRelatedHolidays(int $holidayId);
    public function getMaxHolidayId(): int;
    public function deleteHolidayGroup(int $holidayId): bool;
    public function findById(int $id): ?HolidayCalendar;
    public function getDistinctCreatedByNames(?array $healthCoachIds = null, ?int $createdById = null, ?string $createdByName = null): array;
    public function getDistinctApprovedByNames(?array $healthCoachIds = null, ?int $createdById = null, ?string $createdByName = null): array;
}
