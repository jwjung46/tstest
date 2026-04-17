import type { AccountUserRecord, UserIdentityRecord } from "./types.ts";
import type { OAuthProviderId } from "../oauth/providers.ts";

function createUserId() {
  return `usr_${crypto.randomUUID()}`;
}

function createIdentityId() {
  return `ident_${crypto.randomUUID()}`;
}

export async function findUserById(
  db: D1Database,
  userId: string,
): Promise<AccountUserRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT id, display_name, primary_email, created_at, updated_at, status, merged_into_user_id FROM users WHERE id = ?",
      )
      .bind(userId)
      .first<AccountUserRecord>()) ?? null
  );
}

export async function createUser(
  db: D1Database,
  {
    displayName,
    primaryEmail,
    now,
  }: {
    displayName: string;
    primaryEmail: string | null;
    now: string;
  },
): Promise<AccountUserRecord> {
  const id = createUserId();

  await db
    .prepare(
      "INSERT INTO users (id, display_name, primary_email, created_at, updated_at, status, merged_into_user_id) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    )
    .bind(id, displayName, primaryEmail, now, now, "active")
    .run();

  return {
    id,
    display_name: displayName,
    primary_email: primaryEmail,
    created_at: now,
    updated_at: now,
    status: "active",
    merged_into_user_id: null,
  };
}

export async function updateUserProfile(
  db: D1Database,
  {
    userId,
    displayName,
    primaryEmail,
    now,
  }: {
    userId: string;
    displayName: string;
    primaryEmail: string | null;
    now: string;
  },
) {
  await db
    .prepare(
      "UPDATE users SET display_name = ?, primary_email = ?, updated_at = ? WHERE id = ?",
    )
    .bind(displayName, primaryEmail, now, userId)
    .run();
}

export async function markUserMerged(
  db: D1Database,
  {
    sourceUserId,
    targetUserId,
    now,
  }: {
    sourceUserId: string;
    targetUserId: string;
    now: string;
  },
) {
  await db
    .prepare(
      "UPDATE users SET status = ?, merged_into_user_id = ?, updated_at = ? WHERE id = ?",
    )
    .bind("merged", targetUserId, now, sourceUserId)
    .run();
}

export async function findIdentityByProviderUserId(
  db: D1Database,
  provider: OAuthProviderId,
  providerUserId: string,
): Promise<UserIdentityRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at FROM user_identities WHERE provider = ? AND provider_user_id = ?",
      )
      .bind(provider, providerUserId)
      .first<UserIdentityRecord>()) ?? null
  );
}

export async function findIdentityByUserProvider(
  db: D1Database,
  userId: string,
  provider: OAuthProviderId,
): Promise<UserIdentityRecord | null> {
  return (
    (await db
      .prepare(
        "SELECT id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at FROM user_identities WHERE user_id = ? AND provider = ?",
      )
      .bind(userId, provider)
      .first<UserIdentityRecord>()) ?? null
  );
}

export async function listIdentitiesByUserId(
  db: D1Database,
  userId: string,
): Promise<UserIdentityRecord[]> {
  const result = await db
    .prepare(
      "SELECT id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at FROM user_identities WHERE user_id = ? ORDER BY created_at ASC",
    )
    .bind(userId)
    .all<UserIdentityRecord>();

  return result.results;
}

export async function createIdentity(
  db: D1Database,
  {
    userId,
    provider,
    providerUserId,
    email,
    emailVerified,
    providerDisplayName,
    now,
  }: {
    userId: string;
    provider: OAuthProviderId;
    providerUserId: string;
    email: string | null;
    emailVerified: boolean | null;
    providerDisplayName: string;
    now: string;
  },
): Promise<UserIdentityRecord> {
  const id = createIdentityId();

  await db
    .prepare(
      "INSERT INTO user_identities (id, user_id, provider, provider_user_id, email, email_verified, provider_display_name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      userId,
      provider,
      providerUserId,
      email,
      emailVerified === null ? null : emailVerified ? 1 : 0,
      providerDisplayName,
      now,
      now,
    )
    .run();

  return {
    id,
    user_id: userId,
    provider,
    provider_user_id: providerUserId,
    email,
    email_verified: emailVerified === null ? null : emailVerified ? 1 : 0,
    provider_display_name: providerDisplayName,
    created_at: now,
    last_login_at: now,
  };
}

export async function updateIdentityFromLogin(
  db: D1Database,
  {
    identityId,
    email,
    emailVerified,
    providerDisplayName,
    now,
  }: {
    identityId: string;
    email: string | null;
    emailVerified: boolean | null;
    providerDisplayName: string;
    now: string;
  },
) {
  await db
    .prepare(
      "UPDATE user_identities SET email = ?, email_verified = ?, provider_display_name = ?, last_login_at = ? WHERE id = ?",
    )
    .bind(
      email,
      emailVerified === null ? null : emailVerified ? 1 : 0,
      providerDisplayName,
      now,
      identityId,
    )
    .run();
}

export async function moveIdentityToUser(
  db: D1Database,
  {
    identityId,
    targetUserId,
  }: {
    identityId: string;
    targetUserId: string;
  },
) {
  await db
    .prepare("UPDATE user_identities SET user_id = ? WHERE id = ?")
    .bind(targetUserId, identityId)
    .run();
}

export async function deleteIdentityById(db: D1Database, identityId: string) {
  await db
    .prepare("DELETE FROM user_identities WHERE id = ?")
    .bind(identityId)
    .run();
}

export async function reassignNotesToUser(
  db: D1Database,
  {
    sourceUserId,
    targetUserId,
  }: {
    sourceUserId: string;
    targetUserId: string;
  },
) {
  const result = await db
    .prepare("UPDATE notes SET user_id = ? WHERE user_id = ?")
    .bind(targetUserId, sourceUserId)
    .run();

  return result.meta.changes ?? 0;
}
