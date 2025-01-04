
import * as fs from 'node:fs';

declare global {

	namespace Electron {

		interface Menu {

			items: MenuItem[];

			clear();
			append(item: MenuItem);
			insert(pos: number, item: MenuItem);

		};

		class MenuItem {

			id: string;
			enabled: boolean;
			visible: boolean;
			checked: boolean;
			label: string;
			click();
			submenu:Menu;
			
			constructor(props: MenuItemOptions);
		
			id: string;
			enabled: boolean;
			visible?: boolean;
			submenu?: Menu;
		
		}

		type MenuItemOptions = Partial<{
			click: () => any,
			role: string,
			type: MenuItemType,
			label: string,
			sublabel: string,
			icon: any,
			enabled: boolean,
			visible: boolean,
			checked: boolean,
			submenu: MenuItem[] | Menu,
			id: string,
			position: string,
		}>;

		type MenuItemType =
			'normal'	|
			'separator'	|
			'submenu'	|
			'checkbox'	|
			'radio'		;

		interface App {
			getPath:		(name: string) => string;
		}
		
		interface Dialog {
			showMessageBox: (options: DialogMessageOptions) => number;
		}

		type DialogMessageOptions = {

			/**
			 * On Windows, "question" displays the same icon as "info", unless you set an icon using the "icon" option.
			 * On macOS, both "warning" and "error" display the same warning icon.
			 */
			type?: DialogMessageType,
			
			/**
			 * Array of texts for buttons.
			 * On Windows, an empty array will result in one button labeled "OK".
			 */
			buttons: string[],
			
			/** Content of the message box. */
			message: string,
			
			/** Title of the message box, some platforms will not show it. */
			title?: string,
			
			/** Extra information of the message. */
			detail?: string,
			
			/**  If provided, the message box will include a checkbox with the given label. */
			checkboxLabel?: string,
			
			/** Initial checked state of the checkbox. false by default. */
			checkboxChecked?: boolean,
			
			/**
			 * The index of the button to be used to cancel the dialog, via the Esc key.
			 * By default this is assigned to the first button with "cancel" or "no" as the label.
			 * If no such labeled buttons exist and this option is not set, 0 will be used as the return value.
			 */
			cancelId?: number,
			
			/** Index of the button in the buttons array which will be selected by default when the message box opens. */
			defaultId?: number,
			
			/**
			 * On Windows Electron will try to figure out which one of the buttons are common buttons (like "Cancel" or "Yes"), and show the others as command links in the dialog.
			 * This can make the dialog appear in the style of modern Windows apps.
			 * If you don't like this behavior, you can set noLink to true
			 */
			noLink?: boolean,

		};

		type DialogMessageType =
			'none'		|
			/** On Windows, "question" displays the same icon as "info" */
			'info'		|
			/** On macOS, both "warning" and "error" display the same warning icon. */
			'error'		|
			/** On Windows, "question" displays the same icon as "info" */
			'question'	|
			/** On macOS, both "warning" and "error" display the same warning icon. */
			'warning'	;

	};
	
	const Electron_Menu: Electron.Menu;
	const Electron_MenuItem: typeof Electron.MenuItem;
	const Electron_App: Electron.App;
	const Electron_FS: typeof fs;
	const Electron_Dialog: Electron.Dialog;

};

export {};
