/*
 * Based on jQuery Highlight plugin by Bartek Szopka (bartaz): https://bartaz.github.io/sandbox.js/jquery.highlight.js
 *
 * Licensed under MIT license.
 */

interface HighlightOptions {
	className?: string;
	element?: string;
	caseSensitive?: boolean;
	wordsOnly?: boolean;
}

/**
 * Highlights the matches of the given regular expression in the given node.
 *
 * @param {Node} node - The node to search for matches in.
 * @param {RegExp} re - The regular expression to search for.
 * @param {string} [nodeName='span'] - The name of the element to wrap matches in.
 * @param {string} [className='highlight'] - The class to add to the wrapping element.
 * @returns {number} - The number of nodes skipped in the parent.
 */
function highlightText(
	node: Node,
	re: RegExp,
	nodeName: string = 'span',
	className: string = 'highlight'
): number {
	if (node.nodeType === Node.TEXT_NODE) {
		const match = node.textContent?.match(re);
		if (match) {
			const highlight = document.createElement(nodeName);
			highlight.className = className;

			const wordNode = (node as Text).splitText(match.index as number);
			wordNode.splitText(match[0].length);

			const wordClone = wordNode.cloneNode(true);
			highlight.appendChild(wordClone);

			wordNode.parentNode?.replaceChild(highlight, wordNode);
			return 1; // skip added node in parent
		}
	} else if (node.nodeType === Node.ELEMENT_NODE && node.hasChildNodes() && !/(script|style)/i.test((node as HTMLElement).tagName)) {
		for (let i = 0; i < node.childNodes.length; i++) {
			i += highlightText(node.childNodes[i], re, nodeName, className);
		}
	}
	return 0;
}


/**
 * Removes highlighting from elements within a given root element.
 *
 * @param {HTMLElement} root - The root element to search for highlighted elements within.
 * @param {HighlightOptions} [options={ className: 'highlight', element: 'span' }] - Options to specify the element tag and class name used for highlighting.
 */
export function unhighlight(
	root: HTMLElement,
	options: HighlightOptions = { className: 'highlight', element: 'span' }
): void {
	const { className, element } = options;
	const highlightedElements = root.querySelectorAll(`${element}.${className}`);

	highlightedElements.forEach((el) => {
		const parent = el.parentNode;
		if (parent) {
			parent.replaceChild(el.firstChild as Node, el);
			parent.normalize();
		}
	});
}

/**
 * Highlights all occurrences of the given words in the given root element.
 *
 * @param {HTMLElement} root - The root element to search for words in.
 * @param {string|string[]} words - The words to search for. If a string, it will be treated as a single word. If an array, all words will be searched.
 * @param {HighlightOptions} [options={ className: 'highlight', element: 'span', caseSensitive: false, wordsOnly: false }] - Options to specify the element tag and class name used for highlighting, whether to match case, and whether to match whole words only.
 */
export function highlight(
	root: HTMLElement,
	words: string | string[],
	options: HighlightOptions = { className: 'highlight', element: 'span', caseSensitive: false, wordsOnly: false }
): void {
	if (typeof words === 'string') {
		words = [words];
	}

	words = words
		.filter(word => word.trim() !== '')
		.map(word => word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));

	if (words.length === 0) return;

	const flag = options.caseSensitive ? '' : 'i';
	let pattern = `(${words.join('|')})`;
	if (options.wordsOnly) {
		pattern = `\\b${pattern}\\b`;
	}

	const re = new RegExp(pattern, flag);

	root.childNodes.forEach((child) => {
		let node = child as Node;
		while (node) {
			highlightText(node, re, options.element || 'span', options.className || 'highlight');
			node = node.nextSibling as ChildNode;
		}
	});
}
