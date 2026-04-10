window.App = window.App || {};
App.compat = App.compat || {};

Object.assign(App.compat, {
    init() {
        if (!App.config?.ui?.enableCompatStyles) return;
        this.apply(document);
    },

    apply(root = document) {
        if (!root || typeof root.querySelectorAll !== "function") return;

        this.aliasClass(root, ".btn", "dm-btn");
        this.aliasClass(root, ".btn-primary", "dm-btn-primary");
        this.aliasClass(root, ".btn-secondary", "dm-btn-secondary");
        this.aliasClass(root, ".card", "dm-card");
        this.aliasClass(root, ".form-group", "dm-form-group");
        this.aliasClass(root, ".grid-2", "dm-grid-2");
        this.aliasClass(root, ".grid-3", "dm-grid-3");
    },

    aliasClass(root, selector, newClass) {
        root.querySelectorAll(selector).forEach(el => {
            if (!el.classList.contains(newClass)) {
                el.classList.add(newClass);
            }
        });
    }
});
