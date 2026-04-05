# Teacher account type review (April 5, 2026)

## What looks strong

1. **Role-gated server auth is consistently applied for teacher APIs.**
   - Teacher endpoints use `requireTeacherContext`, which enforces authenticated identity, `TEACHER` role, and school scoping before data is loaded.

2. **The teacher workspace model is cohesive and practical.**
   - The bootstrap endpoint composes profile, classes, subjects, rollcall completion, workload counters, and first-login flags in a single payload.
   - The dashboard page consumes shared workspace state through `useTeacherWorkspace`, avoiding repeated account-profile lookups on mount.

3. **Routing and login normalization is thoughtful.**
   - Teacher users are redirected into canonical `/teacher/*` routes.
   - Shared protected pages (profile/settings/messages/announcements/events/notifications) are mapped into teacher-specific paths where relevant.

4. **First-login password-change flow is enforced.**
   - Middleware checks `mustChangePassword` and redirects authenticated users to `/first-login` before dashboard access.

## Risks and improvement opportunities

1. **`/list` is currently allowed for any authenticated role in middleware access checks.**
   - `canAccessPath` returns `true` for `pathname.startsWith("/list")` regardless of role.
   - If any `/list/*` screens are admin-only operational screens, this could create an authorization gap at route level.
   - Recommendation: make `/list` role-scoped explicitly (or migrate equivalent pages under role prefixes).

2. **Protected-prefix definitions are duplicated across modules.**
   - Shared protected prefixes are declared in both `lib/auth-routing.ts` and `middleware.ts`.
   - Divergence risk over time can cause inconsistent redirects vs authorization checks.
   - Recommendation: centralize shared-prefix constants in one module consumed by both.

3. **Teacher dashboard has multiple independent fetch effects.**
   - Dashboard currently fetches classes and activity separately, while workspace bootstrap already carries broad summary data.
   - Not wrong, but this can increase request chatter and partial-error states.
   - Recommendation: evaluate whether one consolidated teacher-dashboard payload can reduce load and simplify failure UX.

## Overall opinion

The teacher account type is **well-designed and production-oriented**: role checks are present, route normalization is solid, and teacher UX is separated cleanly from admin flows. The main thing I would prioritize next is tightening `/list` authorization and consolidating duplicated route-policy constants.
