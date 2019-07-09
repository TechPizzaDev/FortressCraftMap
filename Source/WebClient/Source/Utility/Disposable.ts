
export default abstract class Disposable {

	private _isDisposed = false;

	/** Gets if this object is disposed and unusable. */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/** Throws an error if this resource is disposed. */
	protected assertNotDisposed() {
		if (this._isDisposed)
			throw new Error("The resource is disposed and therefore unusable.");
	}

	/**
	 * Used for destroying objects and making the object unusable.
	 * This is only called once, but dispose() can be called multiple times.
	 * */
	protected abstract destroy(): void;

	/** 
	 * Calls the destroy() implementation.
	 * This can be called multiple times, but destroy() is only called once.
	 * */
	public dispose() {
		if (!this._isDisposed) {
			this.destroy();
			this._isDisposed = true;
		}
	}
}