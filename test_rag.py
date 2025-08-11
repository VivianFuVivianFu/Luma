#!/usr/bin/env python3
"""
Test script for RAG functionality
"""

import requests
import json
import time

def test_rag_server():
    """Test the RAG server endpoints"""
    base_url = "http://localhost:5000"

    print("Testing RAG Server...")

    # Test health endpoint
    try:
        print("\n1. Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✓ Health check passed: {health_data}")
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Cannot connect to RAG server: {e}")
        return False

    # Test documents endpoint
    try:
        print("\n2. Testing documents endpoint...")
        response = requests.get(f"{base_url}/documents", timeout=5)
        if response.status_code == 200:
            docs_data = response.json()
            print(f"✓ Documents endpoint: {docs_data}")
        else:
            print(f"✗ Documents endpoint failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Documents endpoint error: {e}")

    # Test search endpoint
    try:
        print("\n3. Testing search endpoint...")
        test_query = "What is C-PTSD?"
        response = requests.post(
            f"{base_url}/search",
            json={"query": test_query, "k": 3},
            timeout=10
        )
        if response.status_code == 200:
            search_data = response.json()
            print(f"✓ Search successful for '{test_query}':")
            print(f"  Found {search_data.get('count', 0)} results")
            for i, result in enumerate(search_data.get('results', [])[:2]):
                print(f"  Result {i+1}: {result.get('content', '')[:100]}...")
        else:
            print(f"✗ Search failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Search endpoint error: {e}")

    # Test context endpoint
    try:
        print("\n4. Testing context endpoint...")
        test_query = "attachment styles"
        response = requests.post(
            f"{base_url}/context",
            json={"query": test_query, "max_length": 1000},
            timeout=10
        )
        if response.status_code == 200:
            context_data = response.json()
            print(f"✓ Context retrieval successful for '{test_query}':")
            print(f"  Context length: {context_data.get('context_length', 0)} characters")
            print(f"  Context preview: {context_data.get('context', '')[:200]}...")
        else:
            print(f"✗ Context retrieval failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Context endpoint error: {e}")

    print("\n✓ RAG server test completed!")
    return True

if __name__ == "__main__":
    test_rag_server()
