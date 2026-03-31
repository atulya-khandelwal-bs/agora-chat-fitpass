<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title inertia>FITPASS - Admin Dashboard</title>
    <meta name="description"
        content="FITPASS is a comprehensive admin and dashboard system built with Inertia.js, Vue.js, and Laravel, designed for fitness and wellness management.">
    <meta name="keywords"
        content="FITPASS, Inertia.js, Vue.js, Laravel, admin template, dashboard template, fitness management">
    <meta name="author" content="FITPASS">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- Social Media Meta Tags -->
    <meta property="og:title" content="FITPASS - Admin Dashboard">
    <meta property="og:description"
        content="FITPASS is a comprehensive admin and dashboard system built with Inertia.js, Vue.js, and Laravel, designed for fitness and wellness management.">
    <meta property="og:image" content="URL to the template's logo or featured image">
    <meta property="og:url" content="URL to the template's webpage">
    <meta name="twitter:card" content="summary_large_image">

    <!-- App favicon -->
    <link rel="icon" type="image/svg+xml" href="{{ asset('image/fitpassLogo-sm.svg') }}">
    <link rel="shortcut icon" href="{{ asset('image/fitpassLogo-sm.svg') }}">

    <!-- Scripts -->
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.js'])
    @inertiaHead

    <style>
        .container-fluid:has(.task-management-page) { 
              padding: 0; 
         }
    </style>
    
</head>

<body>
    @inertia
</body>

</html>
