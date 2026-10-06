"""
Module 5 — Smart Retrieval System

POST /api/search { user_id, query }
Embeds the query, runs pgvector similarity search, then asks Groq
to write a natural-language answer referencing the matched documents.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.embeddings import get_query_embedding
from services.llm import call_llm_json
from config import supabase
from dependencies import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api", tags=["search"])


class SearchRequest(BaseModel):
    query: str


class MatchedDocument(BaseModel):
    id: str
    title: Optional[str]
    category: Optional[str]
    file_url: Optional[str]
    summary: Optional[str]


class SearchResponse(BaseModel):
    answer: str
    matched_documents: list[MatchedDocument]


ANSWER_SYSTEM_PROMPT = (
    "You are a helpful assistant for a student's digital portfolio. "
    "Given the user's question and matching documents, write a short, natural, "
    "helpful response confirming what was found. Mention document titles. "
    "Return JSON: {\"answer\": \"your response text\", \"doc_ids\": [\"id1\", \"id2\"]}"
)


@router.post("/search", response_model=SearchResponse)
async def smart_search(req: SearchRequest, user_id: str = Depends(get_current_user)):
    """
    Semantic search: embed query → pgvector similarity → Groq answer synthesis.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Embed the query
    query_embedding = get_query_embedding(req.query)

    # 2. pgvector similarity search via Supabase RPC
    results = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "exclude_doc_id": "00000000-0000-0000-0000-000000000000",  # don't exclude any
            "match_count": 10,
            "match_threshold": 0.0,
        },
    ).execute()

    if not results.data:
        return SearchResponse(
            answer="Nothing matching that yet — try uploading more documents!",
            matched_documents=[],
        )

    # 3. Build context for Groq
    docs_context = "\n".join(
        f"- [{doc.get('title', 'Untitled')}] (id: {doc['id']}, category: {doc.get('category', 'N/A')}): {doc.get('summary', 'No summary')}"
        for doc in results.data
    )

    prompt = (
        f"The user asked: \"{req.query}\"\n\n"
        f"Here are the matching documents from their portfolio:\n{docs_context}\n\n"
        f"Write a helpful response and return the list of document IDs in the order you mention them."
    )

    try:
        llm_result = call_llm_json(
            system_prompt=ANSWER_SYSTEM_PROMPT,
            user_prompt=prompt,
        )
        answer = llm_result.get("answer", "Here are your matching documents:")
    except Exception:
        answer = f"Found {len(results.data)} matching documents for \"{req.query}\"."

    matched = [
        MatchedDocument(
            id=doc["id"],
            title=doc.get("title"),
            category=doc.get("category"),
            file_url=doc.get("file_url"),
            summary=doc.get("summary"),
        )
        for doc in results.data
    ]

    return SearchResponse(answer=answer, matched_documents=matched)
