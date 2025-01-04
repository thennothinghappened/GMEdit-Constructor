
export declare global {

	/**
	 * Base error type we use to try and be descriptive to the user :)
	 */
	interface IErr extends Error {
		readonly solution?: string;
		toString(): string;
	}

	interface EventEmitter<EventMap> {
		on<K extends keyof EventMap>(type: K, listener: (e: EventMap[K]) => any): void;
		off<K extends keyof EventMap>(type: K, listener: (e: EventMap[K]) => any): void;	
	}

};
