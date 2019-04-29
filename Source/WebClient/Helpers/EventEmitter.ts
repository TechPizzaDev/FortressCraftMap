
class EventEmitter {
	private _events: Map<string, Function[]>;

	constructor() {
		this._events = new Map<string, Function[]>();
	}

	/**
	 * Subscribes a function to a registered event.
	 * @param name The name of the event.
	 * @param callback The function to invoke.
	 */
	public subscribeToEvent(name: string, callback: Function) {
		this._assertEventIsDefined(name);

		if (!callback)
			throw new Error("The callback is null.");

		this._events.get(name).push(callback);
	}

	/**
	 * Checks if the event is defined.
	 * @param name The name of the event.
	 * @returns Returns true if the event is defined.
	 */
	public isEventDefined(name: string): boolean {
		if (this._events.has(name))
			return true;
		return false;
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
	 * Triggers a registered event.
	 * @param name The name of the event.
	 * @param data The event data. 
	 */
	protected triggerEvent(name: string, data: object) {
		this._assertEventIsDefined(name);

		const callbackList = this._events.get(name);
		if (callbackList) {
			for (let i = 0; i < callbackList.length; i++) {
				callbackList[i](data);
			}
		}
	}

	/**
	 * Registers an event that can be triggered and subscribed to.
	 * @param name The name of the event.
	 */
	protected registerEvent(name: string) {
		if (!this.isEventDefined(name))
			this._events.set(name, []);
	}

	/**
	 * Removes an event.
	 * @param name The name of the event.
	 */
	protected removeEvent(name: string) {
		if (this.isEventDefined(name))
			this._events.delete(name);
	}

	private _assertEventIsDefined(name: string) {
		if (!this.isEventDefined(name))
			throw new Error(`The event '${name}' is not defined.`);
	}
}
export default EventEmitter;