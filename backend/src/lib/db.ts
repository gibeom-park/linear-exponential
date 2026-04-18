import { drizzle } from 'drizzle-orm/d1';

import * as schema from '@linex/shared/schema';

export const createDb = (d1: D1Database) => drizzle(d1, { schema });
export type Db = ReturnType<typeof createDb>;
