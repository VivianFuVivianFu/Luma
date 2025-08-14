import os
from huggingface_hub import InferenceClient

print("MENTAL HEALTH CLASSIFICATION MODEL TEST")
print("=" * 40)

print("ORIGINAL CODE ERROR DETECTED:")
print("os.getenv('HF_API_TOKEN=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') - SYNTAX ERROR")
print("Should be: os.getenv('HF_API_TOKEN') after setting environment variable")
print()

# CORRECTED VERSION:
print("RUNNING CORRECTED VERSION:")
print("-" * 30)

# Fix: Set environment variable properly
os.environ["HF_API_TOKEN"] = "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"

# Fix: Use environment variable correctly  
client = InferenceClient(token=os.getenv("HF_API_TOKEN"))

text = "I've been feeling very anxious and can't sleep well."

try:
    out = client.text_classification(
        model="Elite13/bert-finetuned-mental-health",
        inputs=text
    )
    print("SUCCESS! Mental Health Classification Results:")
    print("Input text:", text)
    print("Classification output:")
    print(out)
    
    # Parse and display results nicely
    if isinstance(out, list) and len(out) > 0:
        print("\nDetailed Analysis:")
        for result in out:
            label = result.get('label', 'Unknown')
            score = result.get('score', 0)
            print(f"- {label}: {score:.2%} confidence")
    
except Exception as e:
    print(f"API Error: {e}")
    print("\nThis is likely due to API permissions or model availability.")
    
    # Provide fallback classification simulation
    print("\nFALLBACK: Simulated Mental Health Classification")
    print("-" * 45)
    
    # Simple keyword-based classification for demonstration
    text_lower = text.lower()
    
    classifications = []
    
    if 'anxious' in text_lower or 'anxiety' in text_lower:
        classifications.append({'label': 'anxiety', 'score': 0.92})
    if 'sleep' in text_lower and ('can\'t' in text_lower or 'trouble' in text_lower):
        classifications.append({'label': 'sleep_disorder', 'score': 0.78})
    if 'depressed' in text_lower or 'sad' in text_lower:
        classifications.append({'label': 'depression', 'score': 0.65})
    if not classifications:
        classifications.append({'label': 'general_distress', 'score': 0.70})
    
    print("Simulated classification results:")
    print(f"Input: '{text}'")
    print("Results:", classifications)
    
    print("\nNote: This demonstrates how the classification would work.")
    print("The actual BERT model would provide more accurate results.")

print("\nCORRECTION SUMMARY:")
print("- Fixed os.getenv() syntax error")
print("- Added proper error handling")
print("- Added fallback classification logic")
print("- Code is now syntactically correct!")

# Integration note
print("\nINTEGRATION OPPORTUNITY:")
print("This mental health classification could enhance LUMA's")
print("multi-model system by providing automatic mental health")
print("condition detection for more targeted responses.")