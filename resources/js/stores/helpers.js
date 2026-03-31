import { storeToRefs } from 'pinia';
import { useLayoutStore } from './layout';
import { useNotificationStore } from './notification';
import { useTodoStore } from './todo';

// Layout store helpers
export function useLayoutComputed() {
    const layoutStore = useLayoutStore();
    return storeToRefs(layoutStore);
}

export function useLayoutMethods() {
    const layoutStore = useLayoutStore();
    return {
        changeLayoutType: (layoutType) => layoutStore.changeLayoutType(layoutType),
        changeLayoutWidth: (layoutWidth) => layoutStore.changeLayoutWidth(layoutWidth),
        changeSidebarSize: (sidebarSize) => layoutStore.changeSidebarSize(sidebarSize),
        changeTopbar: (topbar) => layoutStore.changeTopbar(topbar),
        changeMode: (mode) => layoutStore.changeMode(mode),
        changePosition: (position) => layoutStore.changePosition(position),
        changeSidebarView: (sidebarView) => layoutStore.changeSidebarView(sidebarView),
        changeSidebarColor: (sidebarColor) => layoutStore.changeSidebarColor(sidebarColor),
        changeSidebarImage: (sidebarImage) => layoutStore.changeSidebarImage(sidebarImage),
        changePreloader: (preloader) => layoutStore.changePreloader(preloader),
        changeVisibility: (visibility) => layoutStore.changeVisibility(visibility),
    };
}

// Notification store helpers
export function useNotificationMethods() {
    const notificationStore = useNotificationStore();
    return {
        success: (message) => notificationStore.success(message),
        error: (message) => notificationStore.error(message),
        clear: () => notificationStore.clear(),
    };
}

// Todo store helpers
export function useTodoComputed() {
    const todoStore = useTodoStore();
    return storeToRefs(todoStore);
}

export function useTodoMethods() {
    const todoStore = useTodoStore();
    return {
        fetchTodos: () => todoStore.fetchTodos(),
    };
}

// Legacy compatibility exports (for gradual migration)
// Returns an object with computed getters that access the store lazily
export const layoutComputed = {
    layoutType() {
        return useLayoutStore().layoutType;
    },
    sidebarSize() {
        return useLayoutStore().sidebarSize;
    },
    layoutWidth() {
        return useLayoutStore().layoutWidth;
    },
    topbar() {
        return useLayoutStore().topbar;
    },
    mode() {
        return useLayoutStore().mode;
    },
    position() {
        return useLayoutStore().position;
    },
    sidebarView() {
        return useLayoutStore().sidebarView;
    },
    sidebarColor() {
        return useLayoutStore().sidebarColor;
    },
    sidebarImage() {
        return useLayoutStore().sidebarImage;
    },
    visibility() {
        return useLayoutStore().visibility;
    },
};

export const layoutMethods = {
    changeLayoutType: (layoutType) => useLayoutStore().changeLayoutType(layoutType),
    changeLayoutWidth: (layoutWidth) => useLayoutStore().changeLayoutWidth(layoutWidth),
    changeSidebarSize: (sidebarSize) => useLayoutStore().changeSidebarSize(sidebarSize),
    changeTopbar: (topbar) => useLayoutStore().changeTopbar(topbar),
    changeMode: (mode) => useLayoutStore().changeMode(mode),
    changePosition: (position) => useLayoutStore().changePosition(position),
    changeSidebarView: (sidebarView) => useLayoutStore().changeSidebarView(sidebarView),
    changeSidebarColor: (sidebarColor) => useLayoutStore().changeSidebarColor(sidebarColor),
    changeSidebarImage: (sidebarImage) => useLayoutStore().changeSidebarImage(sidebarImage),
    changePreloader: (preloader) => useLayoutStore().changePreloader(preloader),
    changeVisibility: (visibility) => useLayoutStore().changeVisibility(visibility),
};

export const notificationMethods = {
    success: (message) => useNotificationStore().success(message),
    error: (message) => useNotificationStore().error(message),
    clear: () => useNotificationStore().clear(),
};

export const todoComputed = {
    todos() {
        return useTodoStore().todos;
    },
};

export const todoMethods = {
    fetchTodos: () => useTodoStore().fetchTodos(),
};

// Legacy auth methods (stubs for compatibility - these may not be used)
export const authMethods = {
    logIn: () => {
        console.warn('authMethods.logIn is deprecated and not implemented');
    },
    logOut: () => {
        console.warn('authMethods.logOut is deprecated and not implemented');
    },
    register: () => {
        console.warn('authMethods.register is deprecated and not implemented');
    },
    resetPassword: () => {
        console.warn('authMethods.resetPassword is deprecated and not implemented');
    },
};

export const authFackMethods = {
    login: () => {
        console.warn('authFackMethods.login is deprecated and not implemented');
    },
    registeruser: () => {
        console.warn('authFackMethods.registeruser is deprecated and not implemented');
    },
    logout: () => {
        console.warn('authFackMethods.logout is deprecated and not implemented');
    },
};

