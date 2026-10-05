"""
Sanjeevani Multi-Tier Ollama LLM Cascade Client.
Supports Cloud Models (glm-5.3:cloud, deepseek-v4.1-flash:cloud) with automatic
graceful fallback to Local Offline Models (llama3:8b, llama3.2:3b, qwen2.5:7b, gemma3:latest).
"""
import json
import time
import urllib.request
import urllib.error
from typing import Optional, Tuple, List, Set

OLLAMA_BASE_URL = "http://localhost:11434"

# Priority hierarchy as specified by user:
# 1. Cloud models (glm-5.3:cloud, deepseek-v4.1-flash:cloud)
# 2. Local fallback models (llama3:8b, llama3, llama3.2:3b, qwen2.5:7b, gemma3:latest)
DEFAULT_CASCADE_ORDER = [
    "glm-5.3:cloud",
    "deepseek-v4.1-flash:cloud",
    "deepseek-v3.1:671b-cloud",
    "gpt-oss:120b-cloud",
    "llama3:8b",
    "llama3",
    "llama3.2:3b",
    "qwen2.5:7b",
    "gemma3:latest",
    "gemma3:4b",
]

_tags_cache = {"models": set(), "last_checked": 0.0}


def get_available_ollama_models(ttl_sec: float = 30.0) -> Set[str]:
    """Retrieve the set of models registered in the local Ollama daemon."""
    now = time.time()
    if _tags_cache["models"] and (now - _tags_cache["last_checked"] < ttl_sec):
        return _tags_cache["models"]

    try:
        req = urllib.request.Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=1.5) as res:
            if res.status == 200:
                data = json.loads(res.read().decode("utf-8"))
                models = {m.get("name") for m in data.get("models", []) if m.get("name")}
                _tags_cache["models"] = models
                _tags_cache["last_checked"] = now
                return models
    except Exception:
        pass
    return _tags_cache["models"]


def is_ollama_alive(timeout_sec: float = 1.0) -> bool:
    """Check if the local Ollama daemon is reachable."""
    try:
        req = urllib.request.Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=timeout_sec) as res:
            return res.status == 200
    except Exception:
        return False


def query_ollama_cascade(
    prompt: str,
    system_prompt: str = "",
    preferred_model: Optional[str] = None,
    timeout_cloud: float = 3.5,
    timeout_local: float = 25.0,
    timeout_per_model: Optional[float] = None,
    **kwargs,
) -> Tuple[Optional[str], str]:
    """
    Executes an inference query across the model cascade.
    Fast-fails missing cloud models and routes to local models cleanly.
    Returns: (generated_text, model_name_used)
    """
    if timeout_per_model is not None:
        timeout_local = timeout_per_model

    if not is_ollama_alive():
        return None, "ollama_offline"

    installed = get_available_ollama_models()

    # Determine cascade order:
    # 1. Cloud models (always try first if user specifies them or by default)
    # 2. Local installed models
    cloud_candidates = [
        "glm-5.3:cloud",
        "deepseek-v4.1-flash:cloud",
        "deepseek-v3.1:671b-cloud",
        "gpt-oss:120b-cloud",
    ]
    local_candidates = [
        "llama3:8b",
        "llama3",
        "llama3.2:3b",
        "qwen2.5:7b",
        "gemma3:latest",
        "gemma3:4b",
    ]

    # Prioritize models that are actually installed and registered in Ollama
    ordered_cloud = [m for m in cloud_candidates if m in installed] + [m for m in cloud_candidates if m not in installed]
    ordered_local = [m for m in local_candidates if m in installed] + [m for m in local_candidates if m not in installed]

    cascade: List[str] = []
    if preferred_model:
        cascade.append(preferred_model)
    cascade.extend([m for m in ordered_cloud if m not in cascade])
    cascade.extend([m for m in ordered_local if m not in cascade])

    full_prompt = f"{system_prompt}\n\n{prompt}".strip() if system_prompt else prompt

    for model_name in cascade:
        is_cloud = ":cloud" in model_name
        # If cloud and definitely not installed in local tags, allow a brief attempt (3.5s) in case Ollama pulls/routes it
        timeout = timeout_cloud if is_cloud else timeout_local

        payload = {
            "model": model_name,
            "prompt": full_prompt,
            "stream": False,
        }
        try:
            req = urllib.request.Request(
                f"{OLLAMA_BASE_URL}/api/generate",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    answer = data.get("response", "").strip()
                    if answer:
                        return answer, model_name
        except Exception:
            # Model not found / network error / timeout -> seamlessly progress to next tier
            continue

    return None, "fallback_exhausted"
