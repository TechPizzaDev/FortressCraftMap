
export class Common {

	private static readonly _byteUnits = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	public static clearArray<T>(array: T[]) {
		array.length = 0;
	}

	public static copyArrayTo(source: any[], destination: any[]) {
		for (let i = 0; i < source.length; i++)
			destination.push(source[i]);
	}

	/**
	 * Overwrites values in the destination map with values from the source map.
	 * @param source
	 * @param destination
	 */
	public static copyMapTo<TKey, TValue>(source: Map<TKey, TValue>, destination: Map<TKey, TValue>) {
		for (const pair of source)
			destination.set(pair[0], pair[1]);
	}

	public static makeArrayUnique<T>(array: T[], comparison: (source: T, comparand: T) => boolean) {
		for (let i = 0; i < array.length; i++) {
			const sourceValue = array[i];
			for (let j = i + 1; j < array.length; j++) {
				if (comparison(sourceValue, array[j]))
					array.splice(j--, 1);
			}
		}
	}

	public static bytesToReadable(count: number): string {
		if (Math.abs(count) < 1024)
			return count + ' B';

		let u = -1;
		do {
			count /= 1024;
			u++;
		} while (Math.abs(count) >= 1024 && u < Common._byteUnits.length - 1);
		return count.toFixed(2) + ' ' + Common._byteUnits[u];
	}

	public static getExtension(path: string): string {
		const lastDot = path.lastIndexOf(".");
		return path.substring(lastDot);
	}

	public static changeExtension(path: string, extension: string | null) {
		const lastDot = path.lastIndexOf(".");
		if (extension == null || extension.length == 0)
			return path.substring(0, lastDot);

		throw "not done";
	}
}