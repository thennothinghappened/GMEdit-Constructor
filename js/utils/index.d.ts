
export declare global {

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
