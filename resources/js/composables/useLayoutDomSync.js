import { onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLayoutStore } from '@/stores/layout';

const isBrowser = () => typeof window !== 'undefined';

const setAttribute = (attribute, value, fallback) => {
    if (!isBrowser()) return;
    const normalized = value ?? fallback;
    document.documentElement.setAttribute(attribute, normalized);
};

const togglePreloader = (mode) => {
    if (!isBrowser()) return;
    const normalized = mode === 'enable' ? 'enable' : 'disable';
    setAttribute('data-preloader', normalized, 'disable');

    const preloader = document.getElementById('preloader');
    if (preloader) {
        if (normalized === 'enable') {
            preloader.style.opacity = '1';
            preloader.style.visibility = 'visible';
        } else {
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
        }
    }

    try {
        window.localStorage.setItem('data-preloader', normalized);
    } catch {
        // ignore storage errors
    }
};

export function useLayoutDomSync() {
    if (!isBrowser()) {
        return;
    }

    const layoutStore = useLayoutStore();
    const {
        layoutType,
        topbar,
        sidebarColor,
        sidebarSize,
        layoutWidth,
        position,
        sidebarView,
        sidebarImage,
        visibility,
        mode,
        preloader,
    } = storeToRefs(layoutStore);

    const stops = [];

    const register = (source, cb) => {
        const stop = watch(source, cb, { immediate: true });
        stops.push(stop);
    };

    register(layoutType, (value) => {
        setAttribute('data-layout', value, 'vertical');
        document.body.removeAttribute('style');
    });

    register(topbar, (value) => {
        setAttribute('data-topbar', value, 'dark');
    });

    register(sidebarColor, (value) => {
        setAttribute('data-sidebar', value, 'light');
    });

    register(sidebarSize, (value) => {
        setAttribute('data-sidebar-size', value, 'sm');
    });

    register(layoutWidth, (value) => {
        setAttribute('data-layout-width', value, 'fluid');
    });

    register(position, (value) => {
        setAttribute('data-layout-position', value, 'fixed');
    });

    register(sidebarView, (value) => {
        setAttribute('data-layout-style', value, 'default');
    });

    register(sidebarImage, (value) => {
        setAttribute('data-sidebar-image', value, 'none');
    });

    register(visibility, (value) => {
        setAttribute('data-sidebar-visibility', value, 'show');

        const hamburgerIcon = document.querySelector('.hamburger-icon');
        if (hamburgerIcon) {
            if (value === 'hidden') {
                hamburgerIcon.classList.add('open');
            } else {
                hamburgerIcon.classList.remove('open');
            }
        }
    });

    register(mode, (value) => {
        setAttribute('data-bs-theme', value, 'light');
    });

    register(preloader, (value) => {
        togglePreloader(value);
    });

    onMounted(() => {
        // Respect persisted preloader preference
        try {
            const stored = window.localStorage.getItem('data-preloader');
            if (stored) {
                togglePreloader(stored);
            }
        } catch {
            // ignore storage errors
        }
    });

    onUnmounted(() => {
        stops.forEach((stop) => stop && stop());
    });
}

