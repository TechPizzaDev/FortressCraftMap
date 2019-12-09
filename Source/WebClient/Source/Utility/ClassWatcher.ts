import EventEmitter from "./EventEmitter";

export default class ClassWatcher extends EventEmitter {

	private _classFilter: DOMTokenList;
	private _lastState: DOMTokenList;
	private _observer: MutationObserver;
	
	constructor() {
		super();

		this._classFilter = new DOMTokenList();
		this._lastState = new DOMTokenList();
		this._observer = new MutationObserver(this._mutationCallback);
	}

	public get classFilter(): DOMTokenList {
		return this._classFilter;
	}

	public observe(targetNode: Element, subtree: boolean, childList: boolean) {
		this._lastState.value = targetNode.classList.value;
		this._observer.observe(targetNode, {
			attributes: true,
			attributeFilter: ["class"],
			characterData: false,
			subtree,
			childList
		});
	}

	public disconnect() {
		this._observer.disconnect();
	}

	private _mutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => {
		for (const mutation of mutations) {
			if (mutation.type != "attributes")
				continue;

			// TODO:
			throw new Error("not implemented");
			
			//if (!this._classFilter.contains())
			//
			//let currentClassState = mutation.target.classList.contains(this.classToWatch)
			//if (this.lastClassState != currentClassState) {
			//	this.lastClassState = currentClassState
			//	if (currentClassState) {
			//		this.classAddedCallback()
			//	}
			//	else {
			//		this.classRemovedCallback()
			//	}
			//}
		}
	}
}