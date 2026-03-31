<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CorporateHelper
{
    /**
     * Get a cached list of active corporate names for dropdown filters.
     */
    public static function getCorporateNames(): array
    {
        return Cache::remember('corporate_names_list', 3600, function () {
            return DB::table('fitpass_corporates')
                ->select('company_name')
                ->whereNotNull('company_name')
                ->orderBy('company_name')
                ->pluck('company_name')
                ->filter()
                ->unique()
                ->values()
                ->toArray();
        });
    }
}

