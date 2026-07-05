import { expect, test, type Page, type Route } from "@playwright/test";

type Role = "admin" | "coach" | "player" | "parent";

const pagination = { total: 0, page: 1, totalPages: 1 };
const paginatedEmpty = { data: [], pagination, meta: { pagination } };

const users: Record<Role, Record<string, unknown>> = {
  admin: {
    id: "e2e-admin",
    email: "admin@goalix.local",
    username: "e2eadmin",
    full_name: "E2E Admin",
    role: "admin",
  },
  coach: {
    id: "e2e-coach",
    email: "coach@goalix.local",
    username: "e2ecoach",
    full_name: "E2E Coach",
    role: "coach",
  },
  player: {
    id: "e2e-player",
    email: "player@goalix.local",
    username: "e2eplayer",
    full_name: "E2E Player",
    role: "player",
    linked_player_id: "player-1",
  },
  parent: {
    id: "e2e-parent",
    email: "parent@goalix.local",
    username: "e2eparent",
    full_name: "E2E Parent",
    role: "parent",
  },
};

const today = new Date().toISOString();

function adminDashboardData() {
  return {
    kpis: {
      totalPlayers: 24,
      totalCoaches: 4,
      activeSubscriptions: 12,
      overduePayments: 1,
      monthlyRevenue: 36000,
      avgAttendanceRate: 87,
    },
    attendanceTrend: [
      { label: "Week 1", value: 82 },
      { label: "Week 2", value: 87 },
    ],
    revenueTrend: [
      { label: "Week 1", value: 12000 },
      { label: "Week 2", value: 18000 },
    ],
    topPlayers: [
      { id: "player-1", fullName: "Noah Williams", totalScore: 91, rank: 1, period: "weekly" },
    ],
    recentAlerts: [
      { id: "alert-1", title: "Training update", body: "Smoke test alert", type: "info", isRead: false, createdAt: today },
    ],
    weeklyMatches: [],
  };
}

function playerProfile() {
  return {
    id: "player-1",
    full_name: "Noah Williams",
    player_code: "P-001",
    position: "RW",
    level: "A",
    profile_status: "complete",
    group_name: "U13",
    branch_name: "Main Branch",
    customProfile: [],
  };
}

function playerProgress() {
  return {
    playerId: "player-1",
    playerName: "Noah Williams",
    attendancePercentage: 88,
    trainingsAttended: 12,
    matchesPlayed: 4,
    matchesAttended: 4,
    monthlyMinutesPlayed: 240,
    monthlyMatchesPlayed: 3,
    goals: 5,
    assists: 3,
    averageTrainingRating: 8.3,
    averageMatchRating: 8.1,
    weekStart: null,
    weekEnd: null,
    monthStart: null,
    monthEnd: null,
    disciplineRecord: { yellowCards: 0, redCards: 0 },
    monthlyProgressSummary: "On track",
  };
}

function parentDashboardData() {
  const child = {
    ...playerProfile(),
    relation: "guardian",
    can_view_progress: true,
    can_view_payments: true,
    can_message_coach: true,
  };

  return {
    children: [child],
    selectedChild: child,
    progress: playerProgress(),
    calendarEvents: paginatedEmpty,
    trainings: paginatedEmpty,
    matches: paginatedEmpty,
    attendance: paginatedEmpty,
    evaluations: paginatedEmpty,
    notes: paginatedEmpty,
    coaches: [{ id: "coach-1", user_id: "e2e-coach", full_name: "Coach Alex", specialization: "Technical" }],
    payments: null,
    weeklyReport: null,
    aiInsights: {
      injuryRisk: null,
      aiEvaluation: null,
      coachEvaluation: null,
      ranking: null,
    },
  };
}

function mockData(pathname: string) {
  if (pathname === "/api/v1/admin/dashboard") return adminDashboardData();
  if (pathname === "/api/v1/player/profile") return playerProfile();
  if (pathname === "/api/v1/player/progress") return playerProgress();
  if (pathname === "/api/v1/parent/dashboard") return parentDashboardData();
  if (pathname === "/api/v1/parent/children") return parentDashboardData().children;
  if (pathname === "/api/v1/coach/permissions") {
    return {
      permissions: ["access_coach_dashboard"],
      groupIds: [],
      birthYearIds: [],
      canEvaluate: true,
      canManageAttendance: true,
    };
  }
  if (pathname === "/api/v1/coach/groups") return [];
  if (pathname === "/api/v1/auth/csrf") return { csrfToken: "e2e-csrf-token" };
  return [];
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockAuthenticatedApi(page: Page, role: Role) {
  const seedClientPreferences = () => {
    window.localStorage.setItem("goalix:auth-session", "1");
    window.localStorage.setItem("goalix-dashboard-language", "en");
    window.localStorage.setItem("goalix-dashboard-theme", "light");
  };

  await page.addInitScript(seedClientPreferences);

  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/auth/refresh") {
      return fulfillJson(route, { success: true, data: { user: users[role] } });
    }
    return fulfillJson(route, { success: true, data: mockData(url.pathname) });
  });
}

async function expectNoClientCrash(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByText(/Unhandled Runtime Error|Application error|Internal Server Error/i)).toHaveCount(0);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
}

test.describe("Goalix public auth surfaces", () => {
  test("login renders on desktop and mobile without layout overflow", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expectNoClientCrash(page);
    await expectNoHorizontalOverflow(page);
  });

  test("admin login renders without runtime errors", async ({ page }) => {
    await page.goto("/admin-login");
    await expectNoClientCrash(page);
    await expectNoHorizontalOverflow(page);
  });
});

const roleRoutes: Array<{ role: Role; path: string; marker: RegExp }> = [
  { role: "admin", path: "/admin/dashboard", marker: /admin|academy|dashboard/i },
  { role: "coach", path: "/coach/home", marker: /coach|training|matches/i },
  { role: "player", path: "/player/home", marker: /player|matches|training/i },
  { role: "parent", path: "/parent/home", marker: /family|guardian|players/i },
];

test.describe("Goalix authenticated dashboards", () => {
  for (const item of roleRoutes) {
    test(`${item.role} dashboard shell renders with mocked backend`, async ({ browser, baseURL }) => {
      const origin = new URL(baseURL ?? "http://localhost:3001").origin;
      const context = await browser.newContext({
        storageState: {
          cookies: [],
          origins: [
            {
              origin,
              localStorage: [
                { name: "goalix:auth-session", value: "1" },
                { name: "goalix-dashboard-language", value: "en" },
                { name: "goalix-dashboard-theme", value: "light" },
              ],
            },
          ],
        },
      });
      const page = await context.newPage();
      await mockAuthenticatedApi(page, item.role);
      await page.goto(item.path);
      await expect(page).toHaveURL(new RegExp(`${item.path.replaceAll("/", "\\/")}`));
      await expect(page.locator("body")).toContainText(item.marker);
      await expectNoClientCrash(page);
      await expectNoHorizontalOverflow(page);
      await context.close();
    });
  }
});
