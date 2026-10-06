"""
Embedding service — uses sentence-transformers all-MiniLM-L6-v2 (384 dimensions).
Runs locally, no API key needed. Fast and lightweight.
"""

from sentence_transformers import SentenceTransformer

_model = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


EMBEDDING_DIM = 384


def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text (document).
    Returns a list of 384 floats.
    """
    text = text[:8000]
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def get_query_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a search query.
    Same model, same function — sentence-transformers handles both.
    """
    text = text[:2000]
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()

