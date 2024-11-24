
/**
 * # [scope-extensions-js](https://github.com/Starrah/scope-extensions-js)
 * 
 * MIT License
 * 
 * Copyright (c) 2020 TheDavidDelta, 2022 Starrah
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// @ts-nocheck

/**
 * @template T
 */
export class Wrapper {

	/**
	 * @type {T}
	 */
	value;

	/**
	 * @param {T} value
	 */
	constructor(value) {
		this.value = value;
	}

	/**
	 * Calls the specified function block with `this` value as its argument and returns a `Wrapper` that wraps its
	 * result when the result is not undefined, or return undefined.
	 * 
	 * @template R
	 * @param {(it: T) => R} block The function to be executed with `this` as argument
	 * @returns {WrapperIfNonUndefined<R>} a `Wrapper` that wraps `block`'s result, or undefined.
	 */
	let(block) {
		
		const result = block(this.value);
		
		if (result !== undefined) {
			return new Wrapper(result);
		}

		return undefined;

	}

	/**
	 * Calls the specified function block with `this` value as its argument and returns `this` value
	 * 
	 * @param {(it: T) => void} block The function to be executed with `this` as argument
	 * @returns {Wrapper<T>} `this`, which is a Wrapper
	 */
	also(block) {
		block(this.value);
		return this;
	}

	/**
	 * Returns `this` value if it satisfies the given predicate or `undefined` if it doesn't
	 * 
	 * @param {(it: T) => boolean} predicate The function to be executed with `this` as argument and returns a truthy or falsy value
	 * @returns {Wrapper<T> | undefined} `this` which is still a Wrapper or `undefined`
	 */
	takeIf(predicate) {
		return predicate(this.value) ? this : undefined;
	}

	/**
	 * Returns `this` value if it does not satisfy the given predicate or `undefined` if it does
	 * 
	 * @param {(it: T) => boolean} predicate The function to be executed with `this` as argument and returns a truthy or falsy value
	 * @returns {Wrapper<T> | undefined} `this` which is still a Wrapper or `undefined`
	 */
	takeUnless(predicate) {
		return predicate(this.value) ? undefined : this;
	}

}

/**
 * Wrap the given value to give us Kotlin-like functional extensions. Makes it much more enjoyable
 * to work with DOM stuff in particular, among others.
 * 
 * @template T
 * @param {T} value
 * @returns {WrapperIfNonUndefined<T>}
 */
export function use(value) {
	if (value !== undefined) {
		return new Wrapper(value);
	}
	return undefined;
}
