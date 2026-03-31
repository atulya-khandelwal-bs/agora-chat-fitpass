import { defineStore } from 'pinia';

const toArray = (value) => (Array.isArray(value) ? value : []);

const toObject = (value) =>
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const useMenuStore = defineStore('menu', {
    state: () => ({
        allowed: [],
        config: {},
        hydrated: false,
    }),
    getters: {
        items: (state) => {
            if (!state.allowed.length) {
                return [];
            }

            return state.allowed
                .map((key) => {
                    const meta = state.config[key] || {};
                    if (!key) {
                        return null;
                    }

                    return {
                        key,
                        label: meta.label || key,
                        route: meta.route || '#',
                        icon: meta.icon || 'ri-file-list-line',
                    };
                })
                .filter(Boolean);
        },
    },
    actions: {
        hydrateFromPageProps(props) {
            if (!props) {
                return;
            }

            const payload = props.menuPayload ?? props.menu_payload ?? null;
            const allowedMenus = toArray(
                payload?.allowed ?? props.allowedMenus ?? props.allowed_menus
            );
            const menuConfig = toObject(
                payload?.config ?? props.menuConfig ?? props.menu_config
            );

            const shouldUpdate =
                this.hydrated === false ||
                allowedMenus.toString() !== this.allowed.toString() ||
                JSON.stringify(menuConfig) !== JSON.stringify(this.config);

            if (!shouldUpdate) {
                return;
            }

            this.allowed = allowedMenus;
            this.config = menuConfig;
            this.hydrated = true;
        },
    },
});

