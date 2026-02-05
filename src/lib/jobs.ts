import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function enqueueJob(userId: string, type: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("jobs").insert({
    user_id: userId,
    type,
    payload,
    status: "queued"
  });

  if (error) {
    throw new Error(error.message);
  }
}
