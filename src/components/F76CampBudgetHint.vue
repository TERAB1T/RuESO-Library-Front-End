<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import type { Popover as PopoverType } from 'bootstrap';

const props = defineProps<{
	campBudgetLimit: number | null;
}>();

// The regular (non-shop) Lawn Flamingo: it costs exactly one unit.
const FLAMINGO_PATH = '/f76-camp/001e46c1-lawn-flamingo';

const button = ref<HTMLButtonElement | null>(null);
// Rendered by Vue (so RouterLink keeps working) and handed to the popover as its content node.
const content = ref<HTMLElement | null>(null);

let popover: PopoverType | null = null;
let isUnmounted = false;

const rowGap = (placement: string) => {
	const row = button.value?.closest('.card-element')?.getBoundingClientRect();
	const own = button.value?.getBoundingClientRect();
	if (!row || !own) return 0;
	return placement.startsWith('bottom') ? row.bottom - own.bottom : own.top - row.top;
};

const isShown = ref(false);
const hide = () => popover?.hide();
const toggle = () => (isShown.value ? popover?.hide() : popover?.show());
const onDocumentClick = (event: MouseEvent) => {
	const target = event.target as Node;
	if (!button.value?.contains(target) && !content.value?.contains(target)) hide();
};
const onKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape') hide();
};
// Narrowing the window switches the page to the mobile layout and hides the desktop card this button lives in; Popper then
// loses its anchor and draws the popover in the corner. Mobile browsers also fire resize on scroll, so close only then.
const onResize = () => {
	if (!button.value?.offsetParent) hide();
	else popover?.update();
};
const onShown = () => {
	isShown.value = true;
	document.addEventListener('click', onDocumentClick);
	document.addEventListener('keydown', onKeydown);
	window.addEventListener('resize', onResize);
};
const onHidden = () => {
	isShown.value = false;
	document.removeEventListener('click', onDocumentClick);
	document.removeEventListener('keydown', onKeydown);
	window.removeEventListener('resize', onResize);
};

// Back/forward navigation: the item page stays mounted between items, so the popover would stay open.
onBeforeRouteLeave(() => hide());
onBeforeRouteUpdate(() => hide());

onMounted(async () => {
	const { Popover } = await import('bootstrap');
	if (isUnmounted || !button.value || !content.value) return;

	// Manual trigger: 'focus' hides on mousedown, before a click on the link lands; 'click' keeps its own open flag,
	// which goes stale after hide() from Esc or an outside click. No animation: the link navigates and the card may unmount
	// while a fade-out is still running, and Bootstrap then fails on the disposed instance.
	popover = new Popover(button.value, {
		content: content.value,
		html: true,
		placement: 'top',
		// On mobile the button sits at the left edge, and the default fallbacks put the popover to the right, over the value.
		fallbackPlacements: ['bottom'],
		trigger: 'manual',
		animation: false,
		customClass: 'budget-hint-popover',
		popperConfig: config => ({
			...config,
			modifiers: [
				...(config.modifiers ?? []),
				{ name: 'preventOverflow', options: { padding: 12 } },
				// Measured from the edge of the whole card row, not the button: on mobile the label wraps, the button ends up
				// on its second line and a popover right above it would cover the value beside the first line.
				{ name: 'offset', options: { offset: ({ placement }: { placement: string }) => [0, 8 + rowGap(placement)] } },
			],
		}),
	});
	button.value.addEventListener('shown.bs.popover', onShown);
	button.value.addEventListener('hidden.bs.popover', onHidden);
});

onBeforeUnmount(() => {
	isUnmounted = true;
	onHidden();
	popover?.dispose();
	popover = null;
});
</script>

<template>
	<span class="budget-hint">
		<button ref="button" type="button" class="budget-hint-toggle" :class="{ 'is-open': isShown }" aria-label="Что такое 🦩" @click="toggle">?</button>
		<span class="d-none">
			<span ref="content" class="budget-hint-content">
				<span class="budget-hint-paragraph">
					<strong>Фламинго</strong>&nbsp;— условная единица, которая показывает, сколько бюджета строительства расходует объект.
					<span class="text-nowrap">1🦩</span>&nbsp;— стоимость размещения одного <RouterLink :to="FLAMINGO_PATH" @click="hide">садового&nbsp;фламинго</RouterLink>.
				</span>
				<span v-if="props.campBudgetLimit" class="budget-hint-paragraph">
					Общий бюджет C.A.M.P.&nbsp;— <span class="text-nowrap">{{ props.campBudgetLimit.toLocaleString('ru-RU') }}🦩,</span> а&nbsp;укрытий&nbsp;— 700 или&nbsp;<span class="text-nowrap">1500🦩.</span>
				</span>
			</span>
		</span>
	</span>
</template>

<style scoped lang="scss">
.budget-hint {
	display: inline-flex;
	margin-left: 0.35rem;
}

.budget-hint-toggle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1rem;
	height: 1rem;
	padding: 0;
	border: 1px solid currentColor;
	border-radius: 50%;
	background: none;
	color: #a1a1aa;
	font-size: 0.65rem;
	font-weight: 600;
	line-height: 1;
	cursor: pointer;

	&:hover,
	&.is-open {
		color: var(--bs-body-color);
	}
}

// Noticeably lighter than the card (#1c1c1f-ish) so it doesn't merge with it.
:global(.budget-hint-popover) {
	--bs-popover-max-width: 20rem;
	--bs-popover-font-size: 0.875rem;
	--bs-popover-body-padding-x: 0.9rem;
	--bs-popover-body-padding-y: 0.7rem;
	--bs-popover-bg: #3f3f46;
	--bs-popover-border-color: rgba(255, 255, 255, 0.14);
	--bs-popover-body-color: #e4e4e7;
	--bs-popover-box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.55);
	box-shadow: var(--bs-popover-box-shadow);
	line-height: 1.5;
}

.budget-hint-content {
	display: block;
	text-align: left;
}

.budget-hint-paragraph {
	display: block;

	& + & {
		margin-top: 0.5rem;
	}
}

.budget-hint-content strong {
	color: #fafafa;
	font-weight: 600;
}
</style>
