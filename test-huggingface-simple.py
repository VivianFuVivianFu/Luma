import os
from huggingface_hub import InferenceClient
import requests

# Set the token
token = "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"

print("Testing Hugging Face API with simple approach...")
print("=" * 50)

# Test 1: Check if token is valid
try:
    client = InferenceClient(token=token)
    print("Token validation: OK")
except Exception as e:
    print(f"Token validation failed: {e}")
    exit(1)

# Test 2: Try a simple, well-known model first
try:
    print("\nTesting with GPT-2 (simple text generation)...")
    response = client.text_generation(
        prompt="Hello, I'm feeling sad today. Can you help?",
        model="gpt2",
        max_new_tokens=100,
        temperature=0.7
    )
    print("SUCCESS with GPT-2!")
    print("Response:", response)
except Exception as e:
    print(f"GPT-2 failed: {e}")

# Test 3: Try with a mental health specific model
try:
    print("\nTesting with mental health model...")
    
    # Using direct API call approach
    headers = {"Authorization": f"Bearer {token}"}
    
    api_url = "https://api-inference.huggingface.co/models/klyang/MentaLLaMA-chat-7B"
    data = {
        "inputs": "You are a supportive companion. User: I feel low lately. Can you help me reflect on possible next steps? Assistant:",
        "parameters": {
            "max_new_tokens": 200,
            "temperature": 0.7,
            "do_sample": True
        }
    }
    
    response = requests.post(api_url, headers=headers, json=data)
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS with MentaLLaMA!")
        print("Response:", result)
    else:
        print(f"API call failed with status {response.status_code}: {response.text}")
        
except Exception as e:
    print(f"Mental health model test failed: {e}")

# Test 4: Try Facebook BlenderBot (used in our multi-model system)
try:
    print("\nTesting with BlenderBot...")
    
    api_url = "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill"
    data = {
        "inputs": "I feel sad and overwhelmed today. Can you help me?",
        "parameters": {
            "max_length": 150,
            "temperature": 0.7
        }
    }
    
    response = requests.post(api_url, headers=headers, json=data)
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS with BlenderBot!")
        print("Response:", result)
    else:
        print(f"BlenderBot failed with status {response.status_code}: {response.text}")
        
except Exception as e:
    print(f"BlenderBot test failed: {e}")

print("\n" + "=" * 50)
print("Test completed. Check results above.")