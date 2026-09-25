import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams, Link } from "react-router-dom";
import { format } from "date-fns";
import PageHeader from "../components/layout/PageHeader";
import CategoryScroller from "../components/tasks/CategoryScroller";
import TaskCard from "../components/tasks/TaskCard";
import QuickAddBar from "../components/tasks/QuickAddBar";
import TaskFormModal from "../components/tasks/TaskFormModal";
import BentoMetric from "../components/ui/BentoMetric";
import EndDayModal from "../components/review/EndDayModal";
import SaveTemplateModal from "../components/tasks/SaveTemplateModal";
import ApplyTemplateModal from "../components/tasks/ApplyTemplateModal";
import { tasksRepo, settingsRepo, recurringTasksRepo, vocabRepo, getStreaks } from "../db/repository";
import { todayStr } from "../lib/dates";
import { getQuoteOfTheDay } from "../lib/dailyQuote";
import { ChartIcon, CheckIcon, SparkleIcon, SyncIcon, DownloadIcon } from "../components/icons";

export default function Today() {
  const date = todayStr();
  const tasks = useLiveQuery(() => tasksRepo.listByDate(date), [date]) || [];
  const settings = useLiveQuery(() => settingsRepo.get(), []);
  const streaks = useLiveQuery(() => getStreaks(), []);
  const wordsDueToday = useLiveQuery(() => vocabRepo.countDueToday(), []) || 0;
  const tags = settings?.tagList || [];

  const [category, setCategory] = useState("All");
  const [formTask, setFormTask] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [endDayOpen, setEndDayOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Landed here from an idea's "Became a task" link, or from tapping a task
  // reminder notification — either way, open that task's editor directly
  // instead of making me hunt for it in the list.
  useEffect(() => {
    const targetId = Number(searchParams.get("promoted") || searchParams.get("remind"));
    if (!targetId || tasks.length === 0) return;
    const target = tasks.find((t) => t.id === targetId);
    if (target) {
      setFormTask(target);
      setFormOpen(true);
    }
    setSearchParams({}, { replace: true });
  }, [tasks, searchParams, setSearchParams]);

  const counts = useMemo(() => {
    const c = { All: tasks.length };
    for (const tag of tags) c[tag] = tasks.filter((t) => t.category === tag).length;
    return c;
  }, [tasks, tags]);

  const quote = getQuoteOfTheDay(date, settings?.customQuotes || []);
  const visibleTasks = category === "All" ? tasks : tasks.filter((t) => t.category === category);
  const completed = tasks.filter((t) => t.status === "Done").length;
  const remaining = tasks.filter((t) => t.status !== "Done" && t.status !== "Skipped").length;
  const nextUp = tasks.find((t) => t.status === "Not started" || t.status === "In progress");

  function openNew() {
    setFormTask(null);
    setFormOpen(true);
  }
  function openEdit(task) {
    setFormTask(task);
    setFormOpen(true);
  }
  async function toggleDone(task) {
    await tasksRepo.update(task.id, { status: task.status === "Done" ? "Not started" : "Done" });
  }
  async function saveTask(values, recurrence) {
    if (formTask?.id) {
      await tasksRepo.update(formTask.id, values);
    } else if (recurrence) {
      // Recurring: the template is the source of truth going forward;
      // today's instance links back to it but is otherwise a normal task.
      const templateId = await recurringTasksRepo.create({ ...values, recurrence });
      await tasksRepo.create({ ...values, date, recurrence, recurringTemplateId: templateId, source: "recurring" });
    } else {
      await tasksRepo.create({ ...values, date });
    }
    setFormOpen(false);
  }
  async function deleteTask(task) {
    await tasksRepo.remove(task.id);
    setFormOpen(false);
  }
  async function quickAdd({ title, time }) {
    await tasksRepo.create({ title, time, date, category: tags[0] || "Personal" });
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={format(new Date(), "EEEE, MMM d")} title="Good day." badgeCount={remaining} />

      {streaks && (
        <div className="mx-5 flex flex-wrap items-center gap-2">
          {streaks.review.count > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red/10 px-3 py-1.5 text-xs font-bold text-red">
              🔥 {streaks.review.count}-day review streak
              {streaks.review.recovering ? " · recovering" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 px-3 py-1.5 text-xs font-bold text-ink">
              🌱 End a day to start a review streak
            </span>
          )}
          {wordsDueToday > 0 && (
            <Link
              to="/vocabulary"
              className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 px-3 py-1.5 text-xs font-bold text-ink"
            >
              📚 {wordsDueToday} word{wordsDueToday === 1 ? "" : "s"} due today
            </Link>
          )}
        </div>
      )}

      <p className="mx-5 rounded-2xl bg-charcoal px-4 py-3 text-center text-xs font-bold italic text-white">
        “{quote}”
      </p>

      <CategoryScroller tags={tags} selected={category} onSelect={setCategory} counts={counts} />

      <section className="relative mx-5 overflow-hidden rounded-card bg-surface p-5 shadow-soft">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sage/20" />

        <div className="relative flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface text-3xl shadow-soft">
            {nextUp ? "🎯" : completed > 0 ? "✅" : "🌤️"}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sage">
              {nextUp ? "Up next" : tasks.length === 0 ? "Nothing planned yet" : "All caught up"}
            </p>
            <p className="truncate text-xl font-black text-ink">
              {nextUp ? nextUp.title : tasks.length === 0 ? "Speak your day to begin" : "Nice work today"}
            </p>
            {nextUp && (
              <p className="text-xs font-semibold text-sage">{nextUp.time || "Anytime"}</p>
            )}
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <BentoMetric label="Completed" value={`${completed} / ${tasks.length || 0}`} Icon={CheckIcon} />
          <BentoMetric label="Remaining" value={remaining} Icon={SparkleIcon} />
        </div>

        <div className="relative mt-4 rounded-2xl bg-sage/20 p-3 text-xs font-semibold text-ink">
          {tasks.length === 0
            ? "Tap the mic below and ramble through your day — Missy will turn it into a schedule."
            : remaining === 0
              ? "Everything planned for today is handled. Ready to close out your day?"
              : `${remaining} task${remaining === 1 ? "" : "s"} left. Small steps still count.`}
        </div>

        {tasks.length > 0 && (
          <button
            type="button"
            onClick={() => setEndDayOpen(true)}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-sage/30 bg-surface py-3 text-xs font-bold text-ink"
          >
            <ChartIcon className="h-4 w-4" />
            End my day
          </button>
        )}
      </section>

      <QuickAddBar onAdd={quickAdd} onOpenFull={openNew} />

      <div className="flex gap-2 px-5">
        <button
          type="button"
          onClick={() => setApplyTemplateOpen(true)}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-sage/30 bg-surface text-xs font-bold text-ink"
        >
          <SyncIcon className="h-3.5 w-3.5" />
          Apply template
        </button>
        <button
          type="button"
          onClick={() => setSaveTemplateOpen(true)}
          disabled={tasks.length === 0}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-sage/30 bg-surface text-xs font-bold text-ink disabled:opacity-40"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Save as template
        </button>
      </div>

      <section className="space-y-2.5 px-5">
        {visibleTasks.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-sage/40 p-6 text-center text-sm font-semibold text-sage">
            No tasks here yet.
          </div>
        )}
        {visibleTasks.map((task) => (
          <TaskCard key={task.id} task={task} onToggleDone={toggleDone} onEdit={openEdit} onDelete={deleteTask} />
        ))}
      </section>

      {formOpen && (
        <TaskFormModal
          task={formTask}
          tags={tags}
          defaultRemindMe={settings?.remindersEnabledByDefault}
          onClose={() => setFormOpen(false)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      {endDayOpen && <EndDayModal date={date} onClose={() => setEndDayOpen(false)} />}

      {saveTemplateOpen && (
        <SaveTemplateModal
          taskCount={tasks.length}
          onClose={() => setSaveTemplateOpen(false)}
          onSaved={() => setSaveTemplateOpen(false)}
        />
      )}

      {applyTemplateOpen && (
        <ApplyTemplateModal
          hasExistingTasks={tasks.length > 0}
          onClose={() => setApplyTemplateOpen(false)}
          onApplied={() => setApplyTemplateOpen(false)}
        />
      )}
    </div>
  );
}
