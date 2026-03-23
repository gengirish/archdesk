import {
  Building2,
  IndianRupee,
  AlertTriangle,
  FileCheck,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatINRShort, STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";

const mockStats = {
  activeProjects: 8,
  overdueProjects: 2,
  revenueThisMonth: 485000,
  revenueLastMonth: 320000,
  pendingApprovals: 5,
  leadsCount: 12,
  leadsPipelineValue: 2850000,
};

const mockRecentProjects = [
  {
    id: "1",
    name: "Patil Residence",
    client: "Rajesh Patil",
    stage: "WORKING_DRAWINGS",
    type: "RESIDENTIAL",
    budget: 3500000,
  },
  {
    id: "2",
    name: "Sharma Interiors",
    client: "Priya Sharma",
    stage: "DESIGN_DEV",
    type: "INTERIOR",
    budget: 1200000,
  },
  {
    id: "3",
    name: "KLE Campus Block B",
    client: "KLE Society",
    stage: "EXECUTION",
    type: "INSTITUTIONAL",
    budget: 15000000,
  },
  {
    id: "4",
    name: "Deshpande Office",
    client: "Suresh Deshpande",
    stage: "CONCEPT",
    type: "COMMERCIAL",
    budget: 800000,
  },
  {
    id: "5",
    name: "Green Valley Homes",
    client: "Hubli Builders",
    stage: "SCHEMATIC",
    type: "RESIDENTIAL",
    budget: 9500000,
  },
];

const stats = [
  {
    label: "Active Projects",
    value: mockStats.activeProjects,
    icon: Building2,
    suffix: "",
    color: "text-primary",
  },
  {
    label: "Revenue This Month",
    value: mockStats.revenueThisMonth,
    icon: IndianRupee,
    format: "inr",
    color: "text-green-400",
  },
  {
    label: "Pending Approvals",
    value: mockStats.pendingApprovals,
    icon: FileCheck,
    suffix: " drawings",
    color: "text-yellow-400",
  },
  {
    label: "Active Leads",
    value: mockStats.leadsCount,
    icon: UserPlus,
    suffix: "",
    sub: `Pipeline: ${formatINRShort(mockStats.leadsPipelineValue)}`,
    color: "text-blue-400",
  },
];

export default function DashboardPage() {
  const revenueGrowth =
    ((mockStats.revenueThisMonth - mockStats.revenueLastMonth) /
      mockStats.revenueLastMonth) *
    100;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your firm&apos;s projects, revenue, and pipeline
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {stat.format === "inr"
                  ? formatINRShort(stat.value)
                  : stat.value}
                {stat.suffix}
              </div>
              {stat.sub && (
                <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue growth */}
      {mockStats.overdueProjects > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm">
              <strong>{mockStats.overdueProjects} projects</strong> have overdue
              milestones that need attention
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {mockRecentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {project.client}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatINRShort(project.budget)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      borderColor: STAGE_COLORS[project.stage],
                      color: STAGE_COLORS[project.stage],
                    }}
                  >
                    {STAGE_LABELS[project.stage]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp
                className={`h-5 w-5 ${revenueGrowth >= 0 ? "text-green-400" : "text-destructive"}`}
              />
              <div>
                <div className="text-sm font-medium">
                  {revenueGrowth >= 0 ? "+" : ""}
                  {revenueGrowth.toFixed(0)}% from last month
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatINR(mockStats.revenueLastMonth)} &rarr;{" "}
                  {formatINR(mockStats.revenueThisMonth)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Project Stage Distribution
              </div>
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const count = mockRecentProjects.filter(
                  (p) => p.stage === key
                ).length;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[key] }}
                      />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
