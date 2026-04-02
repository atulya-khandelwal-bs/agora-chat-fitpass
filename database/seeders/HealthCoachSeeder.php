<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HealthCoachSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('fitpass_health_coach')->updateOrInsert(
            ['health_coach_id' => 333],
            [
                'health_coach_name' => 'Dietitian',
                'status' => 2,
                'specialist' => 'Dietitian',
            ]
        );

        // Ensure coach id 4 exists (status 2 = active)
        if (DB::table('fitpass_health_coach')->where('health_coach_id', 4)->exists()) {
            DB::table('fitpass_health_coach')->where('health_coach_id', 4)->update([
                'health_coach_name' => 'Coach 4',
                'status' => 2,
            ]);
            return;
        }

        // Insert coaches 2 and 3 if missing so id 4 can be next, or insert 4 explicitly
        $maxId = DB::table('fitpass_health_coach')->max('health_coach_id') ?? 0;
        while ($maxId < 3) {
            $maxId++;
            DB::table('fitpass_health_coach')->insert([
                'health_coach_name' => 'Coach ' . $maxId,
                'status' => 2,
            ]);
        }
        DB::table('fitpass_health_coach')->insert([
            'health_coach_name' => 'Coach 4',
            'status' => 2,
        ]);
    }
}
