import { handleDealerLead, type DealerLeadEnv } from '../_lib/handle-dealer-lead';

/** /api/dealer-lead — the whole pipeline lives in ../_lib/handle-dealer-lead.ts. */
export function onRequest({
  request,
  env,
}: {
  request: Request;
  env: DealerLeadEnv;
}): Promise<Response> {
  return handleDealerLead(request, env);
}
