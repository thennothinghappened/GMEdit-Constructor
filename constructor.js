function GMConstructor() {

    this.plugin_name = 'GMEdit-Constructor';
    this.version = '0.1.0';

    /**
     * @param {string|Error} error
     */
    this.showError = (error) => {
        console.log(`${this.plugin_name}: ${error}`);
    }

    this.preferences = new GMConstructorPreferences(this.plugin_name, this.version, this.showError);
    this.menu = new GMConstructorMenu(this.showError);

    this.onProjectOpen = () => {
        this.menu.setEnableMenuItems(true);
    }

    this.onProjectClose = () => {
        this.menu.setEnableMenuItems(false);
    }

    this.init = () => {
        this.preferences.init();
        this.menu.init();

        GMEdit.on('projectOpen', this.onProjectOpen);
        GMEdit.on('projectClose', this.onProjectClose);
    }

    this.cleanup = () => {
        this.preferences.cleanup();
        this.menu.cleanup();

        GMEdit.off('projectOpen', this.onProjectOpen);
        GMEdit.off('projectClose', this.onProjectClose);
    }
}

gmConstructor = new GMConstructor();

GMEdit.register(gmConstructor.plugin_name, {
    init: () => {},
    cleanup: gmConstructor.cleanup
});

// workaround at the moment since reloading doesn't call init again:
// https://github.com/YellowAfterlife/GMEdit/issues/201
gmConstructor.init();
