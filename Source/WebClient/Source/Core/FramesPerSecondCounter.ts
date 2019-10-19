import TimeEvent from "../Utility/TimeEvent";

export default class FramesPerSecondCounter {
	private _average: number[];
	private _averageIndex = 0;
	private _averageCount = 10;
	private _lastFps = -1;
	private _updateTime = 0;
	private _spanElement: HTMLSpanElement;

	constructor(spanElement: HTMLSpanElement) {
		this._spanElement = spanElement;
		if (this._spanElement) {
			this._average = [];
		}
	}

	public update(time: TimeEvent) {
		if (!this._spanElement)
			return;

		this._updateTime += time.delta;
		if (this._updateTime >= 1 / this._averageCount) {
			this._updateTime = 0;

			this._average[this._averageIndex++] = 1 / time.delta;
			if (this._averageIndex >= this._averageCount)
				this._averageIndex = 0;

			const fpsSum = this._average.reduce((p, c) => p + c);
			const fps = Math.round(fpsSum / this._average.length);
			if (fps != this._lastFps) {
				this._spanElement.textContent = fps.toString();
				this._lastFps = fps;
			}
		}
	}
}