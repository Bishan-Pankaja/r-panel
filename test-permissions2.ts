import { dbUrl } from "@dokploy/server/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resolvePermissions } from "@dokploy/server/services/permission";

const pg = postgres(dbUrl, { max: 1 });
const db = drizzle(pg);

const test = async () => {
    // we need to simulate a context
    try {
        const perms = await resolvePermissions({
            user: { id: "lSHcYK2PjAvEsVc46GCmG65mPv2SQDzt" },
            session: { activeOrganizationId: "-mxb4U3X7TT4bc1wC6xQc" }
        });
        console.log("Permissions:", JSON.stringify(perms, null, 2));
    } catch(e) {
        console.log("Error:", e);
    }
    process.exit(0);
}
test();
