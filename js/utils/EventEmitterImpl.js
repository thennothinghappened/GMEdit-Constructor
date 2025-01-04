
/**
 * Basic implementation of an event-emitting class.
 * 
 * @template EventType
 * @implements {EventEmitter<EventType>}
 */
export class EventEmitterImpl {

	/**
	 * @private
	 * @type {ListenerMap<EventType>}
	 */
	listeners;
	
	/**
	 * Subscribe to the given event.
	 * 
	 * @type {EventEmitter<EventType>['on']}
	 */
	on(type, listener) {
		this.listeners[type].add(listener);
	}

	/**
	 * Unsubscribe from the given event.
	 * 
	 * @type {EventEmitter<EventType>['off']}
	 */
	off(type, listener) {
		this.listeners[type].delete(listener);
	}

	/**
	 * Emit the given event.
	 * 
	 * @template {keyof EventType} T
	 * @param {T} type 
	 * @param {EventType[T]} event 
	 */
	emit(type, event) {
		this.listeners[type].forEach(listener => listener(event));
	}

	/**
	 * Register the event list.
	 * @param {Array<keyof EventType>} eventNames 
	 */
	constructor(eventNames) {

		// @ts-ignore We're getting to it!
		this.listeners = {};

		for (const eventName of eventNames) {
			this.listeners[eventName] = new Set();
		}

	}
	
}
