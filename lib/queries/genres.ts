import { createServerClient } from "@/lib/supabase/server";
import type { Genre } from "@/types/database";

/**
 * Fetches all genres, ordered alphabetically by name.
 * Used by the catalog sidebar to render genre filter links.
 *
 * Pattern: Facade — callers never touch the Supabase client directly.
 */
export async function getGenres(): Promise<Genre[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("genres")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`getGenres query failed: ${error.message}`);
  }

  return (data ?? []) as Genre[];
}
