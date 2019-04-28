type TimingCallback = (t: TimingEvent) => void;

class FrameDispatcher {
	private _update: TimingCallback;
	private _interval: number;
	private _intervalID: number;
	private _lastUpdateTime: number;
	private _totalUpdateTime: number;
	private _firstUpdateFired: boolean;

	private _draw: TimingCallback;
	private _animationID: number;
	private _lastDrawTime: number;
	private _totalDrawTime: number;

	constructor(updateRate: number, update: TimingCallback, draw: TimingCallback) {
		this._interval = Math.round(1.0 / updateRate * 1000);
		this._update = update;
		this._draw = draw;

		this._totalUpdateTime = 0;
		this._totalDrawTime = 0;
	}

	public run() {
		if (this._intervalID)
			throw new Error("Dispatcher is already running.");
		this._intervalID = setInterval(this.updateFrame, this._interval, this);
	}

	private animate() {
		if (this._animationID != 0)
			this._animationID = requestAnimationFrame(this.animationFrame);
	}

	private updateFrame = () => {
		const totalTime = performance.now();
		if (this._lastUpdateTime) {
			const delta = (totalTime - this._lastUpdateTime) / 1000;
			this._update(new TimingEvent(delta, this._totalUpdateTime));
			this._totalUpdateTime += delta;

			// we start animating here as we want at least one update() before drawing
			if (!this._firstUpdateFired) {
				this.animate();
				this._firstUpdateFired = true;
			}
		}
		this._lastUpdateTime = totalTime;
	}

	private animationFrame = (totalTime: number) => {
		if (this._lastDrawTime) {
			const delta = (totalTime - this._lastDrawTime) / 1000;
			this._draw(new TimingEvent(delta, this._totalDrawTime));
			this._totalDrawTime += delta;
		}
		this._lastDrawTime = totalTime;
		this.animate();
	}
}
