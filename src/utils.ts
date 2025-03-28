/**
 * Prepares a URL based on the environment and platform.
 *
 * - In a server-side rendering (SSR) environment:
 *   - If the platform is Windows, it prefixes the URL with `http://localhost:8000`
 *     and removes the `/api` prefix from the path.
 *   - Otherwise, it prefixes the URL with `http://localhost` and removes the `/api` prefix.
 * - In a non-SSR environment, it returns the original URL unchanged.
 *
 * @param url The URL to be prepared.
 * @returns The prepared URL based on the environment and platform.
 */
export const prepareURL = (url: string) => {
	if (import.meta.env.SSR) {
		// @ts-ignore
		const isWindows = process.platform === 'win32';

		if (isWindows) return `http://localhost:8000${url.replace(/^\/api/, '')}`;
		else return `http://localhost${url.replace(/^\/api/, '')}`;
	}

	return url;
}

/**
 * Replaces the ESO UI icon URL with a PNG image URL.
 * @param icon The URL of the icon to convert.
 * @returns The converted URL of the icon in PNG format.
 */
export const prepareIcon = (icon: string) => {
	if (!icon) return '';
	return icon.replace(/\/?esoui\/(.*?)\.dds/gi, '/public/img/eso/esoui/$1.png').toLowerCase();
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
		`<h3><img src="${prepareIcon(icon)}" style="margin:10px 0;">  ${text}</h3>`;

	const replaceHireling = (match: string, icon: string, text: string): string =>
		`<h5><img src="${prepareIcon(icon)}" width="40">  ${text}</h5>`;

	const replaceImage = (match: string, image: string, width: string, height: string): string =>
		`<img src="${prepareIcon(image)}" style="width: ${width}px; height: ${height}px;">`;

	text = text
		.replace(/\[BR\]/gi, '<br>')
		.replace(/\[P\]/gi, '<p>')
		.replace(/\[P=center\]/gi, '<p style="text-align: center;">')
		.replace(/\[P=right\]/gi, '<p style="text-align: right;">')
		.replace(/\[\/P\]/gi, '</p>')
		.replace(/\[H3\](.*?)\[\/H3\]/gi, '<h5>$1</h5>')
		.replace(/\[FLAVOR\](.*?)\[\/FLAVOR\]/gi, '<div class="alert alert-dark">$1</div>')
		.replace(/\[S\](.*?)\[\/S\]/gi, '<s>$1</s>')
		.replace(/\[C=([0-9a-f]{6})\](.*?)\[\/C\]/gi, replaceColor)
		.replace(/\[ANTIQUITY=(.*?)\](.*?)\[\/ANTIQUITY\]/gi, replaceAntiquity)
		.replace(/\[HIRELING=(.*?)\](.*?)\[\/HIRELING\]/gi, replaceHireling)
		.replace(/\[IMG=(.*?):(.*?):(.*?)\]/gi, replaceImage);

	return text;
}

export const generateMetaDescription = (text: string): string => {
    let cleanText = text.replace(/\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();

    if (cleanText.length <= 160) return cleanText;

    let cutText = cleanText.slice(0, 160);
    let lastDot = cutText.lastIndexOf('.');

    if (lastDot > 100) {
        cleanText = cutText.slice(0, lastDot + 1);
    } else {
        cleanText = cutText.trim() + '…';
    }

    return cleanText;
}
