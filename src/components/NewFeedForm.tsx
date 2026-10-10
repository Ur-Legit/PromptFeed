"use client";

import { useActionState } from "react";
import { createFeedAction, type FormState } from "@/app/actions";

const EXAMPLES = [
  "Fusion energy startups and funding rounds",
  "New open-weight AI models and benchmarks",
  "Arsenal transfer news and injury updates",
  "Housing policy in California",
];

export function NewFeedForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createFeedAction, {});

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="prompt" className="block text-sm font-medium">
        What do you want to follow?
      </label>
      <textarea
        id="prompt"
        name="prompt"
        rows={3}
        required
        maxLength={1000}
        placeholder={`e.g. ${EXAMPLES[0]}`}
        className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={(e) => {
              const ta = e.currentTarget.form?.elements.namedItem("prompt") as HTMLTextAreaElement;
              ta.value = ex;
              ta.focus();
            }}
            className="rounded-full border border-stone-300 dark:border-stone-700 px-3 py-1 text-xs text-stone-600 dark:text-stone-400 hover:border-amber-500"
          >
            {ex}
          </button>
        ))}
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Setting up your feed…" : "Create feed"}
      </button>
    </form>
  );
}
