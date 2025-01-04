
export declare global {

	/**
	 * Base error type we use to try and be descriptive to the user :)
	 */
	interface IErr extends Error {
		readonly solution?: string;
		toString(): string;
	}

	type Listener<Event> = (e: Event) => any;
	type ListenerMap<EventMap> = { [key in keyof EventMap]: Set<Listener<EventMap[key]>> };

	interface EventEmitter<EventMap> {
		on<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void;
		once<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void;
		off<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void;
	}

};
