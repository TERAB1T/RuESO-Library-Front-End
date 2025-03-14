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
	if (!icon) return '';
	return icon.replace(/\/?esoui\/(.*?)\.dds/gi, 'https://elderscrolls.net/esoui/$1.png').toLowerCase();
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

/**
 * Parses and transforms pseudo-code tags into HTML elements.
 * @param text The pseudo-code text to parse.
 * @returns The HTML string with parsed elements.
 */
export const parsePseudoCode = (text: string): string => {
	const replaceColor = (match: string, colorCode: string, text: string): string => {
		switch (colorCode.toLowerCase()) {
			case 'b30000':
			case '990000':
			case 'ff0000':
				colorCode = 'ff7575';
				break;
			case '0d5820':
				colorCode = '75ff9f';
		}

		return `<span style="color: #${colorCode}">${text}</span>`;
	}

	const replaceAntiquity = (match: string, icon: string, text: string): string =>
		`<h2><img src="${prepareIcon(icon)}"> ${text}</h2>`;

	const replaceImage = (match: string, image: string, width: string, height: string): string =>
		`<img src="${prepareIcon(image)}" style="width: ${width}px; height: ${height}px;">`;

	text = text
		.replace(/\[BR\]/gi, '<br>')
		.replace(/\[P\]/gi, '<p>')
		.replace(/\[P=center\]/gi, '<p style="text-align: center;">')
		.replace(/\[P=right\]/gi, '<p style="text-align: right;">')
		.replace(/\[\/P\]/gi, '</p>')
		.replace(/\[H3\](.*?)\[\/H3\]/gi, '<h3>$1</h3>')
		.replace(/\[FLAVOR\](.*?)\[\/FLAVOR\]/gi, '<div class="alert alert-dark">$1</div>')
		.replace(/\[S\](.*?)\[\/S\]/gi, '<s>$1</s>')
		.replace(/\[C=([0-9a-f]{6})\](.*?)\[\/C\]/gi, replaceColor)
		.replace(/\[ANTIQUITY=(.*?)\](.*?)\[\/ANTIQUITY\]/gi, replaceAntiquity)
		.replace(/\[IMG=(.*?):(.*?):(.*?)\]/gi, replaceImage);

	return text;
}
