const isBrowser = () => typeof window !== 'undefined';

const toggleClass = (element, className, force) => {
    if (!element) return;
    if (typeof force === 'boolean') {
        element.classList.toggle(className, force);
    } else {
        element.classList.toggle(className);
    }
};

export function useSidebarToggle() {
    const toggleHamburgerMenu = () => {
        if (!isBrowser()) return;

        const doc = document.documentElement;
        const layoutType = doc.getAttribute("data-layout");
        const visibilityType = doc.getAttribute("data-sidebar-visibility");
        const windowSize = document.documentElement.clientWidth;
        const hamburgerIcon = document.querySelector(".hamburger-icon");

        doc.setAttribute("data-sidebar-visibility", "show");

        // Collapse horizontal menu
        if (layoutType === "horizontal") {
            toggleClass(document.body, "menu");
        }

        const isVertical = layoutType === "vertical" || layoutType === "semibox";
        if (visibilityType === "show" && isVertical) {
            if (windowSize <= 787) {
                const isSidebarEnabled = document.body.classList.contains("vertical-sidebar-enable");
                document.body.classList.toggle("vertical-sidebar-enable");
                doc.setAttribute("data-sidebar-size", "sm");
                toggleClass(hamburgerIcon, "open", !isSidebarEnabled);
            } else {
                document.body.classList.remove("vertical-sidebar-enable");
                const currentSize = doc.getAttribute("data-sidebar-size");
                doc.setAttribute("data-sidebar-size", currentSize === "lg" ? "sm" : "lg");
                toggleClass(hamburgerIcon, "open");
            }
        }

        if (layoutType === "twocolumn") {
            toggleClass(document.body, "twocolumn-panel");
        }
    };

    return {
        toggleHamburgerMenu,
    };
}

