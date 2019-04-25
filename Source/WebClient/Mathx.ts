
class Mathx {
	public static clamp(value: number, min: number, max: number): number {
		return Math.min(max, Math.max(min, value));
	};

	public static lerp(src: number, dst: number, amount: number): number {
		return (1 - amount) * src + amount * dst;
	};

	public static isPowerOf2(value: number): boolean {
		return (value & (value - 1)) == 0;
	}
}