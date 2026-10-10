"""
Redis Caching Service for MemoryVerse-AI

Provides high-performance caching for RAG search / vector queries with:
- Configurable TTL (default 1 hour / 3600 seconds)
- Deterministic user-scoped cache keys
- Automatic JSON serialization/deserialization
- Circuit-breaker style graceful degradation when Redis is offline or unreachable
- User-scoped cache invalidation when documents change
"""

import json
import logging
import hashlib
import time
from typing import Any, Optional
import redis
from redis.exceptions import RedisError
from config import REDIS_URL, REDIS_CACHE_TTL

logger = logging.getLogger("memoryverse.cache")


class RedisCacheService:
    def __init__(self, redis_url: str = REDIS_URL, default_ttl: int = REDIS_CACHE_TTL):
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self._client: Optional[redis.Redis] = None
        self._circuit_open_until: float = 0.0
        self._backoff_seconds: float = 30.0
        self._warned_offline: bool = False

    def _get_client(self) -> Optional[redis.Redis]:
        """
        Lazily gets or initializes the Redis client.
        If recent connection attempts failed, respects a backoff window to eliminate request latency.
        """
        now = time.time()
        if now < self._circuit_open_until:
            return None

        if self._client is None:
            try:
                # Connection pool with strict timeouts for resilience
                pool = redis.ConnectionPool.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5,
                    max_connections=20,
                    retry_on_timeout=False,
                )
                self._client = redis.Redis(connection_pool=pool)
            except Exception as e:
                self._handle_failure(f"Failed to create Redis connection pool: {e}")
                return None

        return self._client

    def _handle_failure(self, error: Any) -> None:
        """Mark circuit as open and log warning once during failure window."""
        self._circuit_open_until = time.time() + self._backoff_seconds
        if not self._warned_offline:
            logger.warning(
                "Redis is unavailable (%s). Degrading gracefully to database/RAG query directly. Next retry in %ds.",
                error,
                int(self._backoff_seconds),
            )
            self._warned_offline = True

    def _handle_success(self) -> None:
        """Reset warning and backoff upon successful operation."""
        if self._warned_offline:
            logger.info("Redis connection restored. Resuming caching operations.")
            self._warned_offline = False
        self._circuit_open_until = 0.0

    def generate_search_cache_key(self, user_id: str, query: str) -> str:
        """
        Generates a deterministic cache key for RAG search.
        Normalizes whitespace and casing, and hashes to prevent invalid key characters.
        """
        normalized_query = " ".join(query.strip().lower().split())
        query_hash = hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()[:24]
        return f"rag:search:{user_id}:{query_hash}"

    def get_json(self, key: str) -> Optional[Any]:
        """
        Retrieve and deserialize JSON data from Redis.
        Returns None on cache miss or if Redis is unreachable.
        """
        client = self._get_client()
        if client is None:
            return None

        try:
            val = client.get(key)
            self._handle_success()
            if val is None:
                return None
            return json.loads(val)
        except (RedisError, json.JSONDecodeError, Exception) as e:
            self._handle_failure(e)
            return None

    def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Serialize and store JSON data in Redis with TTL (default 1 hour = 3600s).
        Returns False on failure without raising exceptions.
        """
        client = self._get_client()
        if client is None:
            return False

        effective_ttl = ttl if ttl is not None else self.default_ttl
        try:
            serialized = json.dumps(value, default=str)
            client.set(key, serialized, ex=effective_ttl)
            self._handle_success()
            return True
        except (RedisError, TypeError, Exception) as e:
            self._handle_failure(e)
            return False

    def delete(self, key: str) -> bool:
        """Delete a single key from Redis."""
        client = self._get_client()
        if client is None:
            return False

        try:
            client.delete(key)
            self._handle_success()
            return True
        except (RedisError, Exception) as e:
            self._handle_failure(e)
            return False

    def invalidate_user_search_cache(self, user_id: str) -> int:
        """
        Invalidates all cached search queries for a specific user.
        Called when documents are uploaded, edited, or deleted.
        """
        client = self._get_client()
        if client is None:
            return 0

        pattern = f"rag:search:{user_id}:*"
        deleted_count = 0
        try:
            # Use SCAN instead of KEYS to avoid blocking Redis in production
            cursor = 0
            while True:
                cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    deleted_count += client.delete(*keys)
                if cursor == 0:
                    break
            self._handle_success()
            if deleted_count > 0:
                logger.info("Invalidated %d cached search queries for user %s", deleted_count, user_id)
            return deleted_count
        except (RedisError, Exception) as e:
            self._handle_failure(e)
            return 0

    def is_healthy(self) -> bool:
        """Check if Redis connection is currently operational."""
        client = self._get_client()
        if client is None:
            return False
        try:
            return bool(client.ping())
        except Exception:
            return False


# Global singleton instance
cache_service = RedisCacheService()
