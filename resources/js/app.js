import "./bootstrap";
import "../scss/config/material/app.scss";
import "@vueform/slider/themes/default.css";
import "../scss/mermaid.min.css";

import { createApp, h } from "vue";
import { createInertiaApp, Link, Head, router } from "@inertiajs/vue3";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { ZiggyVue } from "ziggy-js";
import "aos/dist/aos.css";

import pinia from "./stores";
import i18n from "./i18n";

// Function to sync CSRF token from cookie to meta tag
const syncCSRFToken = () => {
    // Get token from cookie (both possible cookie names)
    const getCookieToken = (name) => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [cookieName, cookieValue] = cookie.trim().split('=');
            if (cookieName === name) {
                return decodeURIComponent(cookieValue);
            }
        }
        return null;
    };
    
    // Try to get token from custom cookie first, then default
    const token = getCookieToken('XSRF-TOKEN-FITFEAST-V2') || getCookieToken('XSRF-TOKEN');
    
    if (token) {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            metaTag.setAttribute('content', token);
        }
        // Also update axios default header
        if (typeof window !== 'undefined' && window.axios) {
            window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
        }
    }
};

const pluginLoaders = [
    () => import("bootstrap-vue-next"),
    () => import("click-outside-vue3"),
    () => import("vue3-apexcharts"),
    () => import("vue-the-mask"),
    () => import("vue-feather"),
];

const registerUiPlugins = async (app) => {
    const [
        { default: BootstrapVueNext },
        { default: vClickOutside },
        { default: VueApexCharts },
        { default: VueTheMask },
        { default: VueFeather },
    ] = await Promise.all(pluginLoaders.map((loader) => loader()));

    app.use(BootstrapVueNext);
    app.use(vClickOutside);
    app.use(VueApexCharts);
    app.use(VueTheMask);
    app.component(VueFeather.type, VueFeather);
};

const initAos = async () => {
    if (typeof window === "undefined") {
        return;
    }

    const { default: AOS } = await import("aos");
    AOS.init({
        easing: "ease-out-back",
        duration: 1000,
    });
};

createInertiaApp({
    title: (title) =>
        title ? `${title} | FITPASS | Corporate` : " FITPASS | Corporate",
    resolve: (name) =>
        // @ts-expect-error - resolvePageComponent return type mismatch with Inertia types (known issue with laravel-vite-plugin type definitions)
        resolvePageComponent(
            `./Pages/${name}.vue`,
            import.meta.glob("./Pages/**/*.vue")
        ),
    // @ts-expect-error - setup function is async to await plugin registration and AOS initialization, but Inertia types expect synchronous return (works correctly at runtime)
    setup: async ({ el, App, props, plugin }) => {
        const inertiaApp = createApp({ render: () => h(App, props) });

        inertiaApp
            .use(plugin)
            .use(pinia)
            .use(i18n)
            .use(ZiggyVue)
            .component("Link", Link)
            .component("Head", Head);

        if (typeof window !== "undefined") {
            await Promise.all([registerUiPlugins(inertiaApp), initAos()]);
            
            // Sync CSRF token after every Inertia navigation
            router.on('success', () => {
                // Small delay to ensure cookies are set by browser
                setTimeout(syncCSRFToken, 100);
            });
            
            // Also sync on finish (backup)
            router.on('finish', () => {
                setTimeout(syncCSRFToken, 100);
            });
            
            // Initial sync
            syncCSRFToken();
        }

        inertiaApp.mount(el);
    },
    progress: {
        color: "#4B5563",
    },
});
