#!/usr/bin/env python3
"""Test script for RAG service."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.rag_service import rag_service

def main():
    print("Testing RAG service...")
    
    # Check vector store count
    vs = rag_service._get_vectorstore()
    count = vs._collection.count()
    print(f"Vector store document count: {count}")
    
    # Query solutions
    query = "cloud migration security"
    solutions = rag_service.query_solutions(query, k=3)
    print(f"\nQuery: '{query}'")
    print(f"Found {len(solutions)} solutions")
    
    for i, sol in enumerate(solutions):
        print(f"\n--- Solution {i+1} ---")
        print(f"Source: {sol.get('source', 'Unknown')}")
        print(f"Page: {sol.get('page', 0)}")
        print(f"Confidence: {sol.get('confidence', 'N/A')}")
        print(f"Content preview: {sol.get('content', '')[:200]}...")
    
    # Get summary
    summary = rag_service.get_solution_summary(query)
    print(f"\nSummary:\n{summary}")

if __name__ == "__main__":
    main()