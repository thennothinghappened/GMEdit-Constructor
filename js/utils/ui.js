
/**
 * Mutate a dropdown menu with new elements to change them on the fly.
 * TODO: this makes a lot of garbage, ideally reuse some elements if possible.
 * 
 * @template {string} T
 * @param {GMEdit.UIDropdown<T>} root Root element of the dropdown.
 * @param {T[]} opts New options for the dropdown.
 * @param {T} [new_default_value] A default value to use if the previous value was invalidated.
 */
export function UIDropdownMutate(root, opts, new_default_value) {

	const sel = UIDropdownGetSelect(root);
	const old_value = /** @type {T} */ (sel.value);

	for (const el of Array.from(sel.childNodes)) {
		sel.removeChild(el);
	}

	for (const opt of opts) {
		const el = document.createElement('option');
		el.value = opt;
		el.textContent = opt;

		sel.appendChild(el);
	}

	if (opts.includes(old_value)) {
		sel.value = old_value;
	} else {
		sel.value = new_default_value ?? opts[0] ?? '';
	}
}

/**
 * Get the selected option of the dropdown.
 * 
 * @template {string} T
 * @param {GMEdit.UIDropdown<T>} dropdown
 * @returns {T}
 */
export function UIDropdownGetValue(dropdown) {
	return /** @type {T} */ (UIDropdownGetSelect(dropdown).value);
}

/**
 * Set the selected option of the dropdown.
 * 
 * @template {string} T
 * @param {GMEdit.UIDropdown<T>} dropdown
 * @param {T} value
 */
export function UIDropdownSetValue(dropdown, value) {
	UIDropdownGetSelect(dropdown).value = value;
}

/**
 * Get the Select element of a dropdown.
 * 
 * @param {GMEdit.UIDropdown<*>} root Root element of the dropdown.
 * @returns {HTMLSelectElement}
 */
export function UIDropdownGetSelect(root) {

	// @ts-expect-error A dropdown always has a select element.
	return root.querySelector('select');

}
