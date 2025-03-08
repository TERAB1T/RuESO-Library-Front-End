/**
 * Prepares a URL for use in a server-side rendered context.
 * @param url The URL to prepare.
 * @returns The prepared URL.
 *
 * If the application is running in a server-side rendered context, this
 * function will replace the leading `/api` with `http://localhost:8000/`.
 *
 * Otherwise, the function will return the original URL unchanged.
 */
export const prepareURL = (url: string) => {
	if (import.meta.env.SSR) return `http://localhost:8000/${url.replace(/^\/api/, '')}`;

	return url;
}

/**
 * Replaces the ESO UI icon URL with a PNG image URL.
 * @param icon The URL of the icon to convert.
 * @returns The converted URL of the icon in PNG format.
 */
export const prepareIcon = (icon: string) => {
	return icon.replace(/\/?esoui\/(.*?)\.dds/gi, 'https://elderscrolls.net/esoui/$1.png');
}

/**
 * Returns a debounced version of the given function. The function will be
 * invoked after `timeout` milliseconds have passed since the last time it was
 * invoked. The arguments passed to the debounced function will be passed to the
 * original function.
 *
 * @param fn The function to debounce.
 * @param timeout The number of milliseconds to wait before invoking the function.
 * @returns A debounced version of the given function.
 */
export const debounceFn = <T extends (...args: any[]) => void>(fn: T, timeout: number = 250) => {
	let timer: ReturnType<typeof setTimeout>;

	return function (this: any, ...args: Parameters<T>) {
		clearTimeout(timer);
		timer = setTimeout(() => fn.apply(this, args), timeout);
	};
};
