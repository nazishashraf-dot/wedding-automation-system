"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  Guest,
  GuestRsvpStatus,
  GuestSummary,
  createWeddingGuest,
  deleteGuest,
  getGuestSummary,
  listWeddingGuests,
  updateGuest,
} from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";
import DeleteButton from "@/components/DeleteButton";
import {
  bareTableAssignment,
  btnPrimary,
  btnPrimarySm,
  btnSecondarySm,
  cardClass,
  formatTableAssignment,
  guestRsvpTone,
  inputClass,
  selectSmClass,
  selectToneClasses,
} from "@/lib/ui";

type GuestEditableField = "mealChoice" | "tableAssignment";

export default function GuestsTab({
  weddingId,
  isOwner,
}: {
  weddingId: string;
  isOwner: boolean;
}) {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [guestSummary, setGuestSummary] = useState<GuestSummary | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPartySize, setGuestPartySize] = useState("1");
  const [guestMealChoice, setGuestMealChoice] = useState("");
  const [guestTableAssignment, setGuestTableAssignment] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    guestId: string;
    field: GuestEditableField;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  async function refreshGuests() {
    try {
      const data = await listWeddingGuests(weddingId);
      setGuests(data);
      setGuestError(null);
    } catch (err) {
      setGuestError(err instanceof ApiError ? err.message : "Failed to load guests");
    }
  }

  async function refreshGuestSummary() {
    try {
      const data = await getGuestSummary(weddingId);
      setGuestSummary(data);
    } catch {
      // summary is a nice-to-have strip — a failed fetch just leaves it blank
    }
  }

  useEffect(() => {
    refreshGuests();
    refreshGuestSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId]);

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    setAddingGuest(true);
    setGuestError(null);
    try {
      await createWeddingGuest(weddingId, {
        fullName: guestName,
        partySize: guestPartySize === "" ? undefined : Number(guestPartySize),
        mealChoice: guestMealChoice || undefined,
        tableAssignment: guestTableAssignment || undefined,
      });
      setGuestName("");
      setGuestPartySize("1");
      setGuestMealChoice("");
      setGuestTableAssignment("");
      setShowGuestForm(false);
      await refreshGuests();
      await refreshGuestSummary();
    } catch (err) {
      setGuestError(err instanceof ApiError ? err.message : "Failed to add guest");
    } finally {
      setAddingGuest(false);
    }
  }

  async function handleGuestRsvpChange(guestId: string, rsvpStatus: string) {
    try {
      await updateGuest(guestId, { rsvpStatus: rsvpStatus as GuestRsvpStatus });
      await refreshGuests();
      await refreshGuestSummary();
    } catch (err) {
      setGuestError(err instanceof ApiError ? err.message : "Failed to update RSVP");
    }
  }

  function startEditCell(guestId: string, field: GuestEditableField, currentValue: string) {
    setEditingCell({ guestId, field });
    setEditingValue(currentValue);
  }

  function cancelEditCell() {
    setEditingCell(null);
    setEditingValue("");
  }

  async function commitEditCell() {
    if (!editingCell) return;
    const { guestId, field } = editingCell;
    const value = editingValue.trim();
    setEditingCell(null);
    try {
      const payload: Partial<Record<GuestEditableField, string>> = {};
      payload[field] = value;
      await updateGuest(guestId, payload);
      await refreshGuests();
    } catch (err) {
      setGuestError(
        err instanceof ApiError
          ? err.message
          : `Failed to update ${field === "mealChoice" ? "meal choice" : "table assignment"}`
      );
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEditCell();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditCell();
    }
  }

  function editableGuestField(
    g: Guest,
    field: GuestEditableField,
    displayValue: string,
    seedValue: string
  ) {
    const isEditing = editingCell?.guestId === g.id && editingCell.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          className={`${inputClass} w-28 py-1 text-xs`}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={commitEditCell}
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => startEditCell(g.id, field, seedValue)}
        className="rounded px-1 py-0.5 text-left decoration-dotted transition-colors hover:bg-ivory-100 hover:underline"
        title="Click to edit"
      >
        {displayValue || "—"}
      </button>
    );
  }

  async function handleDeleteGuest(guestId: string) {
    try {
      await deleteGuest(guestId);
      await refreshGuests();
      await refreshGuestSummary();
    } catch (err) {
      setGuestError(err instanceof ApiError ? err.message : "Failed to delete guest");
    }
  }

  return (
    <section className={cardClass}>
      <SectionHeading
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/import?type=guests&weddingId=${weddingId}`} className={btnSecondarySm}>
              Import from CSV
            </Link>
            <button
              type="button"
              onClick={() => setShowGuestForm((s) => !s)}
              className={btnPrimarySm}
            >
              {showGuestForm ? "Cancel" : "+ Add Guest"}
            </button>
          </div>
        }
      >
        Guest List
      </SectionHeading>

      {guestSummary && (
        <p className="mb-4 text-sm text-plum-600">
          {guestSummary.totalInvited} invited · {guestSummary.attending} confirmed ·{" "}
          {guestSummary.declined} declined · {guestSummary.pending} pending
        </p>
      )}

      {showGuestForm && (
        <form
          onSubmit={handleAddGuest}
          className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gold-100 bg-ivory-100/60 p-4 sm:grid-cols-4"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-plum-600">Name</label>
            <input
              required
              className={inputClass}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Party size</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={guestPartySize}
              onChange={(e) => setGuestPartySize(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Meal choice</label>
            <input
              className={inputClass}
              value={guestMealChoice}
              onChange={(e) => setGuestMealChoice(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-medium text-plum-600">
              Table assignment
            </label>
            <input
              className={`${inputClass} sm:max-w-xs`}
              value={guestTableAssignment}
              onChange={(e) => setGuestTableAssignment(e.target.value)}
            />
          </div>
          {guestError && <p className="text-sm text-rose-700 sm:col-span-4">{guestError}</p>}
          <div className="flex items-end sm:col-span-4">
            <button type="submit" disabled={addingGuest} className={btnPrimary}>
              {addingGuest ? "Saving..." : "Save Guest"}
            </button>
          </div>
        </form>
      )}

      {!showGuestForm && guestError && <p className="mb-2 text-sm text-rose-700">{guestError}</p>}

      {guests && guests.length === 0 && (
        <p className="rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
          No guests added yet.
        </p>
      )}

      {guests && guests.length > 0 && (
        <>
          {/* Mobile: stacked cards. */}
          <div className="space-y-3 sm:hidden">
            {guests.map((g) => (
              <div key={g.id} className="rounded-lg border border-gold-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-plum">{g.fullName}</p>
                  <span className="text-xs text-plum-400">Party of {g.partySize}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-plum-400">
                  <span className="flex items-center gap-1">
                    Meal: {editableGuestField(g, "mealChoice", g.mealChoice ?? "", g.mealChoice ?? "")}
                  </span>
                  <span className="flex items-center gap-1">
                    Table:{" "}
                    {editableGuestField(
                      g,
                      "tableAssignment",
                      bareTableAssignment(g.tableAssignment),
                      bareTableAssignment(g.tableAssignment)
                    )}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <select
                    value={g.rsvpStatus}
                    onChange={(e) => handleGuestRsvpChange(g.id, e.target.value)}
                    className={`${selectSmClass} ${selectToneClasses[guestRsvpTone(g.rsvpStatus)]}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="attending">Attending</option>
                    <option value="declined">Declined</option>
                  </select>
                  {isOwner && <DeleteButton onDelete={() => handleDeleteGuest(g.id)} />}
                </div>
              </div>
            ))}
          </div>

          {/* Tablet and up: full table. */}
          <div className="hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Party Size</th>
                  <th className="px-3 py-2 font-medium">RSVP</th>
                  <th className="px-3 py-2 font-medium">Meal</th>
                  <th className="px-3 py-2 font-medium">Table</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td className="px-3 py-2 font-medium text-plum">{g.fullName}</td>
                    <td className="px-3 py-2 text-plum-600">{g.partySize}</td>
                    <td className="px-3 py-2">
                      <select
                        value={g.rsvpStatus}
                        onChange={(e) => handleGuestRsvpChange(g.id, e.target.value)}
                        className={`${selectSmClass} ${selectToneClasses[guestRsvpTone(g.rsvpStatus)]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="attending">Attending</option>
                        <option value="declined">Declined</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-plum-600">
                      {editableGuestField(g, "mealChoice", g.mealChoice ?? "", g.mealChoice ?? "")}
                    </td>
                    <td className="px-3 py-2 text-plum-600">
                      {editableGuestField(
                        g,
                        "tableAssignment",
                        formatTableAssignment(g.tableAssignment),
                        bareTableAssignment(g.tableAssignment)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isOwner && <DeleteButton onDelete={() => handleDeleteGuest(g.id)} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
