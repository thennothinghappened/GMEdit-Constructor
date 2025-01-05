
export class GmlFileUtils {

	/**
	 * Properly rename the given GML file. GMEdit does this weird manual updating of things via
	 * heaps of inline properties internally.
	 * 
	 * @param {GMEdit.GmlFile} file The file to rename.
	 * @param {string} name The new name of the file.
	 * @param {string|undefined} [path=undefined] The new path of the file.
	 */
	static rename(file, name, path = undefined) {

		file.rename(name, path ?? file.path);

		if (file.tabEl !== null) {
			const tabTitleText = file.tabEl.querySelector('.chrome-tab-title-text');

			if (tabTitleText !== null) {
				tabTitleText.textContent = name;
			}
		}

	}

}
