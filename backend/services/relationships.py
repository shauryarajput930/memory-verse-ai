"""
Module 3 — Relationship Engine

Finds and labels semantic connections between a user's documents using
pgvector cosine similarity + Groq LLM verification.
"""

from services.llm import call_llm_json
from config import supabase

RELATIONSHIP_PROMPT_TEMPLATE = (
    "Document A (category: {cat_a}): {summary_a}\n"
    "Document B (category: {cat_b}): {summary_b}\n\n"
    "Does Document A meaningfully connect to Document B in a student's academic or professional growth journey? "
    "Respond ONLY in JSON:\n"
    '{{"related": true/false, "relationship_type": "one of [cert_to_skill, skill_to_project, project_to_internship, '
    'internship_to_career_path, related_project, supporting_evidence]", "confidence": 0.0-1.0, "reason": "one sentence"}}'
)

SYSTEM_PROMPT = (
    "You are a knowledge-graph relationship detector for a student portfolio system. "
    "Determine if two documents are meaningfully related in a student's growth journey. "
    "Only output valid JSON. No markdown, no explanation."
)


def find_related_documents(doc_id: str, user_id: str, top_k: int = 5) -> list[dict]:
    """
    Find the top_k most similar documents to doc_id using pgvector,
    then verify each pair with Groq.
    Returns list of verified relationships.
    """
    # 1. Fetch the source document
    source = (
        supabase.table("documents")
        .select("id, category, summary, embedding")
        .eq("id", doc_id)
        .single()
        .execute()
    )
    if not source.data or not source.data.get("embedding"):
        return []

    src = source.data

    # 2. Use Supabase RPC to run pgvector cosine similarity search
    results = supabase.rpc(
        "match_documents",
        {
            "query_embedding": src["embedding"],
            "match_user_id": user_id,
            "exclude_doc_id": doc_id,
            "match_count": 5,
            "match_threshold": 0.45,
        },
    ).execute()

    if not results.data:
        return []

    # 3. Clear existing relationships for this source document to avoid duplicates on retry
    supabase.table("relationships").delete().eq("source_doc_id", doc_id).execute()

    # 4. For each candidate, verify relationship with Groq
    verified = []
    for candidate in results.data:
        try:
            prompt = RELATIONSHIP_PROMPT_TEMPLATE.format(
                cat_a=src.get("category", "Unknown"),
                summary_a=src.get("summary", "No summary"),
                cat_b=candidate.get("category", "Unknown"),
                summary_b=candidate.get("summary", "No summary"),
            )

            result = call_llm_json(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=prompt,
            )

            if result.get("related") and result.get("confidence", 0) > 0.6:
                rel_row = {
                    "source_doc_id": doc_id,
                    "target_doc_id": candidate["id"],
                    "relationship_type": result.get("relationship_type", "supporting_evidence"),
                    "confidence": result.get("confidence", 0.0),
                }
                supabase.table("relationships").insert(rel_row).execute()
                verified.append({**rel_row, "reason": result.get("reason", "")})

        except Exception as e:
            print(f"Relationship check failed for {doc_id} <-> {candidate['id']}: {e}")
            continue

    return verified


def build_all_relationships(user_id: str) -> int:
    """
    Run relationship discovery for ALL documents of a user.
    Returns total number of new relationships found.
    """
    docs = (
        supabase.table("documents")
        .select("id")
        .eq("user_id", user_id)
        .not_.is_("embedding", "null")
        .execute()
    )

    if not docs.data:
        return 0

    total = 0
    for doc in docs.data:
        relations = find_related_documents(doc["id"], user_id)
        total += len(relations)

    return total
