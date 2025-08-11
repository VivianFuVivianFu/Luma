#!/usr/bin/env python3
"""
Quick test script to verify RAG system is working
"""

def test_imports():
    """Test if all required modules can be imported"""
    try:
        import faiss
        print("✓ FAISS imported successfully")
    except ImportError as e:
        print(f"✗ FAISS import failed: {e}")
        return False

    try:
        import sentence_transformers
        print("✓ Sentence Transformers imported successfully")
    except ImportError as e:
        print(f"✗ Sentence Transformers import failed: {e}")
        return False

    try:
        import flask
        print("✓ Flask imported successfully")
    except ImportError as e:
        print(f"✗ Flask import failed: {e}")
        return False

    return True

def test_vector_store():
    """Test if vector store exists"""
    import os

    faiss_path = "Rag/vector_store/index.faiss"
    pkl_path = "Rag/vector_store/index.pkl"

    if os.path.exists(faiss_path) and os.path.exists(pkl_path):
        print("✓ Vector store files found")
        return True
    else:
        print("✗ Vector store files missing")
        print(f"  Looking for: {faiss_path}")
        print(f"  Looking for: {pkl_path}")
        return False

def test_documents():
    """Test if documents exist"""
    import os

    docs_dir = "Rag/docs"
    if not os.path.exists(docs_dir):
        print("✗ Documents directory not found")
        return False

    txt_files = [f for f in os.listdir(docs_dir) if f.endswith('.txt')]
    if len(txt_files) > 0:
        print(f"✓ Found {len(txt_files)} document files")
        return True
    else:
        print("✗ No .txt files found in documents directory")
        return False

def main():
    print("=== RAG System Quick Test ===\n")

    print("1. Testing Python imports...")
    imports_ok = test_imports()
    print()

    print("2. Testing vector store...")
    vector_store_ok = test_vector_store()
    print()

    print("3. Testing documents...")
    docs_ok = test_documents()
    print()

    print("=== Test Results ===")
    if imports_ok and vector_store_ok and docs_ok:
        print("✓ All tests passed! RAG system is ready.")
        print("\nNext steps:")
        print("1. Run: python rag_server.py")
        print("2. Or use: start_rag.bat")
        return True
    else:
        print("✗ Some tests failed. Check the issues above.")
        if not imports_ok:
            print("  - Install missing Python packages")
        if not vector_store_ok:
            print("  - Run: python build_vector_store.py")
        if not docs_ok:
            print("  - Add .txt files to Rag/docs/ directory")
        return False

if __name__ == "__main__":
    main()
