<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

/**
 * Query Helper Class
 * 
 * Provides reusable methods for common query patterns to reduce raw SQL usage
 * and make queries more maintainable and database-agnostic where possible.
 */
class QueryHelper
{
    /**
     * Case-insensitive LIKE search (abstracts ILIKE for PostgreSQL)
     */
    public static function caseInsensitiveLike(string $column, string $value): array
    {
        return [$column, 'ilike', '%' . $value . '%'];
    }

    /**
     * Numeric cast for text search (PostgreSQL specific - ::text)
     */
    public static function castToText(string $column): string
    {
        return $column . '::text';
    }

    /**
     * Format date for display (PostgreSQL TO_CHAR)
     * Business logic extracted from SQL
     */
    public static function formatDate(string $column, string $format = 'YYYY-MM-DD'): string
    {
        return "TO_CHAR({$column}, '{$format}')";
    }

    /**
     * Map status to boolean string (extracts business logic from SQL)
     */
    public static function statusToBoolean(string $column, int $activeValue = 2): string
    {
        return "CASE WHEN {$column} = {$activeValue} THEN 'Yes' ELSE 'No' END";
    }

    /**
     * Safe numeric extraction from JSONB (handles null/empty)
     */
    public static function extractNumericFromJsonb(string $jsonPath, string $key): string
    {
        return "COALESCE(NULLIF({$jsonPath}->>'{$key}','')::numeric,0)";
    }

    /**
     * Build date range filter (optimized)
     */
    public static function applyDateRange($query, string $column, ?string $from, ?string $to, bool $includeTime = true): void
    {
        if ($from && $to) {
            $fromValue = $includeTime ? $from . ' 00:00:00' : $from;
            $toValue = $includeTime ? $to . ' 23:59:59' : $to;
            $query->whereBetween($column, [$fromValue, $toValue]);
        } elseif ($from) {
            $fromValue = $includeTime ? $from . ' 00:00:00' : $from;
            $query->where($column, '>=', $fromValue);
        } elseif ($to) {
            $toValue = $includeTime ? $to . ' 23:59:59' : $to;
            $query->where($column, '<=', $toValue);
        }
    }

    /**
     * Build numeric range filter
     */
    public static function applyNumericRange($query, string $column, ?float $min, ?float $max): void
    {
        if ($min !== null) {
            $query->where($column, '>=', $min);
        }
        if ($max !== null) {
            $query->where($column, '<=', $max);
        }
    }
}

