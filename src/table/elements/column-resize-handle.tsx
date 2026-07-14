/**
 * WordPress Dependencies
 */
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Internal Dependencies
 */
import {
	MIN_COLUMN_WIDTH,
	computeColumnWidthPx,
	formatColumnWidthLabel,
} from '../utils/column-resize';

type Props = {
	vColIndex: number;
	onResizeStart: (vColIndex: number, startWidth: number) => void;
	onResizePreview: (vColIndex: number, widthPx: number) => void;
	onResizeCommit: (vColIndex: number, widthPx: number) => void;
	onResizeCancel: (vColIndex: number, startWidth: number) => void;
};

type DragState = {
	pointerId: number;
	startX: number;
	startWidth: number;
	latestWidth: number;
	rafId: number | null;
	ended: boolean;
};

/**
 * Drag handle on the right edge of a column for resizing width.
 *
 * @param root0
 * @param root0.vColIndex
 * @param root0.onResizeStart
 * @param root0.onResizePreview
 * @param root0.onResizeCommit
 * @param root0.onResizeCancel
 */
export default function ColumnResizeHandle({
	vColIndex,
	onResizeStart,
	onResizePreview,
	onResizeCommit,
	onResizeCancel,
}: Props) {
	const handleRef = useRef<HTMLButtonElement>(null);
	const tooltipRef = useRef<HTMLSpanElement>(null);
	const dragRef = useRef<DragState | null>(null);
	const callbacksRef = useRef({
		onResizeStart,
		onResizePreview,
		onResizeCommit,
		onResizeCancel,
	});
	callbacksRef.current = {
		onResizeStart,
		onResizePreview,
		onResizeCommit,
		onResizeCancel,
	};

	useEffect(() => {
		return () => {
			const drag = dragRef.current;
			if (!drag) {
				return;
			}
			if (drag.rafId !== null) {
				cancelAnimationFrame(drag.rafId);
			}
			document.body.classList.remove('ftb-is-resizing-column');
			dragRef.current = null;
		};
	}, []);

	const setTooltipVisible = (visible: boolean, widthPx?: number) => {
		const tooltip = tooltipRef.current;
		if (!tooltip) {
			return;
		}
		tooltip.hidden = !visible;
		if (visible && typeof widthPx === 'number') {
			tooltip.textContent = formatColumnWidthLabel(widthPx);
		}
	};

	const flushPreview = () => {
		const drag = dragRef.current;
		if (!drag || drag.ended) {
			return;
		}
		drag.rafId = null;
		callbacksRef.current.onResizePreview(vColIndex, drag.latestWidth);
		setTooltipVisible(true, drag.latestWidth);
	};

	const endDrag = (commit: boolean) => {
		const drag = dragRef.current;
		if (!drag || drag.ended) {
			return;
		}
		drag.ended = true;
		if (drag.rafId !== null) {
			cancelAnimationFrame(drag.rafId);
			drag.rafId = null;
		}
		document.body.classList.remove('ftb-is-resizing-column');
		setTooltipVisible(false);

		const { latestWidth, startWidth, pointerId } = drag;
		dragRef.current = null;

		const handle = handleRef.current;
		if (handle?.hasPointerCapture(pointerId)) {
			handle.releasePointerCapture(pointerId);
		}

		if (commit) {
			callbacksRef.current.onResizeCommit(vColIndex, latestWidth);
		} else {
			callbacksRef.current.onResizeCancel(vColIndex, startWidth);
		}
	};

	const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();

		const cell = handleRef.current?.closest('th, td') as HTMLElement | null;
		const startWidth =
			cell?.getBoundingClientRect().width ?? MIN_COLUMN_WIDTH;

		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startWidth,
			latestWidth: startWidth,
			rafId: null,
			ended: false,
		};

		handleRef.current?.setPointerCapture(event.pointerId);
		document.body.classList.add('ftb-is-resizing-column');
		setTooltipVisible(true, startWidth);
		callbacksRef.current.onResizeStart(vColIndex, startWidth);
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.ended || event.pointerId !== drag.pointerId) {
			return;
		}
		drag.latestWidth = computeColumnWidthPx(
			drag.startWidth,
			drag.startX,
			event.clientX
		);
		if (drag.rafId === null) {
			drag.rafId = requestAnimationFrame(flushPreview);
		}
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.ended || event.pointerId !== drag.pointerId) {
			return;
		}
		// Flush any pending frame so commit uses the latest width.
		if (drag.rafId !== null) {
			cancelAnimationFrame(drag.rafId);
			drag.rafId = null;
			flushPreview();
		}
		endDrag(true);
	};

	const onPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.ended || event.pointerId !== drag.pointerId) {
			return;
		}
		endDrag(false);
	};

	const onLostPointerCapture = (
		event: ReactPointerEvent<HTMLButtonElement>
	) => {
		const drag = dragRef.current;
		if (!drag || drag.ended || event.pointerId !== drag.pointerId) {
			return;
		}
		endDrag(false);
	};

	return (
		<button
			ref={handleRef}
			type="button"
			className="ftb-column-resize-handle"
			aria-label={__('Resize column', 'flexible-table-block')}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerCancel}
			onLostPointerCapture={onLostPointerCapture}
			onClick={(event) => event.stopPropagation()}
			data-v-col={vColIndex}
		>
			<span
				ref={tooltipRef}
				className="ftb-column-resize-tooltip"
				hidden
				aria-hidden="true"
			/>
		</button>
	);
}

export { MIN_COLUMN_WIDTH };
