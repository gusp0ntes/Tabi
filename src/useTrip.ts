import { useEffect, useRef, useState } from "react";
import type { Trip } from "../shared/schema";
import { editableTripSchema } from "../shared/schema";
import { tripData } from "../shared/planner";
import { api, ApiError } from "./api";
export type ChangeTrip = (next: Trip | ((trip: Trip) => Trip)) => void;
export function useTrip(id: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState<
    "saved" | "pending" | "saving" | "error" | "conflict"
  >("saved");
  const current = useRef<Trip | null>(null),
    desired = useRef(0),
    saved = useRef(0),
    revision = useRef(0),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    running = useRef<Promise<boolean> | null>(null),
    conflict = useRef(false),
    flushRef = useRef<() => Promise<boolean>>(async () => true);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    api<{ trip: Trip }>("/trips/" + id)
      .then((r) => {
        if (!active) return;
        current.current = r.trip;
        revision.current = r.trip.revision;
        setTrip(r.trip);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      void flushRef.current();
    };
  }, [id]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (desired.current > saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function safeStatus(value: typeof status, message = "") {
    if (mounted.current) {
      setStatus(value);
      setSaveError(message);
    }
  }
  async function flush(): Promise<boolean> {
    if (running.current) return running.current;
    if (conflict.current) return false;
    const work = async () => {
      while (desired.current > saved.current && current.current) {
        const version = desired.current;
        const snapshot = current.current;
        safeStatus("saving");
        try {
          const r = await api<{ trip: Trip }>("/trips/" + id, {
            method: "PUT",
            body: JSON.stringify({
              revision: revision.current,
              data: tripData(snapshot),
            }),
          });
          revision.current = r.trip.revision;
          saved.current = version;
          if (version === desired.current) {
            current.current = r.trip;
            if (mounted.current) setTrip(r.trip);
          } else {
            current.current = {
              ...current.current!,
              revision: r.trip.revision,
              updatedAt: r.trip.updatedAt,
            };
          }
        } catch (e) {
          conflict.current = e instanceof ApiError && e.status === 409;
          safeStatus(
            conflict.current ? "conflict" : "error",
            (e as Error).message,
          );
          return false;
        }
      }
      safeStatus("saved");
      return true;
    };
    const promise = work();
    running.current = promise;
    try {
      return await promise;
    } finally {
      running.current = null;
    }
  }
  flushRef.current = flush;
  const change: ChangeTrip = (next) => {
    if (!current.current) return;
    const result = typeof next === "function" ? next(current.current) : next;
    const validation = editableTripSchema.safeParse(tripData(result));
    if (!validation.success) {
      safeStatus(
        "error",
        validation.error.issues[0]?.message || "Confira os campos.",
      );
      return;
    }
    current.current = result;
    desired.current++;
    setTrip(result);
    if (!conflict.current) {
      safeStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flushRef.current(), 650);
    }
  };
  return { trip, error, saveError, status, change, flush };
}
