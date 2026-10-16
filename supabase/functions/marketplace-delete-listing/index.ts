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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return respond(
      { error: "Method not allowed" },
      405
    );
  }

  try {
    const authHeader =
      request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return respond(
        { error: "Authentication required" },
        401
      );
    }

    const token = authHeader.substring(7);

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return respond(
        { error: "Server configuration error" },
        500
      );
    }

    // Verify the caller's identity.
    const authClient = createClient(
      supabaseUrl,
      anonKey
    );

    const {
      data: authData,
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !authData.user) {
      return respond(
        { error: "Invalid authentication" },
        401
      );
    }

    const userId = authData.user.id;

    const body = await request
      .json()
      .catch(() => null);

    const listingId = body?.listing_id;

    if (
      typeof listingId !== "string" ||
      !uuidPattern.test(listingId)
    ) {
      return respond(
        { error: "Valid listing_id required" },
        400
      );
    }

    // Service-role access stays on the server.
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Only the owner may delete a private draft.
    const {
      data: listing,
      error: listingError,
    } = await adminClient
      .from("marketplace_listings")
      .select("id, seller_id, status")
      .eq("id", listingId)
      .eq("seller_id", userId)
      .eq("status", "draft")
      .maybeSingle();

    if (listingError) {
      return respond(
        { error: "Unable to verify listing ownership" },
        500
      );
    }

    if (!listing) {
      return respond(
        {
          error:
            "Draft not found or access denied",
        },
        403
      );
    }

    // Find all photographs linked to this draft.
    const {
      data: photos,
      error: photosError,
    } = await adminClient
      .from("marketplace_listing_photos")
      .select("id, storage_path")
      .eq("listing_id", listingId);

    if (photosError) {
      return respond(
        {
          error:
            "Unable to retrieve listing photographs",
        },
        500
      );
    }

    const storagePaths = [
      ...new Set(
        (photos ?? [])
          .map((photo) => photo.storage_path)
          .filter(
            (path): path is string =>
              typeof path === "string" &&
              path.length > 0
          )
      ),
    ];

    // Remove uploaded files before deleting records.
    if (storagePaths.length > 0) {
      const { error: storageError } =
        await adminClient.storage
          .from("marketplace-photos")
          .remove(storagePaths);

      if (storageError) {
        return respond(
          {
            error:
              "Photograph storage deletion failed. " +
              "The draft was not deleted.",
          },
          500
        );
      }
    }

    // Remove photograph database records.
    const { error: photoDeleteError } =
      await adminClient
        .from("marketplace_listing_photos")
        .delete()
        .eq("listing_id", listingId);

    if (photoDeleteError) {
      return respond(
        {
          error:
            "Photograph records could not be removed. " +
            "Please retry.",
        },
        500
      );
    }

    // Delete only the verified seller's draft.
    const {
      data: deletedListing,
      error: deleteError,
    } = await adminClient
      .from("marketplace_listings")
      .delete()
      .eq("id", listingId)
      .eq("seller_id", userId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (deleteError) {
      return respond(
        {
          error:
            "Listing deletion failed. Please retry.",
        },
        500
      );
    }

    if (!deletedListing) {
      return respond(
        {
          error:
            "Draft was not deleted. Its status may have changed.",
        },
        409
      );
    }

    return respond({
      success: true,
      deleted_listing_id: listingId,
    });
  } catch (error) {
    console.error(
      "Marketplace listing deletion error:",
      error
    );

    return respond(
      { error: "Unexpected server error" },
      500
    );
  }
});