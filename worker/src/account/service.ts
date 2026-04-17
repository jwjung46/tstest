import {
  createIdentity,
  createUser,
  deleteIdentityById,
  findIdentityByProviderUserId,
  findIdentityByUserProvider,
  findUserById,
  listIdentitiesByUserId,
  markUserMerged,
  moveIdentityToUser,
  reassignNotesToUser,
  updateIdentityFromLogin,
  updateUserProfile,
} from "./repository.ts";
import type {
  AccountResolutionResult,
  LinkIdentityResult,
  MergeUsersResult,
  NormalizedIdentityPayload,
} from "./types.ts";
import type { WorkerSession } from "../oauth/session.ts";
import type { OAuthProviderId } from "../oauth/providers.ts";

function getSeedDisplayName(payload: NormalizedIdentityPayload) {
  return payload.displayName || "User";
}

export function buildWorkerSession(
  result:
    | AccountResolutionResult
    | {
        user: {
          id: string;
          display_name: string;
          primary_email: string | null;
        };
        activeProvider: string;
      },
): WorkerSession {
  return {
    user: {
      id: result.user.id,
      name: result.user.display_name,
      email: result.user.primary_email ?? undefined,
      provider: result.activeProvider,
    },
  };
}

async function requireActiveUser(db: D1Database, userId: string) {
  const user = await findUserById(db, userId);

  if (!user || user.status !== "active") {
    return null;
  }

  return user;
}

export async function resolveSignInIdentity(
  db: D1Database,
  payload: NormalizedIdentityPayload,
  now: string,
): Promise<AccountResolutionResult> {
  const existingIdentity = await findIdentityByProviderUserId(
    db,
    payload.provider,
    payload.providerUserId,
  );

  if (existingIdentity) {
    await updateIdentityFromLogin(db, {
      identityId: existingIdentity.id,
      email: payload.email,
      emailVerified: payload.emailVerified,
      providerDisplayName: payload.displayName,
      now,
    });

    const user = await requireActiveUser(db, existingIdentity.user_id);

    if (!user) {
      throw new Error("Identity is attached to a non-active user.");
    }

    return {
      user,
      activeProvider: payload.provider,
    };
  }

  const user = await createUser(db, {
    displayName: getSeedDisplayName(payload),
    primaryEmail: payload.email,
    now,
  });

  await createIdentity(db, {
    userId: user.id,
    provider: payload.provider,
    providerUserId: payload.providerUserId,
    email: payload.email,
    emailVerified: payload.emailVerified,
    providerDisplayName: payload.displayName,
    now,
  });

  return {
    user,
    activeProvider: payload.provider,
  };
}

export async function linkIdentityToUser(
  db: D1Database,
  {
    currentUserId,
    payload,
    now,
  }: {
    currentUserId: string;
    payload: NormalizedIdentityPayload;
    now: string;
  },
): Promise<LinkIdentityResult> {
  const currentUser = await requireActiveUser(db, currentUserId);

  if (!currentUser) {
    return {
      ok: false,
      code: "link_session_required",
    };
  }

  const existingUserProviderIdentity = await findIdentityByUserProvider(
    db,
    currentUserId,
    payload.provider,
  );

  if (existingUserProviderIdentity) {
    if (
      existingUserProviderIdentity.provider_user_id === payload.providerUserId
    ) {
      return {
        ok: false,
        code: "identity_already_linked",
      };
    }

    return {
      ok: false,
      code: "provider_already_linked",
    };
  }

  const existingIdentity = await findIdentityByProviderUserId(
    db,
    payload.provider,
    payload.providerUserId,
  );

  if (existingIdentity) {
    return existingIdentity.user_id === currentUserId
      ? {
          ok: false,
          code: "identity_already_linked",
        }
      : {
          ok: false,
          code: "identity_linked_to_other_user",
        };
  }

  await createIdentity(db, {
    userId: currentUserId,
    provider: payload.provider,
    providerUserId: payload.providerUserId,
    email: payload.email,
    emailVerified: payload.emailVerified,
    providerDisplayName: payload.displayName,
    now,
  });

  return {
    ok: true,
    user: currentUser,
    activeProvider: payload.provider,
  };
}

export async function listAccountProviders(db: D1Database, userId: string) {
  const identities = await listIdentitiesByUserId(db, userId);
  const byProvider = new Map(
    identities.map((identity) => [identity.provider, identity]),
  );

  return (["google", "kakao", "naver"] as const).map((provider) => {
    const identity = byProvider.get(provider);

    return {
      provider,
      isLinked: Boolean(identity),
      email: identity?.email ?? null,
      emailVerified:
        identity?.email_verified === null ||
        identity?.email_verified === undefined
          ? null
          : identity.email_verified === 1,
      providerDisplayName: identity?.provider_display_name ?? null,
      lastLoginAt: identity?.last_login_at ?? null,
    };
  });
}

export async function mergeUsers(
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
): Promise<MergeUsersResult> {
  if (sourceUserId === targetUserId) {
    throw new Error("Source and target users must be different.");
  }

  const sourceUser = await findUserById(db, sourceUserId);
  const targetUser = await findUserById(db, targetUserId);

  if (!sourceUser || !targetUser) {
    throw new Error("Both source and target users must exist.");
  }

  const sourceIdentities = await listIdentitiesByUserId(db, sourceUserId);
  const targetIdentities = await listIdentitiesByUserId(db, targetUserId);
  const targetProviders = new Set(
    targetIdentities.map((identity) => identity.provider),
  );
  const skippedIdentityProviders: OAuthProviderId[] = [];
  let movedIdentityCount = 0;

  for (const identity of sourceIdentities) {
    if (targetProviders.has(identity.provider)) {
      skippedIdentityProviders.push(identity.provider);
      await deleteIdentityById(db, identity.id);
      continue;
    }

    await moveIdentityToUser(db, {
      identityId: identity.id,
      targetUserId,
    });
    targetProviders.add(identity.provider);
    movedIdentityCount += 1;
  }

  const reassignedNoteCount = await reassignNotesToUser(db, {
    sourceUserId,
    targetUserId,
  });

  const nextDisplayName =
    targetUser.display_name || sourceUser.display_name || "User";
  const nextPrimaryEmail = targetUser.primary_email ?? sourceUser.primary_email;

  await updateUserProfile(db, {
    userId: targetUserId,
    displayName: nextDisplayName,
    primaryEmail: nextPrimaryEmail,
    now,
  });
  await markUserMerged(db, {
    sourceUserId,
    targetUserId,
    now,
  });

  return {
    mergedUserId: targetUserId,
    sourceUserId,
    targetUserId,
    movedIdentityCount,
    reassignedNoteCount,
    skippedIdentityProviders,
  };
}
