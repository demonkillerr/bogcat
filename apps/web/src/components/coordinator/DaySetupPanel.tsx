"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Colleague } from "@/lib/types";
import { api } from "@/lib/api";
import { COLLEAGUE_TYPE_LABELS } from "@/lib/constants";

interface Props {
  allColleagues: Colleague[];
  workingDayId: string | null;
  currentWorking: Colleague[];
  locked: boolean;
  onSaved: (working: Colleague[]) => void;
}

function SortableItem({ colleague }: { colleague: Colleague }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: colleague.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 cursor-grab active:cursor-grabbing shadow-sm select-none"
    >
      <span className="text-slate-400 text-xs">⠿</span>
      <span className="text-sm font-medium">{colleague.name}</span>
      <span className="ml-auto text-xs text-slate-400">{COLLEAGUE_TYPE_LABELS[colleague.type] ?? colleague.type}</span>
    </div>
  );
}

export default function DaySetupPanel({
  allColleagues,
  workingDayId,
  currentWorking,
  locked,
  onSaved,
}: Props) {
  const [working, setWorking] = useState<Colleague[]>(currentWorking);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const available = allColleagues.filter((c) => !working.some((w) => w.id === c.id));

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWorking((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      return oldIndex !== -1 && newIndex !== -1 ? arrayMove(prev, oldIndex, newIndex) : prev;
    });
  }

  function addColleague(c: Colleague) {
    setWorking((prev) => [...prev, c]);
  }

  function removeColleague(id: string) {
    setWorking((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleSave() {
    if (!workingDayId && working.length === 0) {
      setError("Please add at least one colleague.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await api.setTodayColleagues(working.map((c) => c.id));
      onSaved(result.colleagues.map((cod: { colleague: Colleague }) => cod.colleague));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Day Setup</h2>
        {locked && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-3 py-1 rounded-full font-medium">
            🔒 Locked after 10:00 AM
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available colleagues */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            All Colleagues <span className="text-slate-400">({available.length})</span>
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {available.length === 0 ? (
              <p className="text-sm text-slate-400 italic">All colleagues added</p>
            ) : (
              available.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <span className="text-xs text-slate-400">{COLLEAGUE_TYPE_LABELS[c.type] ?? c.type}</span>
                  {!locked && (
                    <button
                      onClick={() => addColleague(c)}
                      className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Working today — drag to reorder */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            Working Today <span className="text-slate-400">({working.length})</span>
          </p>
          {locked ? (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {working.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2"
                >
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{COLLEAGUE_TYPE_LABELS[c.type] ?? c.type}</span>
                </div>
              ))}
              {working.length === 0 && (
                <p className="text-sm text-slate-400 italic">No colleagues set for today</p>
              )}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={working.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {working.map((c) => (
                    <div key={c.id} className="relative group">
                      <SortableItem colleague={c} />
                      <button
                        onClick={() => removeColleague(c.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {working.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Add colleagues from the left</p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {!locked && (
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
          >
            {saving ? "Saving…" : "Save Working Day"}
          </button>
          {success && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
