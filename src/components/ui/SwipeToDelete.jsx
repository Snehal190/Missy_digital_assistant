import { useRef, useState } from "react";
import { TrashIcon } from "../icons";

const DELETE_THRESHOLD = 96; // px dragged left before release triggers delete

export default function SwipeToDelete({ onDelete, className = "", children }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startX = useRef(0);
  const lastDelta = useRef(0);
  // Mirrors `dragging` synchronously — event handlers must not gate on React
  // state, since pointerdown -> pointermove can fire before a re-render commits.
  const activeRef = useRef(false);

  function handlePointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    lastDelta.current = 0;
    activeRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!activeRef.current) return;
    const delta = Math.min(0, e.clientX - startX.current);
    lastDelta.current = delta;
    setDragX(delta);
  }

  function finishDrag() {
    if (!activeRef.current) return;
    activeRef.current = false;
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
