"""
Groq LLM wrapper — provides a single function for structured JSON extraction.
Uses Groq's ultra-fast inference with llama-3.3-70b-versatile.
"""

import json
import re
from groq import Groq
from config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)

PRIMARY_MODEL = "qwen/qwen3.8-27b"
FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]


def _strip_fences(text: str) -> str:
    """Remove markdown code fences that LLMs sometimes wrap around JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def call_llm_json(system_prompt: str, user_prompt: str, retries: int = 2) -> dict:
    """
    Call Groq and parse the response as JSON.
    Tries primary model first, with fallbacks if model not found or fails.
    """
    models_to_try = [PRIMARY_MODEL] + FALLBACK_MODELS

    for model in models_to_try:
        for attempt in range(retries):
            prompt = user_prompt
            if attempt > 0:
                prompt += "\n\nIMPORTANT: Your previous response was not valid JSON. Reply ONLY with a raw JSON object. No markdown, no explanation."

            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=1024,
                )

                raw = _strip_fences(response.choices[0].message.content or "")
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    if attempt == retries - 1:
                        print(f"Groq ({model}) returned non-JSON: {raw[:200]}")
            except Exception as e:
                print(f"Groq API error on model {model} (attempt {attempt+1}): {e}")
                break # Try next model if model endpoint errors out

    return {}

