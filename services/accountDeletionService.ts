import { supabase } from "../lib/supabase";

export type AccountDeletionRequestStatus =
  | "requested"
  | "approved"
  | "rejected";

export type AccountDeletionRequestType =
  | "account_deletion"
  | "listing_removal";

export type AccountDeletionRequest = {
  id: string;
  user_id: string;
  email: string | null;
  vendor_id: string | null;
  vendor_name?: string | null;
  reason: string | null;
  status: AccountDeletionRequestStatus;
  request_type: AccountDeletionRequestType;
  created_at: string;
};

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validateStatus(
  status: AccountDeletionRequestStatus
): AccountDeletionRequestStatus {
  if (
    status !== "requested" &&
    status !== "approved" &&
    status !== "rejected"
  ) {
    throw new Error("Invalid deletion request status.");
  }

  return status;
}

export async function createAccountDeletionRequest(input: {
  userId: string;
  email?: string | null;
  vendorId?: string | null;
  reason?: string;
}) {
  const userId = input.userId?.trim();

  if (!userId) {
    throw new Error("A valid user ID is required.");
  }

  const { error } = await supabase.from("account_deletion_requests").insert({
    user_id: userId,
    email: normalizeOptionalText(input.email),
    vendor_id: normalizeOptionalText(input.vendorId),
    reason: normalizeOptionalText(input.reason),
    status: "requested",
    request_type: "account_deletion",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createListingRemovalRequest(input: {
  userId: string;
  email?: string | null;
  vendorId: string;
  reason?: string | null;
}): Promise<void> {
  const userId = input.userId.trim();
  const vendorId = input.vendorId.trim();

  if (!userId) {
    throw new Error("User id is required.");
  }

  if (!vendorId) {
    throw new Error("Vendor id is required.");
  }

  const { error } = await supabase.from("account_deletion_requests").insert({
    user_id: userId,
    email: normalizeOptionalText(input.email),
    vendor_id: vendorId,
    reason: normalizeOptionalText(input.reason),
    status: "requested",
    request_type: "listing_removal",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAllAccountDeletionRequests(): Promise<
  AccountDeletionRequest[]
> {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id,user_id,email,vendor_id,reason,status,request_type,created_at")
    .eq("status", "requested")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const requests = (data ?? []) as AccountDeletionRequest[];

const vendorIds = requests
  .map((request) => request.vendor_id)
  .filter((vendorId): vendorId is string => !!vendorId);

if (vendorIds.length === 0) {
  return requests;
}

const { data: vendors, error: vendorsError } = await supabase
  .from("vendors")
  .select("id,name")
  .in("id", vendorIds);

if (vendorsError) {
  throw new Error(vendorsError.message);
}

const vendorNameMap = new Map(
  (vendors ?? []).map((vendor) => [vendor.id, vendor.name])
);

return requests.map((request) => ({
  ...request,
  vendor_name: request.vendor_id
    ? vendorNameMap.get(request.vendor_id) ?? null
    : null,
}));
}

export async function updateAccountDeletionRequestStatus(input: {
  requestId: string;
  status: AccountDeletionRequestStatus;
}) {
  const requestId = input.requestId?.trim();
  const status = validateStatus(input.status);

  if (!requestId) {
    throw new Error("A valid request ID is required.");
  }

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .update({
      status,
    })
    .eq("id", requestId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("Update failed: no matching deletion request found.");
  }
}

export async function approveListingRemovalRequest(
  requestId: string
): Promise<void> {
  const normalizedRequestId = requestId.trim();

  if (!normalizedRequestId) {
    throw new Error("A valid request ID is required.");
  }

  const { error } = await supabase.rpc(
    "approve_listing_removal_request",
    {
      p_request_id: normalizedRequestId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}