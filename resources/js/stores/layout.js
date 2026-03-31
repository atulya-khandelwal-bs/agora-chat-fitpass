import { defineStore } from 'pinia';

const defaultState = () => ({
    layoutType: 'vertical',
    layoutWidth: 'fluid',
    sidebarSize: 'sm',
    topbar: 'dark',
    mode: 'light',
    position: 'fixed',
    sidebarView: 'default',
    sidebarColor: 'light',
    sidebarImage: 'none',
    preloader: 'disable',
    visibility: 'show',
});

export const useLayoutStore = defineStore('layout', {
    state: defaultState,
    actions: {
        changeLayoutType(layoutType) {
            this.layoutType = layoutType;
            document.body.removeAttribute("style");
        },
        changeLayoutWidth(layoutWidth) {
            this.layoutWidth = layoutWidth;
        },
        changeSidebarSize(sidebarSize) {
            this.sidebarSize = sidebarSize;
        },
        changeTopbar(topbar) {
            this.topbar = topbar;
        },
        changeMode(mode) {
            this.mode = mode;
        },
        changePosition(position) {
            this.position = position;
        },
        changeSidebarView(sidebarView) {
            this.sidebarView = sidebarView;
        },
        changeSidebarColor(sidebarColor) {
            this.sidebarColor = sidebarColor;
        },
        changeSidebarImage(sidebarImage) {
            this.sidebarImage = sidebarImage;
        },
        changePreloader(preloader) {
            this.preloader = preloader;
        },
        changeVisibility(visibility) {
            this.visibility = visibility;
        },
        reset() {
            Object.assign(this, defaultState());
        },
    },
});

