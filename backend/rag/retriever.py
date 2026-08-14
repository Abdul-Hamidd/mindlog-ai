from dotenv import load_dotenv
load_dotenv()
from rag.embeddings import get_chroma_client, get_or_create_collection, model
from sentence_transformers import CrossEncoder
from typing import List, Dict, Optional
from groq import Groq
import hashlib
import os

# ─── Re-Ranker Model ────────────────────────────────────────────
cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# ─── Query Rewriting Client (fast/small model, just for generating variations) ──
_query_rewrite_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─── Query Cache (in-memory) ────────────────────────────────────
_query_cache: Dict[str, List[Dict]] = {}


def _get_cache_key(query: str, file_filter: Optional[str]) -> str:
    """Generate unique cache key for query + filter combination."""
    raw = f"{query.lower().strip()}|{file_filter or 'all'}"
    return hashlib.md5(raw.encode()).hexdigest()


def _generate_query_variations(query: str, n: int = 3) -> List[str]:
    """
    Use a fast LLM call to generate alternate phrasings of the user's query,
    improving recall when the user's wording doesn't match document wording.
    """
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
    """
    Retrieve most relevant chunks using Multi-Query Rewriting + Hybrid Search + Re-Ranking.

    Args:
        query: User's question
        n_results: Number of top chunks to return
        file_filter: Optional filename to filter results (Metadata Filtering)
        use_cache: Whether to use query caching
        use_query_rewriting: Whether to generate alternate phrasings for better recall

    Returns:
        List of dicts with text, source, score
    """

    # ── 1. Query Cache Check ─────────────────────────────────────
    cache_key = _get_cache_key(query, file_filter)
    if use_cache and cache_key in _query_cache:
        return _query_cache[cache_key]

    client = get_chroma_client()
    collection = get_or_create_collection(client)

    if collection.count() == 0:
        return []

    # ── 2. Metadata Filter (optional) ───────────────────────────
    where_filter = {"source": file_filter} if file_filter else None

    # ── 3. Build list of queries to search with (original + variations) ──
    all_queries = [query]
    if use_query_rewriting:
        variations = _generate_query_variations(query, n=3)
        all_queries.extend(variations)

    # ── 4. Semantic Search across all query variations ─────────
    fetch_count = min(n_results * 3, collection.count())
    seen_chunk_keys = set()
    combined = []

    for q in all_queries:
        query_embedding = model.encode([q]).tolist()

        query_params = {
            "query_embeddings": query_embedding,
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

            # Skip if we already picked up this exact chunk from another query variation
            if dedup_key in seen_chunk_keys:
                continue
            seen_chunk_keys.add(dedup_key)

            semantic_score = 1 - semantic_results["distances"][0][i]
            hybrid_score = (0.7 * semantic_score) + (0.3 * keyword_scores[i])
            combined.append({
                "text": semantic_results["documents"][0][i],
                "source": source,
                "chunk_index": chunk_index,
                "hybrid_score": hybrid_score
            })

    if not combined:
        return []

    # ── 5. Re-Ranking with Cross-Encoder (always against the ORIGINAL query) ──
    pairs = [[query, item["text"]] for item in combined]
    rerank_scores = cross_encoder.predict(pairs)

    for i, item in enumerate(combined):
        item["relevance_score"] = round(float(rerank_scores[i]), 4)

    reranked = sorted(combined, key=lambda x: x["relevance_score"], reverse=True)
    final_results = reranked[:n_results]

    # ── 6. Save to Cache ─────────────────────────────────────────
    if use_cache:
        _query_cache[cache_key] = final_results

    return final_results


def _bm25_score(query: str, documents: List[str]) -> List[float]:
    """
    Simple BM25-style keyword scoring.
    Counts query term frequency in each document.
    """
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
    """Clear the query cache."""
    global _query_cache
    _query_cache = {}