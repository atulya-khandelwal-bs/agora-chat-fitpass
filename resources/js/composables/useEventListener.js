import { onMounted, onUnmounted } from 'vue';

const isBrowser = () => typeof window !== 'undefined';

export function useEventListener(target, event, handler, options) {
    let cleanup;

    const attach = () => {
        if (!isBrowser()) return;
        const resolvedTarget =
            typeof target === 'function'
                ? target() ?? null
                : target ?? window;

        if (!resolvedTarget?.addEventListener) {
            return;
        }

        resolvedTarget.addEventListener(event, handler, options);
        cleanup = () => {
            resolvedTarget.removeEventListener(event, handler, options);
        };
    };

    onMounted(attach);
    onUnmounted(() => {
        if (cleanup) {
            cleanup();
            cleanup = undefined;
        }
    });
}

