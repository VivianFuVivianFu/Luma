import os
from huggingface_hub import InferenceClient

# Set the token directly 
token = "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"
client = InferenceClient(token=token)

messages = [
    {"role": "system", "content": "You are a supportive, non-therapeutic companion. Provide disclaimers when asked for medical advice."},
    {"role": "user", "content": "I feel low lately. Can you help me reflect on possible next steps to take today?"}
]

print("Testing Hugging Face MentaLLaMA model...")
print("=" * 50)

# Try text generation approach (more compatible)
try:
    # Create a prompt from the messages
    system_prompt = messages[0]["content"]
    user_message = messages[1]["content"]
    prompt = f"{system_prompt}\n\nUser: {user_message}\nAssistant:"
    
    print("Using text generation approach...")
    response = client.text_generation(
        prompt=prompt,
        model="klyang/MentaLLaMA-chat-7B",
        max_new_tokens=256,
        temperature=0.7,
        do_sample=True,
        top_p=0.9
    )
    print("SUCCESS! Response from MentaLLaMA:")
    print("-" * 30)
    print(response)
    
except Exception as e:
    print(f"Text generation failed: {e}")
    
    # Try chat completion as fallback
    try:
        print("\nTrying chat completion approach...")
        resp = client.chat_completion(
            model="klyang/MentaLLaMA-chat-7B",
            messages=messages,
            max_tokens=512,
            temperature=0.7
        )
        print("SUCCESS! Chat completion response:")
        print("-" * 30)
        print(resp.choices[0].message.content)
    except Exception as e2:
        print(f"Chat completion also failed: {e2}")
        
        # Try with a different model that supports chat
        try:
            print("\nTrying with alternative mental health model...")
            resp = client.chat_completion(
                model="microsoft/DialoGPT-medium",
                messages=messages,
                max_tokens=256,
                temperature=0.7
            )
            print("SUCCESS! Alternative model response:")
            print("-" * 30)
            print(resp.choices[0].message.content)
        except Exception as e3:
            print(f"All approaches failed: {e3}")
            print("The model may not be available or may require different parameters.")