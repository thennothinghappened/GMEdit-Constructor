import { Job } from '../../compiler/job/Job.js';

const Editor = $gmedit['editors.Editor'];
const FileKind = $gmedit['file.FileKind'];
const GmlFile = $gmedit['gml.file.GmlFile'];

/**
 * # Note to self about how GMEdit does this stuff:
 * (unfortunately it still makes me do a mental backflip tryna understand it properly)
 * 
 * We have a class extending {@link FileKind}, which gets called on opening a 'file' (* doesn't have to be a real file)
 * of that file kind.
 * 
 * The 'file kind' class takes in an instance of an {@link GmlFile} and assigns its `editor`
 * property to the given editor class extending {@link Editor}, of which an instance of that class
 * gets a HTML element corresponding to the tab's body to put whatever it wants in.
 * 
 * So all in all, we've got a file kind class which you pass off to the GmlFile constructor,
 * which then runs the init method of that file kind class, which assigns an editor, which
 * assigns `this.element`, which then gets pasted into the tab when you view that tab.
 * 
 * Technically nothing actually has to be file-related in this process, but you kinda have
 * to lie to GMEdit to get it to cooperate with that.
 */

/**
 * 'File type' for our general-purpose editor view thingo.
 */
export class ConstructorViewFileKind extends FileKind {

	constructor() {
		super();
		this.checkSelfForChanges = false;
	}

	/**
	 * Initialise an instance of a file of this type.
	 * @param {GmlFile} file
	 * @param {any} [data]
	 */
	init = (file, data) => {
		file.editor = new ConstructorEditorView(file);
	}

}

/**
 * 'Editor' for viewing a compile log all fancy.
 */
export class ConstructorEditorView extends Editor {

	static fileKind = new ConstructorViewFileKind();

	/**
	 * @param {GmlFile} file
	 */
	constructor(file) {

		super(file);

		this.element = document.createElement('div');
		this.element.classList.add('gm-constructor-tab');
		// @ts-ignore
		this.element.__gmedit_constructor_editor = this;

	}

	/**
	 * Callback to run when this editor is no longer the current tab.
	 */
	onDeselectEditor = () => {
		return;
	}

	/**
	 * Callback to run when this editor becomes the current tab.
	 */
	onSelectEditor = () => {
		return;
	}

	/**
	 * Called when closing the tab.
	 */
	destroy = () => {
		return;
	}

	/**
	 * Bring this tab into focus.
	 */
	focus = () => {
		this.file.tabEl.click();
	}

}

/**
 * Observer for watching mutations to the tab list so we can find when our tabs are added or
 * removed.
 */
const mutation_observer = new MutationObserver((mutations) => {

	for (const mutation of mutations) {

		for (const removedNode of Array.from(mutation.removedNodes)) {
			
			if (
				'__gmedit_constructor_editor' in removedNode && 
				removedNode.__gmedit_constructor_editor instanceof ConstructorEditorView
			) {
				removedNode.__gmedit_constructor_editor.onDeselectEditor();
			}

		}

		for (const addedNode of Array.from(mutation.addedNodes)) {
			
			if (
				'__gmedit_constructor_editor' in addedNode && 
				addedNode.__gmedit_constructor_editor instanceof ConstructorEditorView
			) {
				addedNode.__gmedit_constructor_editor.onSelectEditor();
			}

		}

	}

});

/** 
 * The target for the observer, which is the tab body.
 * 
 * @type {HTMLDivElement?}
 */
let mutation_observer_target = null;

/**
 * Setup the mutation observer to watch tab changes.
 */
export function __setup__() {

	mutation_observer_target = document.querySelector('.tabview');

	if (mutation_observer_target !== null) {
		mutation_observer.observe(mutation_observer_target, {
			childList: true
		});
	}

}

/**
 * Disconnect the mutation observer.
 */
export function __cleanup__() {
	mutation_observer.disconnect();
	mutation_observer_target = null;
}
