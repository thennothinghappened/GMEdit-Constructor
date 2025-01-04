
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
	 * @private
	 * @type {ListenerMap<EventType>}
	 */
	onceListeners;
	
	/**
	 * Subscribe to the given event.
	 * 
	 * @type {EventEmitter<EventType>['on']}
	 */
	on(type, listener) {
		this.listeners[type].add(listener);
	}

	/**
	 * Subscribe to the given event.
	 * 
	 * @type {EventEmitter<EventType>['on']}
	 */
	once(type, listener) {
		this.on(type, listener);
		this.onceListeners[type].add(listener);
	}

	/**
	 * Unsubscribe from the given event.
	 * 
	 * @type {EventEmitter<EventType>['off']}
	 */
	off(type, listener) {
		this.listeners[type].delete(listener);
		this.onceListeners[type].delete(listener);
	}

	/**
	 * Emit the given event.
	 * 
	 * @template {keyof EventType} T
	 * @param {T} type 
	 * @param {EventType[T]} event 
	 */
	emit(type, event) {

		const onceListeners = this.onceListeners[type];

		this.listeners[type].forEach(listener => {

			listener(event);

			if (onceListeners.has(listener)) {
				this.off(type, listener);
			}

		});
		
	}

	/**
	 * Register the event list.
	 * @param {Array<keyof EventType>} eventNames 
	 */
	constructor(eventNames) {

		// @ts-expect-error We're getting to it!
		this.listeners = {};
		
		// @ts-expect-error We're getting to it!
		this.onceListeners = {};

		for (const eventName of eventNames) {
			this.listeners[eventName] = new Set();
			this.onceListeners[eventName] = new Set();
		}

	}
	
}
