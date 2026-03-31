<?php

return [
    // High-level module registry. Add/remove modules without touching code.
    'list' => [
        [
            'key' => 'holiday',
            'name' => 'Manage Holidays',
            'icon' => 'ri-calendar-2-line',
            'route' => 'holiday.index',
            'page' => 'holiday/index',
            'permissions' => [],
        ],
        [
            'key' => 'health-coach',
            'name' => 'Manage Coaches',
            'icon' => 'ri-user-heart-line',
            'route' => 'health-coach.index',
            'page' => 'health-coach/index',
            'permissions' => [],
        ],
        [
            'key' => 'coach-ratings',
            'name' => 'Manage Ratings',
            'icon' => 'ri-star-smile-line',
            'route' => 'coach-ratings.index',
            'page' => 'coach-ratings/index',
            'permissions' => [],
        ],
        [
            'key' => 'diets',
            'name' => 'Manage Diets',
            'icon' => 'ri-restaurant-line',
            'route' => 'manage-diets.index',
            'page' => 'diets/index',
            'permissions' => [],
        ],
        [
            'key' => 'call-schedule',
            'name' => 'Manage Calls',
            'icon' => 'ri-phone-line',
            'route' => 'call-schedule.index',
            'page' => 'call-schedule/index',
            'permissions' => [],
        ],
        [
            'key' => 'fitpass-users',
            'name' => 'Manage Users',
            'icon' => 'ri-group-line',
            'route' => 'fitpass-users.index',
            'page' => 'fitpass-users/index',
            'permissions' => [],
        ],
        [
            'key' => 'third-party-users',
            'name' => 'Manage Third Party Users',
            'icon' => 'ri-building-line',
            'route' => 'third-party-users.index',
            'page' => 'third-party-users/index',
            'permissions' => [],
        ],
        [
            'key' => 'task-management',
            'name' => 'Manage Tasks',
            'icon' => 'ri-task-line',
            'route' => 'task-management.index',
            'page' => 'task-management/index',
            'permissions' => [],
        ],
    ],
];


