import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "./db";

export const USER_COOKIE = "pf_uid";

/**
 * Anonymous per-browser identity until real sign-in is added.
 * The cookie is issued by src/proxy.ts, so it is present on every request.
 */
export async function getUserId(): Promise<string> {
  // DB access must happen at request time, not during prerendering.
  await connection();
  const id = (await cookies()).get(USER_COOKIE)?.value;
  if (!id) throw new Error("Missing user cookie");
  await db.user.upsert({ where: { id }, create: { id }, update: {} });
  return id;
}
