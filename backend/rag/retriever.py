from dotenv import load_dotenv
load_dotenv()
from rag.embeddings import get_chroma_client, get_or_create_collection
from typing import List, Dict, Optional
from groq import Groq
import hashlib
import os

_query_rewrite_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
_query_cache: Dict[str, List[Dict]] = {}


def _get_cache_key(query: str, file_filter: Optional[str]) -> str:
    raw = f"{query.lower().strip()}|{file_filter or 'all'}"
    return hashlib.md5(raw.encode()).hexdigest()


def _generate_query_variations(query: str, n: int = 3) -> List[str]:
    try:
        response = _query_rewrite_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": f"Generate {n} alternate phrasings of the user's question that preserve its meaning but use different wording/keywords. Return ONLY the {n} phrasings, one per line, no numbering, no extra text."
                },
                {"role": "user", "content": query}
            ],
            temperature=0.5,
            max_tokens=200
        )
        variations = [
            line.strip() for line in response.choices[0].message.content.split("\n")
            if line.strip()
        ]
        return variations[:n] if variations else []
    except Exception:
        return []


def retrieve_relevant_chunks(
    query: str,
    n_results: int = 5,
    file_filter: Optional[str] = None,
    use_cache: bool = True,
    use_query_rewriting: bool = True
) -> List[Dict]:
    cache_key = _get_cache_key(query, file_filter)
    if use_cache and cache_key in _query_cache:
        return _query_cache[cache_key]

    client = get_chroma_client()
    collection = get_or_create_collection(client)

    if collection.count() == 0:
        return []

    where_filter = {"source": file_filter} if file_filter else None

    all_queries = [query]
    if use_query_rewriting:
        variations = _generate_query_variations(query, n=3)
        all_queries.extend(variations)

    fetch_count = min(n_results * 3, collection.count())
    seen_chunk_keys = set()
    combined = []

    for q in all_queries:
        query_params = {
            "query_texts": [q],
            "n_results": fetch_count,
            "include": ["documents", "metadatas", "distances"]
        }
        if where_filter:
            query_params["where"] = where_filter

        semantic_results = collection.query(**query_params)

        if not semantic_results["documents"][0]:
            continue

        keyword_scores = _bm25_score(query, semantic_results["documents"][0])

        for i in range(len(semantic_results["documents"][0])):
            source = semantic_results["metadatas"][0][i]["source"]
            chunk_index = semantic_results["metadatas"][0][i]["chunk_index"]
            dedup_key = f"{source}::{chunk_index}"

            if dedup_key in seen_chunk_keys:
                continue
            seen_chunk_keys.add(dedup_key)

            semantic_score = 1 - semantic_results["distances"][0][i]
            hybrid_score = (0.7 * semantic_score) + (0.3 * keyword_scores[i])
            combined.append({
                "text": semantic_results["documents"][0][i],
                "source": source,
                "chunk_index": chunk_index,
                "relevance_score": round(hybrid_score, 4)
            })

    if not combined:
        return []

    reranked = sorted(combined, key=lambda x: x["relevance_score"], reverse=True)
    final_results = reranked[:n_results]

    if use_cache:
        _query_cache[cache_key] = final_results

    return final_results


def _bm25_score(query: str, documents: List[str]) -> List[float]:
    if not documents:
        return []

    query_terms = query.lower().split()
    scores = []

    for doc in documents:
        doc_lower = doc.lower()
        score = sum(doc_lower.count(term) for term in query_terms)
        scores.append(float(score))

    max_score = max(scores) if scores and max(scores) > 0 else 1
    return [s / max_score for s in scores]


def clear_cache():
    global _query_cache
    _query_cache = {}