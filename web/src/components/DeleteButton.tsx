"use client";

import { useEffect, useState } from "react";
import { linkRose } from "@/lib/ui";

// Click-twice inline confirm instead of a native confirm() dialog — keeps
// the destructive action a deliberate two-step gesture without a blocking
// browser modal.
export default function DeleteButton({
  onDelete,
  label = "Delete",
  className = linkRose,
}: {
  onDelete: () => Promise<void>;
  label?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setArmed(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={deleting} className={className}>
      {deleting ? "Deleting..." : armed ? "Confirm delete?" : label}
    </button>
  );
}
