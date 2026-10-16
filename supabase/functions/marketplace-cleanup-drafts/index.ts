import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const PHOTO_BUCKET = "marketplace-photos";
const BATCH_LIMIT = 20;

// Enable only after end-to-end deletion and recovery testing.
const CLEANUP_ENABLED = true;

type Draft = {
  id: string;
  title: string | null;
  draft_expires_at: string;
  cleanup_started_at: string | null;
};

type Photo = {
  id: string;
  storage_path: string;
};

type Result = Record<string, unknown>;

function respond(body: Result, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return respond({ error: "Server configuration missing" }, 500);
  }

  const authorization = request.headers.get("Authorization");

  if (authorization !== `Bearer ${serviceRoleKey}`) {
    return respond({ error: "Unauthorized" }, 401);
  }

  let body: { mode?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const mode = body?.mode === "cleanup" ? "cleanup" : "dry-run";

  if (mode === "cleanup" && !CLEANUP_ENABLED) {
    return respond(
      {
        error: "Cleanup is not enabled yet",
        mode,
        deleted_listings: 0,
        deleted_photos: 0,
      },
      409,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const checkedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("id, title, draft_expires_at, cleanup_started_at")
      .eq("status", "draft")
      .not("draft_expires_at", "is", null)
      .lte("draft_expires_at", checkedAt)
      .order("draft_expires_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) {
      console.error("Expired draft lookup failed:", error.message);
      return respond({ error: "Unable to inspect expired drafts" }, 500);
    }

    const drafts = (data ?? []) as Draft[];
    const results: Result[] = [];

    let deletedListings = 0;
    let deletedPhotos = 0;

    for (const draft of drafts) {
      if (mode === "dry-run") {
        const { count, error: countError } = await supabase
          .from("marketplace_listing_photos")
          .select("id", { count: "exact", head: true })
          .eq("listing_id", draft.id);

        results.push({
          id: draft.id,
          title: draft.title,
          status: countError ? "photo_count_error" : "preview",
          photo_count: countError ? null : count ?? 0,
          draft_expires_at: draft.draft_expires_at,
          cleanup_started_at: draft.cleanup_started_at,
          eligible_for_claim: draft.cleanup_started_at === null,
        });

        continue;
      }

      const { data: claimedId, error: claimError } = await supabase.rpc(
        "marketplace_claim_expired_draft",
        { p_listing_id: draft.id },
      );

      if (claimError || claimedId !== draft.id) {
        results.push({
          id: draft.id,
          status: "claim_skipped",
        });

        continue;
      }

      const { data: claim, error: claimReadError } = await supabase
        .from("marketplace_listings")
        .select("cleanup_started_at")
        .eq("id", draft.id)
        .eq("status", "draft")
        .single();

      if (claimReadError || !claim?.cleanup_started_at) {
        results.push({
          id: draft.id,
          status: "claim_verification_failed",
        });

        continue;
      }

      const claimedAt: string = claim.cleanup_started_at;

      const { data: photoData, error: photoReadError } = await supabase
        .from("marketplace_listing_photos")
        .select("id, storage_path")
        .eq("listing_id", draft.id)
        .order("display_order", { ascending: true });

      if (photoReadError) {
        results.push({
          id: draft.id,
          status: "photo_lookup_failed",
        });

        continue;
      }

      const photos = (photoData ?? []) as Photo[];

      let removed = 0;
      let failed = false;

      for (const photo of photos) {
        const { data: current, error: currentError } = await supabase
          .from("marketplace_listings")
          .select("cleanup_started_at")
          .eq("id", draft.id)
          .eq("status", "draft")
          .eq("cleanup_started_at", claimedAt)
          .maybeSingle();

        if (currentError || !current) {
          failed = true;
          break;
        }

        const { error: storageError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([photo.storage_path]);

        if (storageError) {
          console.error(
            "Storage removal failed:",
            draft.id,
            storageError.message,
          );

          failed = true;
          break;
        }

        const { error: recordError } = await supabase
          .from("marketplace_listing_photos")
          .delete()
          .eq("listing_id", draft.id)
          .eq("id", photo.id);

        if (recordError) {
          console.error(
            "Photo record removal failed:",
            draft.id,
            recordError.message,
          );

          failed = true;
          break;
        }

        removed++;
      }

      deletedPhotos += removed;

      if (failed) {
        results.push({
          id: draft.id,
          status: "incomplete_retry_required",
          removed_photos: removed,
        });

        continue;
      }

      const { data: finalised, error: finaliseError } = await supabase.rpc(
        "marketplace_finalize_draft_cleanup",
        {
          p_listing_id: draft.id,
          p_claimed_at: claimedAt,
        },
      );

      if (finaliseError || finalised !== true) {
        results.push({
          id: draft.id,
          status: "finalisation_failed",
          removed_photos: removed,
        });

        continue;
      }

      deletedListings++;

      results.push({
        id: draft.id,
        status: "deleted",
        removed_photos: removed,
      });
    }

    return respond({
      success: true,
      mode,
      checked_at: checkedAt,
      inspected_count: drafts.length,
      deleted_listings: deletedListings,
      deleted_photos: deletedPhotos,
      results,
    });
  } catch (error) {
    console.error("Marketplace cleanup failed:", error);

    return respond(
      { error: "Internal server error" },
      500,
    );
  }
});