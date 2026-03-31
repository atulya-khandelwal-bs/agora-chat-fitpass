/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

// Ziggy route helper types
declare global {
    interface Window {
        route?: (name: string, params?: Record<string, any>) => string;
    }
    
    // Global route function provided by Ziggy
    function route(name: string, params?: Record<string, any>): string;
}

export {};

