import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import PageHeader from "../components/layout/PageHeader";
import IdeaComposer from "../components/ideas/IdeaComposer";
import IdeaCard from "../components/ideas/IdeaCard";
import TaskFormModal from "../components/tasks/TaskFormModal";
import { ideasRepo, settingsRepo, recurringTasksRepo, promoteIdeaToTask } from "../db/repository";
import { IDEA_TAGS } from "../config/constants";
import { SearchIcon } from "../components/icons";

// Idea text becomes the task title as-is, unless it runs long — then it's
// clipped to the first line and a sensible length so the task list doesn't
// get a novel for a title.
function titleFromIdea(text) {
  const firstLine = text.split("\n")[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 77).trimEnd()}…` : firstLine;
}

export default function Ideas() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("All");
  const [unactionedOnly, setUnactionedOnly] = useState(false);
  const ideas = useLiveQuery(() => ideasRepo.list({ tag, search, unactionedOnly }), [tag, search, unactionedOnly]) || [];
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const tags = settings?.tagList || [];
  const [resurfaced, setResurfaced] = useState(null);
  const [promotingIdea, setPromotingIdea] = useState(null);

  useEffect(() => {
    ideasRepo.randomOlderThan(1).then(setResurfaced);
  }, []);

  async function savePromotedTask(values, recurrence) {
    if (recurrence) {
      const templateId = await recurringTasksRepo.create({ ...values, recurrence });
      await promoteIdeaToTask(promotingIdea, { ...values, recurrence, recurringTemplateId: templateId, source: "recurring" });
    } else {
      await promoteIdeaToTask(promotingIdea, values);
    }
    setPromotingIdea(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Notes inbox" title="Ideas & Learning" />

      <div className="px-5">
        <IdeaComposer onAdd={(idea) => ideasRepo.create(idea)} />
      </div>

      {resurfaced && (
        <div className="mx-5 rounded-2xl bg-sage/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-sage">From {format(parseISO(resurfaced.timestamp), "MMM d")}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{resurfaced.text}</p>
        </div>
      )}

      <div className="space-y-2 px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-sage/30 bg-surface px-3">
          <SearchIcon className="h-4 w-4 text-sage" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas…"
            className="h-11 flex-1 bg-transparent text-sm font-semibold text-ink focus:outline-none"
          />
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["All", ...IDEA_TAGS].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                tag === t ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUnactionedOnly((v) => !v)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              unactionedOnly ? "border-charcoal bg-charcoal text-white" : "border-sage/30 bg-surface text-ink"
            }`}
          >
            Not yet actioned
          </button>
        </div>
      </div>

      <div className="space-y-2.5 px-5">
        {ideas.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-sage/40 p-6 text-center text-sm font-semibold text-sage">
            Nothing here yet — jot something down above.
          </div>
        )}
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            onRemove={(i) => ideasRepo.remove(i.id)}
            onUpdate={(id, changes) => ideasRepo.update(id, changes)}
            onPromote={setPromotingIdea}
          />
        ))}
      </div>

      {promotingIdea && (
        <TaskFormModal
          task={{ title: titleFromIdea(promotingIdea.text) }}
          tags={tags}
          defaultRemindMe={settings?.remindersEnabledByDefault}
          onClose={() => setPromotingIdea(null)}
          onSave={savePromotedTask}
        />
      )}
    </div>
  );
}
