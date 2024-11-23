
/**
 * Mutate a dropdown menu with new elements to change them on the fly.
 * TODO: this makes a lot of garbage, ideally reuse some elements if possible.
 * 
 * @param {HTMLDivElement} root Root element of the dropdown.
 * @param {string[]} opts New options for the dropdown.
 * @param {string} [new_default_value] A default value to use if the previous value was invalidated.
 */
export function UIDropdownMutate(root, opts, new_default_value) {

	const sel = UIDropdownGetSelect(root);
	const old_value = sel.value;

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
 * Get the Select element of a dropdown.
 * 
 * @param {HTMLDivElement} root Root element of the dropdown.
 * @returns {HTMLSelectElement}
 */
export function UIDropdownGetSelect(root) {

	// @ts-ignore
	return root.querySelector('select');

}
