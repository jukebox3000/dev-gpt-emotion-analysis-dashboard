import pandas as pd
import json

def simplify_devgpt(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    clean_rows = []
    
    for source in data.get("Sources", []):
        category = source.get("Type", "Unknown")
        author = source.get("Author", "Unknown")
        timestamp = source.get("CreatedAt", "2023-01-01T00:00:00Z") # Fallback if missing
        
        for sharing in source.get("ChatgptSharing", []):
            for conv in sharing.get("Conversations", []):
                prompt_text = conv.get("Prompt", "").strip()
                answer_text = conv.get("Answer", "").strip()
                
                if not answer_text:
                    continue
                    
                # Count how many code blocks were in the answer (for your bubble size chart)
                code_lines = len(conv.get("ListOfCode", []))
                
                clean_rows.append({
                    "conversation_id": sharing.get("URL", "unknown")[:10], # Group turns by URL
                    "category": category,
                    "username": author,
                    "timestamp": timestamp,
                    "prompt": prompt_text,
                    "answer": answer_text,
                    "code_lines": code_lines
                })
                
    return pd.DataFrame(clean_rows)