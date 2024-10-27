import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import debounce from "lodash/debounce";
import TimePickerModal from "./TimePickerModal";

interface TimeBlockData {
  id: string;
  start: number;
  end: number;
  label: string;
  color: string;
  calendarId: string;
}

interface DragState {
  type: "move" | "resize-start" | "resize-end" | null;
  blockId: string | null;
  initialX: number;
  initialStart: number;
  initialEnd: number;
}

const ROW_HEIGHT = 30;
const TOP_MARGIN = 30;
const BOTTOM_PADDING = 20;
const MIN_ROW_COUNT = 3;
const HANDLE_WIDTH = 4;

// Memoized time formatter
const formatTime = (time: number): string => {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

// Memoized TimeMarker component
const TimeMarker = memo(({ hour }: { hour: number }) => (
  <div className="absolute top-0 border-b" style={{ left: `${(hour / 24) * 100}%` }}>
    <div className="w-px h-2 bg-gray-400" />
    <div className="text-xs -ml-1 text-gray-600">{hour}</div>
  </div>
));

TimeMarker.displayName = "TimeMarker";

const TimeBlock = memo(({ block, row, isEditing, dragState, onStartDrag, onStartEdit, onUpdateLabel, onDelete, onTimeEdit }: { 
  block: TimeBlockData; 
  row: number; 
  isEditing: boolean; 
  dragState: DragState; 
  onStartDrag: (e: React.MouseEvent, type: DragState["type"], blockId: string) => void; 
  onStartEdit: (blockId: string, label: string) => void; 
  onUpdateLabel: (blockId: string, label: string) => void; 
  onDelete: (e: React.MouseEvent, blockId: string) => void; 
  onTimeEdit: (block: TimeBlockData) => void 
}) => {
  const [editValue, setEditValue] = useState(block.label);
  const spansMidnight = block.start > block.end;

  useEffect(() => {
    if (isEditing) {
      setEditValue(block.label);
    }
  }, [isEditing, block.label]);

  // Render two blocks if the time span crosses midnight
  const renderBlock = (start: number, end: number, isSecondPart: boolean = false) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (e.metaKey) onTimeEdit(block);
      }}
      className="absolute border rounded flex items-center justify-between text-xs 
                 group overflow-visible cursor-grab transform transition-transform duration-150 ease-out"
      style={{
        left: `${(start / 24) * 100}%`,
        width: `${((end - start) / 24) * 100}%`,
        height: `${ROW_HEIGHT}px`,
        top: `${TOP_MARGIN + row * ROW_HEIGHT}px`,
        backgroundColor: block.color,
        transform: dragState.blockId === block.id ? "scale(1.02)" : "scale(1)",
        zIndex: dragState.blockId === block.id ? 50 : 1,
      }}
      onMouseDown={(e) => onStartDrag(e, "move", block.id)}
      onDoubleClick={() => onStartEdit(block.id, block.label)}
    >
      <div className="flex-1 px-2 py-1 truncate">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                onUpdateLabel(block.id, editValue);
              }
            }}
            className="w-full bg-transparent outline-none"
            autoFocus
            onBlur={() => onUpdateLabel(block.id, editValue)}
          />
        ) : (
          <span>
            {block.label} ({formatTime(block.start)}-{formatTime(block.end)})
            {isSecondPart && " (cont.)"}
          </span>
        )}
      </div>

      {!isSecondPart && (
        <button
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 
                    flex items-center justify-center opacity-0 group-hover:opacity-100 
                    transition-opacity duration-200 z-20"
          onClick={(e) => onDelete(e, block.id)}
        >
          ×
        </button>
      )}

      {["start", "end"].map((type) => (
        <div
          key={type}
          className="absolute top-0 h-full hover:bg-gray-400 opacity-0 group-hover:opacity-50 
                    transition-opacity duration-200"
          style={{
            width: `${HANDLE_WIDTH}px`,
            [type === "start" ? "left" : "right"]: 0,
            transform: `translateX(${type === "start" ? "-" : ""}50%)`,
            cursor: "col-resize",
          }}
          onMouseDown={(e) => onStartDrag(e, `resize-${type}` as "resize-start" | "resize-end", block.id)}
        />
      ))}
    </div>
  );

  return spansMidnight ? (
    <>
      {renderBlock(block.start, 24)} {/* First part until midnight */}
      {renderBlock(0, block.end, true)} {/* Second part from midnight */}
    </>
  ) : (
    renderBlock(block.start, block.end)
  );
});

TimeBlock.displayName = "TimeBlock";

const TimelineDisplay: React.FC<{
  blocks: TimeBlockData[];
  calendarId: string;
  onAddBlock: (block: TimeBlockData) => void;
  onUpdateBlock: (id: string, updates: Partial<TimeBlockData>) => void;
  onDeleteBlock: (id: string) => void;
}> = ({ blocks, calendarId, onAddBlock, onUpdateBlock, onDeleteBlock }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    blockId: null,
    initialX: 0,
    initialStart: 0,
    initialEnd: 0,
  });
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlockData | null>(null);

  // Memoize row calculations
  const { blockRows, maxRow } = useMemo(() => {
    const rows = new Map();
    let maxRowFound = 0;

    [...blocks]
      .sort((a, b) => a.start - b.start)
      .forEach((block) => {
        let row = 0;
        while ([...rows.entries()].some(([id, r]) => r === row && blocks.find((b) => b.id === id)!.start < block.end && blocks.find((b) => b.id === id)!.end > block.start)) {
          row++;
        }
        maxRowFound = Math.max(maxRowFound, row);
        rows.set(block.id, row);
      });

    return {
      blockRows: rows,
      maxRow: Math.max(maxRowFound + 1, MIN_ROW_COUNT),
    };
  }, [blocks]);

  const getTimeFromX = useCallback((x: number): number => {
    if (!timelineRef.current) return 0;
    const bounds = timelineRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(bounds.width, x - bounds.left));
    return Math.max(0, Math.min(24, Math.round((relativeX / bounds.width) * 24 * 4) / 4));
  }, []);

  const debouncedUpdate = useMemo(
    () =>
      debounce((id: string, updates: Partial<TimeBlockData>) => {
        onUpdateBlock(id, updates);
      }, 16),
    [onUpdateBlock]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.type || !dragState.blockId || !timelineRef.current) return;

      const block = blocks.find((b) => b.id === dragState.blockId);
      if (!block) return;

      const bounds = timelineRef.current.getBoundingClientRect();
      const timeShift = ((e.clientX - dragState.initialX) / bounds.width) * 24;
      let updates: Partial<TimeBlockData> = {};

      requestAnimationFrame(() => {
        if (dragState.type === "move") {
          const duration = block.end - block.start;
          const newStart = Math.max(0, Math.min(24 - duration, dragState.initialStart + timeShift));
          updates = {
            start: Math.round(newStart * 4) / 4,
            end: Math.round((newStart + duration) * 4) / 4,
          };
        } else {
          const value = dragState.type === "resize-start" ? Math.max(0, Math.min(block.end - 0.25, dragState.initialStart + timeShift)) : Math.max(block.start + 0.25, Math.min(24, dragState.initialEnd + timeShift));

          updates = {
            [dragState.type === "resize-start" ? "start" : "end"]: Math.round(value * 4) / 4,
          };
        }

        debouncedUpdate(block.id, updates);
      });
    },
    [blocks, dragState, debouncedUpdate]
  );

  const handleStartDrag = useCallback(
    (e: React.MouseEvent, type: DragState["type"], blockId: string) => {
      e.stopPropagation();
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      setDragState({
        type,
        blockId,
        initialX: e.clientX,
        initialStart: block.start,
        initialEnd: block.end,
      });
    },
    [blocks]
  );

  const handleStartEdit = useCallback((blockId: string, label: string) => {
    setEditingBlock(blockId);
  }, []);

  const handleTimeEdit = useCallback((block: TimeBlockData) => {
    setSelectedBlock(block);
  }, []);

  const handleUpdateLabel = useCallback(
    (blockId: string, label: string) => {
      onUpdateBlock(blockId, { label });
      setEditingBlock(null);
    },
    [onUpdateBlock]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, blockId: string) => {
      e.stopPropagation();
      onDeleteBlock(blockId);
    },
    [onDeleteBlock]
  );

  useEffect(() => {
    if (dragState.type) {
      document.addEventListener("mousemove", handleMouseMove);
      const handleMouseUp = () => {
        setDragState({ type: null, blockId: null, initialX: 0, initialStart: 0, initialEnd: 0 });
      };
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.type, handleMouseMove]);

  const timeMarkers = useMemo(() => Array.from({ length: 25 }, (_, i) => <TimeMarker key={i} hour={i} />), []);

  return (
    <Card>
      <CardContent className="pb-6">
        <div
          ref={timelineRef}
          className="relative bg-gray-50 border border-gray-200 rounded-lg select-none"
          style={{
            height: `${TOP_MARGIN + maxRow * ROW_HEIGHT + BOTTOM_PADDING}px`,
            marginBottom: "12px",
          }}
          onMouseDown={(e) => {
            const startTime = getTimeFromX(e.clientX);
            onAddBlock({
              id: `block-${Date.now()}`,
              start: startTime,
              end: startTime + 2,
              label: "New Block",
              color: "#E6F3FF",
              calendarId,
            });
          }}
        >
          {timeMarkers}

          {blocks.map((block) => (
            <TimeBlock key={block.id} block={block} row={blockRows.get(block.id) || 0} isEditing={editingBlock === block.id} dragState={dragState} onStartDrag={handleStartDrag} onStartEdit={handleStartEdit} onUpdateLabel={handleUpdateLabel} onDelete={handleDelete} onTimeEdit={handleTimeEdit} />
          ))}
        </div>
        <TimePickerModal
          isOpen={selectedBlock !== null}
          onClose={() => setSelectedBlock(null)}
          block={selectedBlock}
          onUpdateTime={(id, start, end) => {
            onUpdateBlock(id, { start, end });
            setSelectedBlock(null);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default memo(TimelineDisplay);
