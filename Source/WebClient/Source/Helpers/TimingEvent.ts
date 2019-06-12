
export default class TimingEvent {
    public readonly delta: number;
	public readonly total: number;

	constructor(delta: number, total: number) {
		this.delta = delta;
		this.total = total;
	}
}