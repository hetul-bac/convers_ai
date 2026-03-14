import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  orgId: string | null;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export async function runWithRequestContext<T>(callback: () => Promise<T>) {
  return requestContext.run({ orgId: null }, callback);
}

export function setRequestContextOrgId(orgId: string | null) {
  const store = requestContext.getStore();

  if (store) {
    store.orgId = orgId;
  }
}

export function getRequestContextOrgId() {
  return requestContext.getStore()?.orgId ?? null;
}
