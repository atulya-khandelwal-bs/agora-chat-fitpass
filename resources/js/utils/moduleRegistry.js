// Simple frontend helper to consume backend-provided module registry
// and offer convenient lookup utilities for pages and menus.

export function getModulesFromPageProps(pageProps) {
    return (pageProps?.modules ?? []);
}

export function findModuleByKey(modules, key) {
    return modules.find(m => m.key === key);
}

export function buildMenuItems(modules) {
    return modules.map(m => ({
        key: m.key,
        icon: m.icon,
        label: m.name,
        route: m.route,
    }));
}

export function resolvePagePath(mod) {
    // Returns the Inertia page path like 'holiday/index'
    return mod?.page ?? null;
}


