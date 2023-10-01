
class GMConstructor {

    static plugin_name = 'constructor';
    static version = '0.1.0';
    
    static init = () => {

    }

    static cleanup = () => {

    }
}

GMEdit.register(GMConstructor.plugin_name, {
    init: GMConstructor.init,
    cleanup: GMConstructor.cleanup
});

