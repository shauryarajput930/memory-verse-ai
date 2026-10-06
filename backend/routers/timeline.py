"""
Module 4 — Digital Journey Timeline

GET /api/timeline/{user_id}
Returns documents grouped by year, ordered chronologically.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from config import supabase
from dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["timeline"])


class DocumentRelationship(BaseModel):
    target_id: str
    target_title: str
    relationship_type: str
    confidence: float


class TimelineItem(BaseModel):
    id: str
    title: Optional[str]
    category: Optional[str]
    event_date: Optional[str]
    summary: Optional[str]
    file_url: Optional[str]
    file_type: Optional[str] = None
    relationships: list[DocumentRelationship] = []


class TimelineYear(BaseModel):
    year: int | str
    items: list[TimelineItem]


class TimelineResponse(BaseModel):
    timeline: list[TimelineYear]


@router.get("/timeline/{path_user_id}", response_model=TimelineResponse)
async def get_timeline(path_user_id: str, user_id: str = Depends(get_current_user)):
    """Return a chronological timeline of a user's documents grouped by year."""

    result = (
        supabase.table("documents")
        .select("id, title, category, event_date, summary, file_url, file_type")
        .eq("user_id", user_id)
        .order("event_date", desc=False)
        .execute()
    )

    if not result.data:
        return TimelineResponse(timeline=[])

    docs = result.data
    doc_ids = [d["id"] for d in docs]
    
    # Create a quick lookup map for titles (since relationships don't store titles)
    title_map = {d["id"]: d.get("title") or "Untitled Document" for d in docs}
    
    # Fetch all relationships where this user's docs are the source
    relationships_by_doc = {doc_id: [] for doc_id in doc_ids}
    if doc_ids:
        rel_result = (
            supabase.table("relationships")
            .select("source_doc_id, target_doc_id, relationship_type, confidence")
            .in_("source_doc_id", doc_ids)
            .execute()
        )
        if rel_result.data:
            for rel in rel_result.data:
                source = rel["source_doc_id"]
                target = rel["target_doc_id"]
                # Only include relationship if target document actually exists in the timeline
                if target in title_map:
                    relationships_by_doc[source].append(
                        DocumentRelationship(
                            target_id=target,
                            target_title=title_map[target],
                            relationship_type=rel["relationship_type"] or "related_project",
                            confidence=rel["confidence"] or 0.0
                        )
                    )

    # Group by year
    year_buckets: dict[int | str, list[dict]] = {}
    for doc in docs:
        # Inject the relationships array into the doc dictionary before creating the model
        doc["relationships"] = [rel.model_dump() for rel in relationships_by_doc[doc["id"]]]
        
        if doc.get("event_date"):
            year = int(doc["event_date"][:4])
        else:
            year = "Undated"

        if year not in year_buckets:
            year_buckets[year] = []
        year_buckets[year].append(doc)

    # Sort years numerically, "Undated" at end
    sorted_years = sorted(
        [y for y in year_buckets if isinstance(y, int)]
    )
    if "Undated" in year_buckets:
        sorted_years.append("Undated")

    timeline = [
        TimelineYear(year=y, items=[TimelineItem(**doc) for doc in year_buckets[y]])
        for y in sorted_years
    ]

    return TimelineResponse(timeline=timeline)
