import { GMConstructor } from './GMConstructor';

export declare global {

	type Ok<T> = (T extends void
		? { ok: true }
		: { ok: true, data: T });

	type Err<E = IErr> = { ok: false, err: E };
	
	type Result<T, E = IErr> = Ok<T> | Err<E>;

	/**
	 * Project format type for the loaded project.
	 */
	type YYProjectFormat =
		'outdated'	|
		'2023.11'	|
		'2024.2'	|
		'2024.4+'	;

	type ProjectYY = {
		configs: ProjectYYConfig;
	} & YYFile;

	type YYFile = {
		resourceVersion: string;
		resourceType: string;
	};

	type ProjectYYConfig = {
		children: ProjectYYConfig[];
		name: string;
	}

	type UIGroup = { 
		legend: HTMLLegendElement;
	} & HTMLFieldSetElement;

	interface Window {
		GMConstructor?: GMConstructor;
	}

	/**
	 * Object containing at least the given key(s), and all else optional.
	 * @see https://stackoverflow.com/a/57390160/7246439
	 */
	type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

	/**
	 * @see https://stackoverflow.com/a/78673120/7246439
	 */
	type DeepImmutable<T> =
		T extends Map<infer K, infer V> ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
		: T extends Set<infer S> ? ReadonlySet<DeepImmutable<S>>
		: T extends object ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
		: T;

};
