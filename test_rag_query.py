#!/usr/bin/env python3
"""
Simple test for RAG query
"""

import requests
import json

def test_rag_query():
    """Test a simple RAG query"""
    print("Testing RAG query...")

    try:
        response = requests.post("http://localhost:5000/context",
                               json={"query": "What is C-PTSD?", "max_length": 1000})

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Query: {data.get('query', 'N/A')}")
            print(f"Context Length: {data.get('context_length', 0)}")
            context = data.get('context', '')
            if context:
                print(f"Context Preview: {context[:200]}...")
            else:
                print("No context returned")
        else:
            print(f"Error: {response.text}")

    except Exception as e:
        print(f"Error: {e}")

def test_search_query():
    """Test a search query"""
    print("\nTesting search query...")

    try:
        response = requests.post("http://localhost:5000/search",
                               json={"query": "C-PTSD", "k": 3})

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Query: {data.get('query', 'N/A')}")
            print(f"Results Count: {data.get('count', 0)}")

            results = data.get('results', [])
            for i, result in enumerate(results[:2]):  # Show first 2 results
                print(f"\nResult {i+1}:")
                print(f"  Score: {result.get('score', 0)}")
                print(f"  Content: {result.get('content', '')[:100]}...")
                print(f"  Source: {result.get('metadata', {}).get('source', 'Unknown')}")
        else:
            print(f"Error: {response.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_rag_query()
    test_search_query()
