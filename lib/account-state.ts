export const MANAGED_FIRST_LOGIN_ROLES = ["teacher", "student", "parent"] as const;

export function shouldRequireFirstLoginPasswordChange(role: string) {
  return MANAGED_FIRST_LOGIN_ROLES.includes(role as (typeof MANAGED_FIRST_LOGIN_ROLES)[number]);
}

export function buildCreatedAuthUserMetadata(input: {
  firstName: string;
  lastName: string;
  role: string;
}) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    role: input.role,
    must_change_password: shouldRequireFirstLoginPasswordChange(input.role),
  };
}

/**
 * Generate a cryptographically secure temporary password
 * SECURITY FIX: Use crypto.randomBytes instead of Math.random for better entropy
 */
export function generateTemporaryPassword() {
  const crypto = require('node:crypto');
  // Generate 8 random alphanumeric characters using cryptographically secure RNG
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  const randomBytes = crypto.randomBytes(8);
  
  for (let i = 0; i < 8; i++) {
    random += chars[randomBytes[i] % chars.length];
  }
  
  return `Zam@${random}9`;
}

export function buildCreatedProfilePayload(input: {
  authUserId: string;
  schoolId: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profileExtras: Record<string, any>;
  now?: Date;
}) {
  const now = input.now || new Date();
  const requiresPasswordChange = shouldRequireFirstLoginPasswordChange(input.role);

  return {
    id: input.authUserId,
    school_id: input.schoolId,
    role: input.role.toLowerCase(),
    name: `${input.firstName} ${input.lastName}`.trim(),
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    must_change_password: requiresPasswordChange,
    temporary_password_issued_at: requiresPasswordChange ? now.toISOString() : null,
    ...input.profileExtras,
  };
}
