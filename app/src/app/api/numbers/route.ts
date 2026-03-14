import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { findCountryByCode, lookupPhoneNumber, provisionPhoneNumber } from "@/lib/phoneLookup";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type ProvisionNumberRequest = {
  country_code?: string;
};

export const GET = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("phone_numbers")
    .select("id, number, country_code, carrier, is_verified, is_active, created_at")
    .eq("org_id", authorization.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  return {
    orgId: authorization.orgId,
    response: NextResponse.json(
      (data ?? []).map((row) => {
        const lookup = lookupPhoneNumber(row.number);

        return {
          ...row,
          country: lookup.country,
          flag: lookup.flag,
        };
      }),
    ),
  };
});

export const POST = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = (await request.json()) as ProvisionNumberRequest;
  const countryCode = payload.country_code?.trim().toUpperCase() ?? "";

  if (!countryCode) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "country_code is required." },
        { status: 400 },
      ),
    };
  }

  const country = findCountryByCode(countryCode);
  const provisioned = provisionPhoneNumber(countryCode);

  if (!country || !provisioned) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "Unsupported country_code." },
        { status: 400 },
      ),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("phone_numbers")
    .insert({
      id: randomUUID(),
      org_id: authorization.orgId,
      number: provisioned.number,
      country_code: country.isoCode,
      carrier: provisioned.carrier,
      is_verified: false,
      is_active: true,
    })
    .select("id, number, country_code, carrier, is_verified, is_active, created_at")
    .single();

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  return {
    orgId: authorization.orgId,
    response: NextResponse.json({
      ...data,
      country: country.country,
      flag: country.flag,
    }),
  };
});
