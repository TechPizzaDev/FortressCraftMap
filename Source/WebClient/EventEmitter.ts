"use strict";

class EventEmitter {
	_events: Map<string, Function[]>;

	constructor() {
		this._events = new Map<string, Function[]>();
	}

	/**
	 * Subscribes a function to a registered event.
	 * @param name The name of the event.
	 * @param delegate The function to invoke.
	 */
	public subscribeToEvent(name: string, delegate: Function) {
		this._assertEventIsDefined(name);

		if (!delegate)
			throw new Error("The delegate is null.");

		this._events.get(name).push(delegate);
	}

	/**
	 * Checks if the event is defined.
	 * @param name The name of the event.
	 * @returns Returns true if the event is defined.
	 */
	isEventDefined(name: string): boolean {
		if (this._events.has(name))
			return true;
		return false;
	}

	/**
	 * Returns the amount of currenty subscribed delegates.
	 * @param name The name of the event.
	 * @returns The amount of currenty subscribed delegates.
	 */
	public getEventSubscriberCount(name: string): number {
		return this.isEventDefined(name) ? this._events.get(name).length : -1;
	}

	/**
	 * Triggers a registered event.
	 * @param name The name of the event.
	 * @param data The event data. 
	 */
	protected _triggerEvent(name: string, data: object) {
		this._assertEventIsDefined(name);

		const delegateList = this._events.get(name);
		if (delegateList) {
			for (let i = 0; i < delegateList.length; i++) {
				delegateList[i](data);
			}
		}
	}

	/**
	 * Registers an event that can be triggered and subscribed to.
	 * @param name The name of the event.
	 */
	protected _registerEvent(name: string) {
		if (!this.isEventDefined(name))
			this._events.set(name, []);
	}

	/**
	 * Removes an event.
	 * @param name The name of the event.
	 */
	protected _removeEvent(name: string) {
		if (this.isEventDefined(name))
			this._events.delete(name);
	}

	private _assertEventIsDefined(name: string) {
		if (!this.isEventDefined(name))
			return new Error(`The event '${name}' is not defined.`);
	}
}