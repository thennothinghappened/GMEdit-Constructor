# GMEdit-Constructor
As the title suggests, Constructor is a plugin for YellowAfterlife's [GMEdit](<https://github.com/YellowAfterlife/GMEdit>), which allows you to compile from the editor just as you can in the GameMaker IDE.

For projects targetting new(ish) versions of GameMaker, Constructor is generally a more capable and
stable option to the older [builder](<https://github.com/YAL-GMEdit/builder>), as it uses the
compilation toolchain instead of invoking the asset compiler directly. If you are working on a
codebase that must remain on a legacy (<2.3) version of GameMaker, use builder instead.

Constructor can compile for the current build target (your OS), web targets (HTML5 and WASM),
and can switch between build configs.

## Features
- **Easily run, package releases, or clean projects from GMEdit!**
  - **Execute multiple builds side-by-side** in managed separate directories (disable reusing tabs for this.)
  - **Build and Runtime error parsing** (view them nice and neat rather than scrolling the log!)
  - **Close a build tab to stop it** (or use the hotkey.)
- **Switch between VM or YYC**. (Building for other systems is planned, eventually.)
- **Switch build configurations** (`#macro Config:SOMETHING ...`) via the Control Panel, or by right-clicking a config in the project sidebar.
- **Support for Beta, Monthly, and LTS runtimes**, with a per-project switch, and warnings for project-incompatible selections.
- **Support for HTML5 and GX.Games targets**. Note that the "Package" option for both of these is currently not working YYG have not documented its usage for these targets, and the IDE uses a proprietary extra-undocumented method.
- **Automatic update-checking**. (This calls the GitHub API to check the latest release and can be toggled off.)
- **Readable, central error messages** - the Control Panel shows any configuration issues, or internal errors. All errors display context, and most try to provide tips to resolve the issue where possible.
- **Android support and remote build targets** - you can compile for an Android device, or an external Linux or MacOS device by configuring the devices in the IDE and selecting them in Constructor.

![image](https://github.com/user-attachments/assets/9a54d555-091b-42fc-a7cc-9f6c625712f5)

## Installation
Installation is the same here as any other GMEdit plugin - clone it into your `plugins` folder (see below), or download the `.zip` from *Releases*, and extract the contained folder into `plugins`.

### Windows
```sh
git clone https://github.com/thennothinghappened/GMEdit-Constructor %appdata%\AceGM\GMEdit\plugins\GMEdit-Constructor
```

### MacOS
```sh
git clone https://github.com/thennothinghappened/GMEdit-Constructor "~/Library/Application Support/AceGM/GMEdit/plugins/GMEdit-Constructor"
```

### Linux
```sh
git clone https://github.com/thennothinghappened/GMEdit-Constructor "~/.config/AceGM/GMEdit/plugins/GMEdit-Constructor"
```

See [GMEdit#Installing plugins](https://github.com/YellowAfterlife/GMEdit/wiki/Using-plugins#installing-plugins)
for more details!

## Keyboard Shortcuts

| Shortcut                          | Key                |
| --------------------------------- | ------------------ |
| View the Control Panel            | <kbd>Ctrl+\`</kbd> |
| Run the current project           | <kbd>F5</kbd>      |
| Clean the current project's files | <kbd>Ctrl+F7</kbd> |
| Stop the current compile job      | <kbd>F6</kbd>      |
| Package the current project       | <kbd>Ctrl+F5</kbd> |

The above are the defaults provided. You can rebind these through GMEdit's
**Edit Keyboard Shortcuts** option in Preferences!

## Planned features include:
- Option for docked console as opposed to full-window

## Issues
If you have any issues with Constructor, feel free to either ask on Discord (below), or make a post on the [GitHub Issues](<https://github.com/thennothinghappened/GMEdit-Constructor/issues>) page. I'll try to get back to you when I can, but no guarantees.

## Feature requests
If there's anything else you'd like out of Constructor that isn't mentioned here, the same applies as above with issues - make a feature request by opening an issue on GitHub!

I hope Constructor is a useful tool - though please note that I can only test on the machines I have available to me, so there's gonna be edge cases.

Finally, I also have a thread for this project on the [GameMaker Kitchen Discord server](https://discord.com/channels/724320164371497020/1208360272570490930), for quick feedback!

Thanks, and have fun :)
