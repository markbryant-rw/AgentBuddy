import React, { useEffect, useState } from "react";

type PortalInfo = {
  id: number;
  type: "select" | "popover" | "dropdown" | "unknown";
  state: string | null;
  description: string;
};

export const RadixDropdownDebugger: React.FC = () => {
  // Hide in production
  if (import.meta.env.PROD) return null;
  
  const [enabled, setEnabled] = useState(false);
  const [portals, setPortals] = useState<PortalInfo[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) {
      // Clean up highlights when disabled
      const wrappers = document.querySelectorAll<HTMLElement>("[data-radix-popper-content-wrapper]");
      wrappers.forEach((w) => w.classList.remove("debug-radix-highlight"));
      setPortals([]);
      return;
    }

    const update = () => {
      const wrappers = Array.from(
        document.querySelectorAll<HTMLElement>("[data-radix-popper-content-wrapper]")
      );

      const infos: PortalInfo[] = wrappers.map((wrapper, index) => {
        // Try to detect content & state
        const content = wrapper.querySelector<HTMLElement>("[data-state]");
        const state = content?.getAttribute("data-state");

        let type: PortalInfo["type"] = "unknown";
        const html = content?.outerHTML || "";

        if (html.includes("radix-select")) type = "select";
        else if (html.includes("radix-popover")) type = "popover";
        else if (html.includes("radix-dropdown-menu")) type = "dropdown";

        // Add / maintain highlight
        wrapper.classList.add("debug-radix-highlight");

        return {
          id: index,
          type,
          state,
          description: `${type} (${state ?? "unknown"})`,
        };
      });

      setPortals(infos);
    };

    update();
    const intervalId = window.setInterval(update, 300);

    return () => {
      window.clearInterval(intervalId);
      const wrappers = document.querySelectorAll<HTMLElement>("[data-radix-popper-content-wrapper]");
      wrappers.forEach((w) => w.classList.remove("debug-radix-highlight"));
    };
  }, [enabled]);

  // Tiny floating toggle button if not enabled
  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => setEnabled(true)}
        className="fixed bottom-3 right-3 z-[12000] rounded-full bg-slate-800 text-white text-xs px-3 py-1 shadow-md opacity-60 hover:opacity-100"
      >
        Radix Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[12000] w-72 rounded-md border bg-white/95 dark:bg-slate-900/95 p-3 text-xs shadow-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Radix Dropdown Debug</span>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800"
        >
          Hide
        </button>
      </div>

      <div className="text-[11px] text-slate-500">
        Found {portals.length} portal wrapper{portals.length === 1 ? "" : "s"}.
        <br />
        Open a dropdown/date picker to see it highlighted.
      </div>

      <div className="max-h-40 overflow-auto space-y-1">
        {portals.length === 0 ? (
          <div className="text-slate-400 italic">No Radix portals detected.</div>
        ) : (
          portals.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded border px-2 py-1 bg-slate-50 dark:bg-slate-800"
            >
              <span>{p.description}</span>
              <button
                type="button"
                className="text-[10px] underline"
                onClick={() => {
                  const wrappers = document.querySelectorAll<HTMLElement>("[data-radix-popper-content-wrapper]");
                  const wrapper = wrappers[p.id];
                  if (wrapper) {
                    wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
              >
                Focus
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
