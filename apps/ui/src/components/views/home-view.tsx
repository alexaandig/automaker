import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stages = [
  { id: 'lead', label: 'Leads', color: 'bg-sky-500', count: 8 },
  { id: 'brief', label: 'Briefs', color: 'bg-violet-500', count: 5 },
  { id: 'proposal', label: 'Proposals', color: 'bg-amber-500', count: 4 },
  { id: 'contract', label: 'Contracts', color: 'bg-orange-500', count: 3 },
  { id: 'billing', label: 'Billing', color: 'bg-emerald-500', count: 6 },
] as const;

type StageId = (typeof stages)[number]['id'];

type Deal = {
  id: string;
  name: string;
  customer: string;
  stage: StageId;
  value: string;
  owner: string;
  initials: string;
  due: string;
  status: string;
  statusTone: 'default' | 'secondary' | 'outline';
};

const deals: Deal[] = [
  {
    id: 'acme',
    name: 'Acme website rebuild',
    customer: 'Acme Corporation',
    stage: 'proposal',
    value: '$48,000',
    owner: 'Maya Chen',
    initials: 'MC',
    due: 'Due Oct 04',
    status: 'Needs review',
    statusTone: 'default',
  },
  {
    id: 'northstar',
    name: 'Northstar mobile app',
    customer: 'Northstar Labs',
    stage: 'brief',
    value: '$72,500',
    owner: 'Jordan Lee',
    initials: 'JL',
    due: 'Due Oct 08',
    status: 'Draft',
    statusTone: 'secondary',
  },
  {
    id: 'lumen',
    name: 'Lumen brand system',
    customer: 'Lumen Studio',
    stage: 'contract',
    value: '$31,200',
    owner: 'Maya Chen',
    initials: 'MC',
    due: 'Due Sep 30',
    status: 'Awaiting signature',
    statusTone: 'outline',
  },
  {
    id: 'orbit',
    name: 'Orbit analytics rollout',
    customer: 'Orbit Health',
    stage: 'lead',
    value: '$96,000',
    owner: 'Sam Rivera',
    initials: 'SR',
    due: 'Updated today',
    status: 'Qualified',
    statusTone: 'secondary',
  },
  {
    id: 'field',
    name: 'Fieldwork portal',
    customer: 'Fieldwork Co.',
    stage: 'billing',
    value: '$18,750',
    owner: 'Jordan Lee',
    initials: 'JL',
    due: 'Invoice #1042',
    status: 'Payment due',
    statusTone: 'default',
  },
  {
    id: 'haven',
    name: 'Haven onboarding',
    customer: 'Haven Financial',
    stage: 'billing',
    value: '$12,400',
    owner: 'Sam Rivera',
    initials: 'SR',
    due: 'Paid Sep 24',
    status: 'Paid',
    statusTone: 'outline',
  },
];

const stageLabels: Record<StageId, string> = Object.fromEntries(
  stages.map((stage) => [stage.id, stage.label])
) as Record<StageId, string>;

function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-none">
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-2.5 text-muted-foreground">
          <Icon aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function DealCard({ deal, onSelect }: { deal: Deal; onSelect: (deal: Deal) => void }) {
  const stage = stages.find((item) => item.id === deal.stage);
  return (
    <button
      type="button"
      onClick={() => onSelect(deal)}
      className="group w-full rounded-xl border border-border/70 bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{deal.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{deal.customer}</p>
        </div>
        <MoreHorizontal
          aria-hidden="true"
          className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{deal.value}</span>
        <Badge variant={deal.statusTone} className="max-w-[125px] truncate text-[10px]">
          {deal.status}
        </Badge>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${stage?.color}`} />
          {stageLabels[deal.stage]}
        </span>
        <span>{deal.due}</span>
      </div>
    </button>
  );
}

export function HomeView() {
  const currentProject = useAppStore((state) => state.currentProject);
  const [activeStage, setActiveStage] = useState<StageId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const filteredDeals = useMemo(
    () =>
      deals.filter((deal) => {
        const matchesStage = activeStage === 'all' || deal.stage === activeStage;
        const query = search.trim().toLowerCase();
        return (
          matchesStage && (!query || `${deal.name} ${deal.customer}`.toLowerCase().includes(query))
        );
      }),
    [activeStage, search]
  );

  return (
    <main className="content-bg min-h-full flex-1 overflow-y-auto" data-testid="home-view">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 p-5 lg:p-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" /> Revenue workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Good morning, Maya</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep every opportunity moving from first conversation to paid invoice.
            </p>
            {currentProject && (
              <p className="mt-1 text-xs text-muted-foreground">Workspace: {currentProject.name}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm">
              <CalendarDays data-icon="inline-start" />
              This quarter
              <ChevronDown data-icon="inline-end" />
            </Button>
            <Button size="sm">
              <Plus data-icon="inline-start" />
              New opportunity
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Revenue overview">
          <Stat
            label="Pipeline value"
            value="$268,850"
            detail="+18.4% vs last quarter"
            icon={CircleDollarSign}
          />
          <Stat
            label="Active opportunities"
            value="26"
            detail="8 need attention this week"
            icon={Users}
          />
          <Stat
            label="Awaiting signature"
            value="$103,200"
            detail="3 contracts in review"
            icon={FileText}
          />
          <Stat
            label="Outstanding invoices"
            value="$31,150"
            detail="2 overdue · 4 due soon"
            icon={WalletCards}
          />
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Sparkles aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Lead-to-cash pipeline</h2>
                <p className="text-xs text-muted-foreground">
                  One view of every commercial relationship and its next action.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm">
                <SlidersHorizontal data-icon="inline-start" />
                Customize
              </Button>
              <Button variant="outline" size="sm">
                <Filter data-icon="inline-start" />
                Filters
              </Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-5">
            {stages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(activeStage === stage.id ? 'all' : stage.id)}
                className={`rounded-lg border p-3 text-left transition ${activeStage === stage.id ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/40 hover:border-primary/40'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`size-2 rounded-full ${stage.color}`} />
                  <span className="text-lg font-semibold">{stage.count}</span>
                </div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">{stage.label}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="opportunities-title">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="opportunities-title" className="text-lg font-semibold">
                  Active opportunities
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filteredDeals.length} records · click a card to inspect the relationship
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-2.5 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search opportunities"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onSelect={setSelectedDeal} />
              ))}
            </div>
            {filteredDeals.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No opportunities match these filters.
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <Card className="border-border/70 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  Next actions <ArrowRight />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
                  <div className="mt-0.5 text-amber-500">
                    <Clock3 />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Review Acme proposal</p>
                    <p className="mt-1 text-xs text-muted-foreground">Due today · Maya Chen</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
                  <div className="mt-0.5 text-violet-500">
                    <FileText />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Send Northstar brief</p>
                    <p className="mt-1 text-xs text-muted-foreground">Due tomorrow · Jordan Lee</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
                  <div className="mt-0.5 text-emerald-500">
                    <WalletCards />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Follow up on invoice #1042</p>
                    <p className="mt-1 text-xs text-muted-foreground">2 days overdue · Fieldwork</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-primary text-primary-foreground shadow-none">
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-foreground/70">
                  Quarterly target
                </p>
                <p className="mt-3 text-3xl font-semibold">74%</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20">
                  <div className="h-full w-[74%] rounded-full bg-primary-foreground" />
                </div>
                <p className="mt-3 text-xs text-primary-foreground/70">
                  $268,850 of $360,000 closed or forecasted
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>

        {selectedDeal && (
          <div
            role="dialog"
            aria-label={`${selectedDeal.name} details`}
            className="fixed inset-y-0 right-0 z-20 w-full max-w-md border-l border-border bg-background p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {stageLabels[selectedDeal.stage]}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{selectedDeal.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedDeal.customer}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close details"
                onClick={() => setSelectedDeal(null)}
              >
                <Check />
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Estimated value</p>
                <p className="mt-1 font-semibold">{selectedDeal.value}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 font-semibold">{selectedDeal.status}</p>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Next step
              </p>
              <p className="mt-2 text-sm leading-6">
                Review the linked project brief, confirm scope, then move this opportunity forward
                to the next commercial stage.
              </p>
              <Button className="mt-5 w-full">
                Open relationship record <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
