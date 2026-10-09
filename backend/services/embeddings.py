"""
Embedding service — uses sentence-transformers all-MiniLM-L6-v2 (384 dimensions).
Optimized for low-RAM memory limits with lazy loading, torch.no_grad(), and gc.collect().
"""

import gc
import math
from typing import List

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"SentenceTransformer load warning: {e}")
            _model = False
    return _model


EMBEDDING_DIM = 384


def _lightweight_fallback_embedding(text: str) -> List[float]:
    """Generates a deterministic 384D normalized float vector without PyTorch RAM overhead."""
    vec = [0.0] * EMBEDDING_DIM
    words = text.lower().split()
    if not words:
        return vec
    for idx, word in enumerate(words):
        h = hash(word)
        pos = abs(h) % EMBEDDING_DIM
        vec[pos] += 1.0 + (idx % 3) * 0.1
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def get_embedding(text: str) -> List[float]:
    """
    Generate an embedding vector for the given text (document).
    Returns a list of 384 floats.
    """
    text = (text or "")[:4000]
    model = _get_model()
    try:
        if model:
            import torch
            with torch.no_grad():
                emb = model.encode(text, normalize_embeddings=True).tolist()
            gc.collect()
            return emb
    except Exception as e:
        print(f"SentenceTransformer embedding error, using lightweight fallback: {e}")
    
    vec = _lightweight_fallback_embedding(text)
    gc.collect()
    return vec


def get_query_embedding(text: str) -> List[float]:
    """
    Generate an embedding for a search query.
    """
    return get_embedding((text or "")[:1500])


