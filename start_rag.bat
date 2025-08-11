@echo off
echo Starting Luma AI RAG System...
echo.

echo Activating Python environment...
call luma-rag-env\Scripts\activate.bat

echo.
echo Checking if vector store exists...
if not exist "Rag\vector_store\index.faiss" (
    echo Vector store not found. Building vector store...
    cd Rag
    python ..\build_vector_store.py
    cd ..
    echo Vector store built successfully!
) else (
    echo Vector store found!
)

echo.
echo Starting RAG server on http://localhost:5000...
echo Press Ctrl+C to stop the server
echo.
python rag_server.py

pause
