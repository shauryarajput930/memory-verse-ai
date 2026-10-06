"""
Embedding service — uses sentence-transformers all-MiniLM-L6-v2 (384 dimensions).
Runs locally, no API key needed. Fast and lightweight.
"""

from sentence_transformers import SentenceTransformer

# Load model once at import time (~80MB download on first run)
_model = SentenceTransformer("all-MiniLM-L6-v2")

EMBEDDING_DIM = 384


def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text (document).
    Returns a list of 384 floats.
    """
    text = text[:8000]
    embedding = _model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def get_query_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a search query.
    Same model, same function — sentence-transformers handles both.
    """
    text = text[:2000]
    embedding = _model.encode(text, normalize_embeddings=True)
    return embedding.tolist()
