import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Body = { file_id: string; job_id?: string };

const DUMMY_QUESTIONS = [
  { question: "What is the capital of Japan?", options: ["Paris", "Berlin", "Kyoto", "Tokyo"], answer_index: 3 },
  { question: "What is 4 + 4?", options: ["4", "42", "8", "1"], answer_index: 2 },
  { question: "Which data structure uses FIFO?", options: ["stack", "queue", "tree", "graph"], answer_index: 1 },
];

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const { file_id, job_id }: Body = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    let jobId = job_id;

    // 1) If no job_id provided, create one
    if (!jobId) {
      const jobRes = await fetch(`${supabaseUrl}/rest/v1/jobs`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=representation", // 👈 force Supabase to return the inserted row
        },
        body: JSON.stringify({ file_id, status: "queued" }),
      });

      if (!jobRes.ok) {
        const text = await jobRes.text();
        return new Response(
          JSON.stringify({ ok: false, error: text || "Failed to create job" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await jobRes.json().catch(() => []);
      if (!data || !data.length) {
        return new Response(
          JSON.stringify({ ok: false, error: "No job created" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const [job] = data;
      jobId = job.id;
    }

    // 2) Mark job as processing
    await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "processing" }),
    });

    // 3) Insert dummy MCQs
    for (const q of DUMMY_QUESTIONS) {
      await fetch(`${supabaseUrl}/rest/v1/mcqs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file_id,
          question: q.question,
          options: q.options,
          answer_index: q.answer_index,
        }),
      });
    }

    // 4) Mark job as done
    await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${jobId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "done" }),
    });

    // ✅ Always return JSON to client
    return new Response(
      JSON.stringify({ ok: true, job_id: jobId }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
