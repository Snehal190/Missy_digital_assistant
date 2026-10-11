import { useRef, useState } from "react";
import { TrashIcon } from "../icons";

const DELETE_THRESHOLD = 96; // px dragged left before release triggers delete
const DRAG_START = 8; // px of sideways movement before it counts as a swipe, not a tap

export default function SwipeToDelete({ onDelete, className = "", children }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startX = useRef(0);
  const lastDelta = useRef(0);
  // Mirrors `dragging` synchronously — event handlers must not gate on React
  // state, since pointerdown -> pointermove can fire before a re-render commits.
  const activeRef = useRef(false);
  const swipingRef = useRef(false);

  // The pointer is only captured once a real sideways swipe begins. Capturing
  // on press (as before) retargets the click to this wrapper in desktop
  // browsers, so the task's check/edit buttons never received mouse clicks.
  function handlePointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    lastDelta.current = 0;
    activeRef.current = true;
    swipingRef.current = false;
  }

  function handlePointerMove(e) {
    if (!activeRef.current) return;
    const delta = Math.min(0, e.clientX - startX.current);
    if (!swipingRef.current) {
      if (delta > -DRAG_START) return;
      swipingRef.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    lastDelta.current = delta;
    setDragX(delta);
  }

  function finishDrag() {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (!swipingRef.current) return;
    swipingRef.current = false;
    setDragging(false);
    if (lastDelta.current < -DELETE_THRESHOLD) {
      setLeaving(true);
      setDragX(-window.innerWidth);
      setTimeout(onDelete, 200);
    } else {
      setDragX(0);
    }
  }

  const revealed = Math.min(1, Math.abs(dragX) / DELETE_THRESHOLD);

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0 flex items-center justify-end rounded-[1.5rem] bg-red pr-6"
        style={{ opacity: revealed }}
        aria-hidden="true"
      >
        <TrashIcon className="h-5 w-5 text-white" />
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : leaving ? "transform 0.2s ease" : "transform 0.25s ease",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
