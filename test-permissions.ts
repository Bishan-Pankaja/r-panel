import { dbUrl } from "@dokploy/server/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const pg = postgres(dbUrl, { max: 1 });
const db = drizzle(pg);

const test = async () => {
    // print member table
    console.log("MEMBER:");
    console.log(await db.execute(postgres('SELECT * FROM member;')));
    process.exit(0);
}
test();
