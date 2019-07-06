
/**
 * Base class for objects that want to emit events.
 * */
export default abstract class EventEmitter {
	private _events: Map<string, Function[]>;

	constructor() {
		this._events = new Map<string, Function[]>();
	}

	/**
	 * Subscribes a function to an event.
	 * @param name The name of the event.
	 * @param callback The function to invoke.
	 */
	public subscribeToEvent(name: string, callback: Function) {
		if (callback == null)
			throw new SyntaxError("'callback' may not be null.");

		this.assertEventIsDefined(name);
		this._events.get(name).push(callback);
	}

	/**
	 * Checks if the event is defined.
	 * @param name The name of the event.
	 * @returns Returns true if the event is defined.
	 */
	public isEventDefined(name: string): boolean {
		return this._events.has(name);
	}

	/**
	 * Returns the amount of currenty subscribed callbacks.
	 * @param name The name of the event.
	 * @returns The amount of currenty subscribed callbacks.
	 */
	public getEventSubscriberCount(name: string): number {
		return this.isEventDefined(name) ? this._events.get(name).length : -1;
	}

	/**
	 * Triggers a registered event, returning true if at least one callback was invoked.
	 * @param name The name of the event.
	 * @param data The event data.
	 * @returns true if at least one callback was invoked; otherwise false.
	 */
	protected triggerEvent(name: string, data: any): boolean {
		this.assertEventIsDefined(name);
		return this.invokeEvent(name, data);
	}

	/**
	 * Tries to trigger an event, returning true if at least one callback was invoked.
	 * @param name The name of the event.
	 * @param data The event data.
	 * @returns true if at least one callback was invoked; otherwise false.
	 */
	protected tryTriggerEvent(name: string, data: any): boolean {
		if (this.isEventDefined(name))
			return this.invokeEvent(name, data);
		return false;
	}

	private invokeEvent(name: string, data: any): boolean {
		const callbackList = this._events.get(name);
		for (let i = 0; i < callbackList.length; i++) {
			callbackList[i](data);
		}
		return callbackList != null && callbackList.length > 0;;
	}

	/**
	 * Registers an event that can be subscribed to and triggered.
	 * @param name The name of the event.
	 */
	protected registerEvent(name: string): boolean {
		if (!this.isEventDefined(name)) {
			this._events.set(name, []);
			return true;
		}
		return false;
	}

	/**
	 * Removes an event.
	 * @param name The name of the event.
	 */
	protected removeEvent(name: string): boolean {
		if (this.isEventDefined(name)) {
			this._events.delete(name);
			return true;
		}
		return false;
	}

	private assertEventIsDefined(name: string) {
		if (!this.isEventDefined(name))
			throw new Error(`The event '${name}' is not defined.`);
	}
}