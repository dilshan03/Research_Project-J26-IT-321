"""
Child-Friendly Sinhala Dialogue Engine.
Supports:
1. SinLLaMA via Ollama (http://localhost:11434) or Hugging Face Inference API.
2. Google Gemini with few-shot child-pedagogy prompts.
3. Culturally grounded, warm fallback templates for Gaja the Elephant companion.
"""
import os
from typing import Optional
import httpx


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
SINLLAMA_MODEL = os.getenv("SINLLAMA_MODEL", "sinllama")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_SINLLAMA_URL = os.getenv(
    "HUGGINGFACE_SINLLAMA_URL",
    "https://api-inference.huggingface.co/models/Sinhala-NLP/sinllama"
)
DIALOGUE_PROVIDER = os.getenv("DIALOGUE_PROVIDER", "gemini").lower()


CHILD_FRIENDLY_SYSTEM_PROMPT = """
ඔබ ශ්‍රී ලංකාවේ ප්‍රාථමික පාසල් (ශ්‍රේණි 1-4) දරුවන් සඳහා සහ ADHD සහිත දරුවන් වෙනුවෙන් කටයුතු කරන ආදරණීය "ගජා" (Gaja) අලි පැටියාගේ හඬයි.
ඔබේ කතාබහ:
1. ඉතා ආදරණීය, සරල සහ මිත්‍රශීලී විය යුතුය ("ළමා බස / කතා බහ").
2. දැඩි විභාග ප්‍රශ්න ස්වරූපයෙන් බැහැර වන්න ("ගණනය කර නිවැරදි පිළිතුර තෝරන්න" වෙනුවට "යාළුවේ, අපි එකට එකතු කරමුද?").
3. කෙටි වාක්‍ය (වචන 4-8), දිරිගන්වන වදන් ("නියමයි!", "කමක් නෑ, නැවත බලමු!") භාවිතා කරන්න.
4. දරුවාට ක්ලමථයක් ඇති නොවන සේ සෙමින් සහ ප්‍රීතියෙන් ඉදිරිපත් කරන්න.
"""


class SinLLaMAProvider:
    """Connects to local Ollama or remote Hugging Face endpoint running SinLLaMA."""

    @classmethod
    async def is_ollama_available(cls) -> bool:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    async def generate_child_dialogue_ollama(cls, context_text: str) -> Optional[str]:
        try:
            prompt = f"{CHILD_FRIENDLY_SYSTEM_PROMPT}\n\nප්‍රශ්නය හෝ ක්‍රියාකාරකම: {context_text}\nගජාගේ මිත්‍රශීලී ළමා ආමන්ත්‍රණය:"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": SINLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.7, "max_tokens": 120},
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
        except Exception as e:
            print(f"[SinLLaMAProvider:Ollama] Note ({e}).")
        return None

    @classmethod
    async def generate_child_dialogue_hf(cls, context_text: str) -> Optional[str]:
        if not HUGGINGFACE_API_KEY:
            return None
        try:
            prompt = f"{CHILD_FRIENDLY_SYSTEM_PROMPT}\n\nප්‍රශ්නය: {context_text}\nගජා:"
            headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    HUGGINGFACE_SINLLAMA_URL,
                    headers=headers,
                    json={"inputs": prompt, "parameters": {"max_new_tokens": 100, "temperature": 0.7}},
                )
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data[0].get("generated_text", "").replace(prompt, "").strip()
        except Exception as e:
            print(f"[SinLLaMAProvider:HuggingFace] Note ({e}).")
        return None
