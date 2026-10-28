import { z } from "zod";
export const TelemetrySchema=z.object({
  consent:z.literal(true),
  name:z.enum(["PAGE_LANDING","PAGE_REGISTER","PAGE_WORKSPACE","PAGE_ANALYSIS","PAGE_EDITOR","LCP","INP","CLS","FCP","TTFB"]),
  source:z.enum(["direct","google","linkedin","instagram","facebook","email","other"]),
  device:z.enum(["mobile","tablet","desktop"]),
  value:z.number().finite().min(0).max(600_000).optional(),
}).strict();
