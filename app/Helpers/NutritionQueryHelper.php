<?php

namespace App\Helpers;

/**
 * Nutrition Query Helper
 * 
 * Extracts repetitive JSONB operations for nutrition calculations.
 * Reduces 200+ lines of repetitive SQL to reusable methods.
 */
class NutritionQueryHelper
{
    /**
     * Meal categories
     */
    private const MEAL_CATEGORIES = [
        'early_morning',
        'mid_morning',
        'break_fast',
        'lunch',
        'tea_time',
        'pre_dinner',
        'dinner',
        'post_dinner'
    ];

    /**
     * Macro nutrients
     */
    private const MACROS = [
        'nf_calories',
        'nf_protein',
        'nf_carbs',
        'nf_fat',
        'nf_fibre'
    ];

    /**
     * Build SQL for extracting sum of a macro from a meal category and source
     * 
     * @param string $mealCategory Meal category (e.g., 'early_morning')
     * @param string $macro Macro name (e.g., 'nf_calories')
     * @param string $source Source type ('taken_by_user' or 'assigned_by_team')
     * @param string $tableAlias Table alias (default: 'fud')
     * @param bool $filterTaken Filter by food_taken_status = 'Yes' (only for taken_by_user)
     * @return string SQL expression
     */
    public static function buildMacroSumSql(
        string $mealCategory,
        string $macro,
        string $source,
        string $tableAlias = 'fud',
        bool $filterTaken = false
    ): string {
        $jsonPath = "{$tableAlias}.{$mealCategory}::jsonb";
        $sourcePath = "({$jsonPath})->'{$source}'";
        
        // For taken_by_user, include all items (don't filter by status)
        // Items in taken_by_user are already considered "taken" regardless of food_taken_status
        // For assigned_by_team, no filter is needed
        $whereClause = '';
        
        return "COALESCE((
            SELECT SUM(" . QueryHelper::extractNumericFromJsonb('el', $macro) . ") 
            FROM jsonb_array_elements(
                CASE 
                    WHEN jsonb_typeof({$sourcePath})='array' 
                    THEN {$sourcePath} 
                    ELSE '[]'::jsonb 
                END
            ) el{$whereClause}
        ), 0)";
    }

    /**
     * Build SQL for sum of a macro across all meal categories for a source
     * 
     * @param string $macro Macro name
     * @param string $source Source type
     * @param string $tableAlias Table alias
     * @param bool $filterTaken Filter by food_taken_status
     * @return string SQL expression
     */
    public static function buildTotalMacroSumSql(
        string $macro,
        string $source,
        string $tableAlias = 'fud',
        bool $filterTaken = false
    ): string {
        $sums = [];
        foreach (self::MEAL_CATEGORIES as $mealCategory) {
            $sums[] = self::buildMacroSumSql($mealCategory, $macro, $source, $tableAlias, $filterTaken);
        }
        
        return 'SUM(' . implode(' + ', $sums) . ')';
    }

    /**
     * Build complete nutrition summary select columns
     * 
     * @param string $tableAlias Table alias
     * @param bool $includeTaken Include taken macros (from taken_by_user)
     * @param bool $includeGiven Include given macros (from assigned_by_team)
     * @return array Array of select expressions
     */
    public static function buildNutritionSelectColumns(
        string $tableAlias = 'fud',
        bool $includeTaken = true,
        bool $includeGiven = true
    ): array {
        $columns = [
            QueryHelper::formatDate("{$tableAlias}.date_of_diet") . ' as date_of_diet',
            QueryHelper::statusToBoolean("MAX({$tableAlias}.status)") . ' as status_bool',
            QueryHelper::statusToBoolean("MAX({$tableAlias}.is_deleted)") . ' as deleted_bool',
        ];

        if ($includeTaken) {
            foreach (self::MACROS as $macro) {
                $macroName = str_replace('nf_', '', $macro) . '_taken';
                // Don't filter by food_taken_status for taken_by_user - all items in taken_by_user should be counted
                $columns[] = self::buildTotalMacroSumSql($macro, 'taken_by_user', $tableAlias, false) . " as {$macroName}";
            }
        }

        if ($includeGiven) {
            foreach (self::MACROS as $macro) {
                $macroName = str_replace('nf_', '', $macro) . '_given';
                $columns[] = self::buildTotalMacroSumSql($macro, 'assigned_by_team', $tableAlias, false) . " as {$macroName}";
            }
        }

        return $columns;
    }

    /**
     * Get meal categories (for iteration if needed)
     */
    public static function getMealCategories(): array
    {
        return self::MEAL_CATEGORIES;
    }

    /**
     * Get macro nutrients (for iteration if needed)
     */
    public static function getMacros(): array
    {
        return self::MACROS;
    }
}

