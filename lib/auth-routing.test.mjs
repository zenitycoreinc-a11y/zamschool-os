import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeLegacyDashboardPath,
  resolveAppWorkspaceHome,
  resolveOnboardingPath,
  resolvePostLoginPath,
  resolvePostRegistrationPath,
  resolveProtectedRolePrefix,
} from "./auth-routing.ts";

test("admin logins resolve to the canonical admin route tree", () => {
  assert.equal(resolveProtectedRolePrefix("admin"), "/admin");
  assert.equal(resolveAppWorkspaceHome("admin"), "/admin");
  assert.equal(resolvePostRegistrationPath("admin"), "/admin");
  assert.equal(resolvePostLoginPath("admin", "/admin/users"), "/admin/users");
  assert.equal(resolvePostLoginPath("admin", "/app/admin/users"), "/admin/users");
  assert.equal(resolvePostLoginPath("admin", "/app/messages"), "/admin/messages");
  assert.equal(resolvePostLoginPath("admin", "/app/profile"), "/admin/profile");
  assert.equal(resolvePostLoginPath("admin", "/app/settings"), "/admin/settings");
});

test("legacy dashboard aliases normalize to canonical admin routes", () => {
  assert.equal(normalizeLegacyDashboardPath("/dashboard"), "/admin");
  assert.equal(normalizeLegacyDashboardPath("/dashboard/finance"), "/admin/finance");
  assert.equal(normalizeLegacyDashboardPath("/payments"), "/payments");
});

test("unsafe redirect values are ignored", () => {
  assert.equal(resolvePostLoginPath("teacher", "https://evil.example"), "/teacher");
});

test("safe non-admin redirect values are preserved", () => {
  assert.equal(resolvePostLoginPath("teacher", "/teacher"), "/teacher");
});

test("shared protected redirects normalize into role-specific dashboards", () => {
  assert.equal(resolvePostLoginPath("teacher", "/app/messages"), "/teacher/messages");
});

test("teacher account redirects normalize to teacher-scoped profile and settings pages", () => {
  assert.equal(resolvePostLoginPath("teacher", "/app/profile"), "/teacher/profile");
  assert.equal(resolvePostLoginPath("teacher", "/app/settings"), "/teacher/settings");
});

test("legacy payments and account utility paths normalize to canonical destinations", () => {
  assert.equal(normalizeLegacyDashboardPath("/payments"), "/payments");
  assert.equal(normalizeLegacyDashboardPath("/payments/fees"), "/payments/fees");
  assert.equal(normalizeLegacyDashboardPath("/profile"), "/admin/profile");
  assert.equal(normalizeLegacyDashboardPath("/settings"), "/admin/settings");
});

test("teacher workspace home resolves to /teacher", () => {
  assert.equal(resolveAppWorkspaceHome("teacher"), "/teacher");
});

test("student workspace home resolves to /student", () => {
  assert.equal(resolveAppWorkspaceHome("student"), "/student");
});

test("parent workspace home resolves to /parent", () => {
  assert.equal(resolveAppWorkspaceHome("parent"), "/parent");
});

test("student and parent legacy account routes normalize into canonical role trees", () => {
  assert.equal(resolvePostLoginPath("student", "/app/profile"), "/student/profile");
  assert.equal(resolvePostLoginPath("student", "/app/settings"), "/student/settings");
  assert.equal(resolvePostLoginPath("parent", "/app/profile"), "/parent/profile");
  assert.equal(resolvePostLoginPath("parent", "/app/settings"), "/parent/settings");
});

test("missing role post-login path goes to login with explicit error", () => {
  assert.equal(resolvePostLoginPath(undefined), "/login?error=profile_not_found");
});

test("missing role has no protected prefix", () => {
  assert.equal(resolveProtectedRolePrefix(undefined), "");
});

test("admin registration lands on the admin dashboard", () => {
  assert.equal(resolvePostRegistrationPath("admin"), "/admin");
});

test("unverified users route to the verification gate", () => {
  assert.equal(
    resolveOnboardingPath({
      role: "admin",
      emailVerified: false,
      hasSchool: false,
    }),
    "/verify-email"
  );
});

test("verified admins without a school route to school setup", () => {
  assert.equal(
    resolveOnboardingPath({
      role: "admin",
      emailVerified: true,
      hasSchool: false,
    }),
    "/admin/school"
  );
});

test("verified admins with a school route to the dashboard", () => {
  assert.equal(
    resolveOnboardingPath({
      role: "admin",
      emailVerified: true,
      hasSchool: true,
    }),
    "/admin"
  );
});

test("verified users preserve redirectTo during onboarding routing", () => {
  assert.equal(
    resolveOnboardingPath({
      role: "teacher",
      emailVerified: true,
      hasSchool: true,
      mustChangePassword: false,
      redirectTo: "/teacher/results",
    }),
    "/teacher/results"
  );
});

test("managed teacher accounts route to first-login until password change is complete", () => {
  assert.equal(
    resolveOnboardingPath({
      role: "teacher",
      emailVerified: true,
      hasSchool: true,
      mustChangePassword: true,
    }),
    "/first-login"
  );
});

test("managed accounts without a resolved role still route to first-login when password reset is required", () => {
  assert.equal(
    resolveOnboardingPath({
      role: null,
      emailVerified: true,
      hasSchool: true,
      mustChangePassword: true,
    }),
    "/first-login"
  );
});

test("teacher alias routes normalize into the teacher route tree", () => {
  assert.equal(resolvePostLoginPath("teacher", "/app/teacher"), "/teacher");
});
