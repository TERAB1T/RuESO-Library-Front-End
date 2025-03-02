export const prepareURL = (url: string) => {
	if (import.meta.env.SSR) return `http://localhost:8000/${url.replace(/^\/api/, '')}`;

	return url;
}

export const prepareIcon = (icon: string) => {
	return icon.replace(/\/?esoui\/(.*?)\.dds/gi, 'https://elderscrolls.net/esoui/$1.png');
}
