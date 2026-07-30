"""RAG service for retrieving Smartnet Magna internal solutions."""

import os
import hashlib
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader

from app.core.config import settings


logger = logging.getLogger(__name__)


class RagService:
    """RAG service for internal Smartnet Magna document retrieval."""

    def __init__(self):
        self.embeddings = None
        self.vectorstore = None
        self.chroma_persist_dir = os.path.join(
            os.path.dirname(__file__), "../../data/chroma_db"
        )
        self.model_name = "BAAI/bge-m3"
        os.makedirs(self.chroma_persist_dir, exist_ok=True)
        
        # Load company profile on initialization
        self._load_company_profile()

    def _get_embeddings(self):
        """Initialize embeddings model using local sentence-transformers."""
        if self.embeddings is None:
            self.embeddings = HuggingFaceEmbeddings(
                model_name=self.model_name,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True},
            )
        return self.embeddings

    def _get_vectorstore(self) -> Chroma:
        """Initialize or load Chroma vector store."""
        if self.vectorstore is None:
            self.vectorstore = Chroma(
                persist_directory=self.chroma_persist_dir,
                embedding_function=self._get_embeddings(),
            )
        return self.vectorstore

    def load_document(self, file_path: str) -> List[Dict[str, Any]]:
        """Load a document (PDF, text, markdown), split, embed, and store in vector DB.
        
        Returns list of chunk metadata.
        """
        # Determine loader based on extension
        if file_path.lower().endswith('.pdf'):
            from langchain_community.document_loaders import PyPDFLoader
            loader = PyPDFLoader(file_path)
        elif file_path.lower().endswith('.txt'):
            loader = TextLoader(file_path, encoding='utf-8')
        elif file_path.lower().endswith('.md'):
            loader = TextLoader(file_path, encoding='utf-8')
        else:
            raise ValueError(f"Unsupported file format: {file_path}")
        
        documents = loader.load()
        
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        splits = text_splitter.split_documents(documents)
        
        # Add metadata
        doc_hash = hashlib.md5(file_path.encode()).hexdigest()[:8]
        for i, split in enumerate(splits):
            split.metadata.update({
                "source": file_path,
                "doc_id": doc_hash,
                "chunk_id": i,
                "loaded_at": datetime.now().isoformat(),
                "type": "company_profile",
            })
        
        # Add to vectorstore
        vectorstore = self._get_vectorstore()
        vectorstore.add_documents(splits)
        
        return [
            {
                "chunk_id": i,
                "page": split.metadata.get("page", 0) + 1,
                "text_preview": split.page_content[:200] + "...",
            }
            for i, split in enumerate(splits)
        ]

    def _load_company_profile(self):
        """Load Smartnet Magna company profile into vector store if empty."""
        try:
            vectorstore = self._get_vectorstore()
            # Check if vectorstore already has documents
            if vectorstore._collection.count() == 0:
                # Try to load markdown file
                md_path = os.path.join(
                    os.path.dirname(__file__), "../../data/smartnet_company_profile.md"
                )
                if os.path.exists(md_path):
                    self.load_document(md_path)
                    logger.info(f"Loaded company profile from {md_path}")
                else:
                    # Fallback to text file
                    txt_path = os.path.join(
                        os.path.dirname(__file__), "../../data/smartnet_company_profile.txt"
                    )
                    if os.path.exists(txt_path):
                        self.load_document(txt_path)
                        logger.info(f"Loaded company profile from {txt_path}")
                    else:
                        logger.warning("No company profile file found.")
        except Exception as e:
            logger.error(f"Failed to load company profile: {e}")

    def query_solutions(
        self, 
        query: str, 
        k: int = 5,
        industry_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant Smartnet Magna solutions based on query.
        
        Args:
            query: Search query (e.g., "cloud migration security compliance")
            k: Number of results to return
            industry_filter: Optional industry filter
        
        Returns:
            List of dicts with solution content and metadata
        """
        vectorstore = self._get_vectorstore()
        
        # If vectorstore empty, return fallback solutions
        if vectorstore._collection.count() == 0:
            return self._get_fallback_solutions()
        
        # Search with metadata filter
        filter_dict = {}
        if industry_filter:
            filter_dict["industry"] = industry_filter
        
        results = vectorstore.similarity_search(
            query=query,
            k=k,
            filter=filter_dict if filter_dict else None,
        )
        
        return [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", 0),
                "confidence": "high" if i == 0 else "medium",
            }
            for i, doc in enumerate(results)
        ]

    def _get_fallback_solutions(self) -> List[Dict[str, Any]]:
        """Return fallback solutions when vector DB is empty."""
        return [
            {
                "content": "Smartnet Magna offers comprehensive Google Cloud migration services with security compliance (SOC2, ISO27001) and cost optimization.",
                "source": "Company Profile v2.3",
                "page": 5,
                "confidence": "fallback",
            },
            {
                "content": "Magna AI Solutions include predictive analytics for infrastructure scaling, automated document intelligence, and cybersecurity threat detection.",
                "source": "Company Profile v2.3",
                "page": 8,
                "confidence": "fallback",
            },
            {
                "content": "Our cybersecurity suite includes zero‑trust network access (ZTNA), endpoint detection and response (EDR), and managed security operations center (SOC).",
                "source": "Company Profile v2.3",
                "page": 12,
                "confidence": "fallback",
            },
        ]

    def get_solution_summary(self, query: str) -> str:
        """Generate a concise summary of relevant Smartnet solutions."""
        solutions = self.query_solutions(query, k=3)
        
        if not solutions:
            return "No specific Smartnet Magna solutions found. Consider our standard offerings: Google Cloud migration, cybersecurity suite, and AI‑powered analytics."
        
        summary_lines = ["Relevant Smartnet Magna solutions:"]
        for i, sol in enumerate(solutions, 1):
            summary_lines.append(
                f"{i}. {sol['content'][:300]} (Source: {sol['source']})"
            )
        
        return "\n".join(summary_lines)


# Singleton instance
rag_service = RagService()