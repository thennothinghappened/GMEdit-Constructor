import { None } from './Option';
import { BaseError } from './utils/Err';

export declare global {

	/**
	 * A result holding either an error or some data.
	 */
	type Result<T, E = BaseError> = Ok<T> | Err<E>;
	type Ok<T> = (T extends void
		? { ok: true }
		: { ok: true, data: T });
	type Err<E = BaseError> = { ok: false, err: E };
	
	/**
	 * An optional value.
	 */
	type Option<T> = Some<T> | typeof None;
	type Some<T> = { data: T };

	/**
	 * An array of at least one element.
	 * 
	 * For this to be guaranteed, the array necessarily cannot be mutated.
	 */
	type NonEmptyArray<T> = readonly [T, ...T[]];

	/**
	 * An object which can be compared for equality against another object of type `T`.
	 */
	interface Eq<T> {
		/**
		 * Check whether this instance is equal to the other.
		 * @param other The other instance to compare against.
		 */
		equals(other: T): boolean;
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

	interface ISolvableError {
		readonly solution: string;
	}

	type Listener<Event> = (e: Event) => void;
	type ListenerMap<EventMap> = { [key in keyof EventMap]: Set<Listener<EventMap[key]>> };

	interface EventEmitter<EventMap> {
		on<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void;
		once<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void;
		off<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void;
	}

};
