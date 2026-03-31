<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HolidayScopes
{
    /**
     * Scope to get active holidays
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 1);
    }

    /**
     * Scope to get public holidays
     */
    public function scopePublicHolidays(Builder $query): Builder
    {
        return $query->where('public_holiday', 1);
    }

    /**
     * Scope to get holidays within a date range
     */
    public function scopeInDateRange(Builder $query, $startDate, $endDate): Builder
    {
        // Ensure dates have time component for proper comparison
        $startDateTime = $startDate . ' 00:00:00';
        $endDateTime = $endDate . ' 23:59:59';
        
        return $query->where(function($q) use ($startDateTime, $endDateTime) {
            $q->whereBetween('start_date', [$startDateTime, $endDateTime])
              ->orWhereBetween('end_date', [$startDateTime, $endDateTime])
              ->orWhere(function($subQ) use ($startDateTime, $endDateTime) {
                  $subQ->where('start_date', '<=', $startDateTime)
                       ->where('end_date', '>=', $endDateTime);
              });
        });
    }

    /**
     * Scope to get holidays by status
     */
    public function scopeByStatus(Builder $query, $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get holidays by public holiday type
     */
    public function scopeByPublicHoliday(Builder $query, $isPublic): Builder
    {
        return $query->where('public_holiday', $isPublic ? 2 : 1);
    }

    /**
     * Scope to get holidays for specific health coach
     */
    public function scopeForHealthCoach(Builder $query, $healthCoachId): Builder
    {
        return $query->where('health_coach_id', $healthCoachId);
    }

    /**
     * Scope to get holidays by holiday group ID
     */
    public function scopeByHolidayGroup(Builder $query, $holidayId): Builder
    {
        return $query->where('holiday_id', $holidayId);
    }

    /**
     * Scope to get holidays created by specific user
     */
    public function scopeCreatedBy(Builder $query, $userId): Builder
    {
        return $query->where('created_by', $userId);
    }

    /**
     * Scope to get holidays within create time range
     */
    public function scopeCreatedBetween(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('create_time', [$startDate, $endDate]);
    }

    /**
     * Scope to get holidays with non-null holiday_id
     */
    public function scopeWithHolidayId(Builder $query): Builder
    {
        return $query->whereNotNull('holiday_id');
    }

    /**
     * Scope to get distinct holiday groups
     */
    public function scopeDistinctGroups(Builder $query): Builder
    {
        return $query->select('*')
            ->whereNotNull('holiday_id')
            ->distinct('holiday_id')
            ->orderBy('holiday_id')
            ->orderBy('team_holiday_calendar_id', 'desc');
    }
}
