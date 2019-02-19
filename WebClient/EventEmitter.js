"use strict";

class EventEmitter {
	constructor() {
		this._events = {};
	}
	
	/**
	 * Subscribes a function to a registered event.
	 * @param {string} name The name of the event.
	 * @param {Function} delegate The function to invoke.
	 */
	subscribeToEvent(name, delegate) {
		this._checkIfEventIsDefined(name);

		if (!delegate) {
			throw new Error("The delegate is null.");
		}
		if (!(delegate instanceof Function)) {
			throw new Error("The delegate is not a function.");
		}
		this._events[name].push(delegate);
	}

	/**
	 * Triggers a registered event.
	 * @param {string} name The name of the event.
	 * @param {*} data The event data. 
	 */
	_triggerEvent(name, data) {
		this._checkIfEventIsDefined(name);

		const delegateList = this._events[name];
		for (let i = 0; i < delegateList.length; i++) {
			delegateList[i](data);
		}
	}

	/**
	 * Registers an event that can be triggered and subscribed to.
	 * @param {string} name The name of the event.
	 */
	_registerEvent(name) {
		this._checkIfEventIsDefined(name);
		this._events[name] = [];
	}

	/**
	 * Removes an event.
	 * @param {string} name The name of the event.
	 */
	_removeEvent(name) {
		if (this.isEventDefined(name))
			delete this._events[name];
	}

	/**
	 * Checks if the event is defined.
	 * @param {string} name The name of the event.
	 * @returns {boolean} Returns true if the event is defined.
	 */
	isEventDefined(name) {
		const delegateList = this._events[name];
		return delegateList && delegateList instanceof Array;
	}

	/**
	 * Returns the amount of currenty subscribed delegates.
	 * @param {string} name The name of the event.
	 * @returns {number} The amount of currenty subscribed delegates.
	 */
	getEventSubscriberCount(name) {
		if (this.isEventDefined(name)) {
			return this._events[name].length;
		}
		return -1;
	}

	_checkIfEventIsDefined() {
		if (!this.isEventDefined(name)) {
			return new Error(`The event '${name}' is not defined.`);
		}
	}
}