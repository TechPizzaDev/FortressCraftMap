
/**
 * Timing information used by frame dispatchers and renderers.
 * */
export default class TimedEvent {

	/** The amount of seconds elapsed since the last frame. */
	public delta: number;

	/** The amount of seconds elapsed since the frame dispatcher was started. */
	public total: number;

	constructor(delta: number, total: number) {
		this.delta = delta;
		this.total = total;
	}
}