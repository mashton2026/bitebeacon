import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return respond({ error: "Authentication required" }, 401);
    }

    const token = authHeader.substring(7);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return respond({ error: "Server configuration error" }, 500);
    }

    // Verify the caller's identity using their access token.
    const authClient = createClient(supabaseUrl, anonKey);

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !authData.user) {
      return respond({ error: "Invalid authentication" }, 401);
    }

    const userId = authData.user.id;

    const body = await request.json().catch(() => null);
    const photoId = body?.photo_id;

    if (
      typeof photoId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        photoId
      )
    ) {
      return respond({ error: "Valid photo_id required" }, 400);
    }

    // Privileged access stays exclusively on the server.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Look up the photograph.
    const { data: photo, error: photoError } = await adminClient
      .from("marketplace_listing_photos")
      .select("id, listing_id, storage_path")
      .eq("id", photoId)
      .maybeSingle();

    if (photoError) {
      return respond({ error: "Unable to retrieve photograph" }, 500);
    }

    if (!photo) {
      return respond({ error: "Photograph not found" }, 404);
    }

    // Verify the listing belongs to this seller and remains a draft.
    const { data: listing, error: listingError } = await adminClient
      .from("marketplace_listings")
      .select("id, seller_id, status")
      .eq("id", photo.listing_id)
      .eq("seller_id", userId)
      .eq("status", "draft")
      .maybeSingle();

    if (listingError) {
      return respond({ error: "Unable to verify listing ownership" }, 500);
    }

    if (!listing) {
      return respond({ error: "Photograph not found or access denied" }, 403);
    }

    // Remove the actual photograph from private storage first.
    const { error: storageError } = await adminClient.storage
      .from("marketplace-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      return respond(
        { error: "Storage deletion failed. Photograph was not removed." },
        500
      );
    }

        // Remove the database record after Storage deletion succeeds.
    // A retry can safely repeat Storage removal if the file is already absent.
    const { error: deleteError } = await adminClient
      .from("marketplace_listing_photos")
      .delete()
      .eq("id", photo.id)
      .eq("listing_id", photo.listing_id);

    if (deleteError) {
      return respond(
        {
          error:
            "Photograph storage was cleared, but database cleanup failed. Please retry.",
        },
        500
      );
    }

    return respond({
      success: true,
      deleted_photo_id: photo.id,
    });
  } catch {
    return respond({ error: "Unexpected server error" }, 500);
  }
});