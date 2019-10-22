import TimeEvent from "../Utility/TimeEvent";

export default class FramesPerSecondCounter {
	private _average: number[];
	private _averageIndex = 0;
	private _averageCount = 20;
	private _fps = 0;
	private _averageFps = 0;
	private _updateTime = 0;
	private _spanElement: HTMLSpanElement;

	constructor(spanElement: HTMLSpanElement) {
		this._spanElement = spanElement;
		if (this._spanElement) {
			this._average = [];
		}
	}

	public get fps(): number {
		return this._fps;
	}

	public get averageFps(): number {
		return this._averageFps;
	}

	public update(time: TimeEvent) {
		if (!this._spanElement)
			return;

		this._fps = 1 / time.delta;

		this._updateTime += time.delta;
		if (this._updateTime >= 1 / this._averageCount) {
			this._updateTime = 0;

			this._average[this._averageIndex++] = this._fps;
			if (this._averageIndex >= this._averageCount)
				this._averageIndex = 0;

			const fpsSum = this._average.reduce((p, c) => p + c);
			this._averageFps = Math.round(fpsSum / this._average.length);
		}
	}

	public draw(time: TimeEvent) {
		this._spanElement.textContent = this._averageFps.toString();
	}
}