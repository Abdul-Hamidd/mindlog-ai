import chromadb
from chromadb.utils import embedding_functions
from typing import List

CHROMA_PATH = "chroma_db"

# Lightweight ONNX-based embedding function bundled with ChromaDB itself.
# Uses the same all-MiniLM-L6-v2 model as before, but without the heavy
# torch/sentence-transformers dependency — keeps RAM usage low enough
# for small free-tier hosting containers.
embedding_fn = embedding_functions.ONNXMiniLM_L6_V2()


def get_chroma_client():
    return chromadb.PersistentClient(path=CHROMA_PATH)


def get_or_create_collection(client, collection_name: str = "documents"):
    return client.get_or_create_collection(
        name=collection_name,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )


def embed_and_store(chunks: List[str], file_name: str):
    """Store chunks in ChromaDB — embeddings generated automatically by the collection."""
    client = get_chroma_client()
    collection = get_or_create_collection(client)

    ids = [f"{file_name}_chunk_{i}" for i in range(len(chunks))]

    collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=[{"source": file_name, "chunk_index": i} for i in range(len(chunks))]
    )

    return len(chunks)


def get_collection_count():
    try:
        client = get_chroma_client()
        collection = get_or_create_collection(client)
        return collection.count()
    except Exception:
        return 0