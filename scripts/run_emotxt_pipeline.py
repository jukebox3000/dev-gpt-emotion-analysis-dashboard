#!/usr/bin/env python3
import os
import json
from collections import defaultdict, Counter
from transformers import pipeline

# Set paths
BASE_DIR = "/Users/jithinmichael/Coding/vis-thesis"
PROCESSED_CONVS_PATH = os.path.join(BASE_DIR, "d3js-dashboard/public/data/processed_conversations.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "d3js-dashboard/public/data/emotxt")

def main():
    print("--- Starting Pure Python GoEmotions Classifier Pipeline ---")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 1. Load processed conversations
    print(f"Loading turns from {PROCESSED_CONVS_PATH}...")
    with open(PROCESSED_CONVS_PATH, 'r', encoding='utf-8') as f:
        turns = json.load(f)
    print(f"Loaded {len(turns)} turns.")
    
    # 2. Initialize Hugging Face pipeline
    print("Loading Hugging Face GoEmotions classifier model...")
    # This model is lightweight and highly optimized
    classifier = pipeline(task="text-classification", model="SamLowe/roberta-base-go_emotions", top_k=None)
    
    # 3. Define the emotion mapping from 28 GoEmotions to the 6 thesis categories
    emotion_mapping = {
        'joy': ['joy', 'excitement', 'amusement', 'pride', 'optimism', 'relief'],
        'anger': ['anger', 'annoyance', 'disapproval', 'disgust'],
        'sadness': ['sadness', 'disappointment', 'remorse', 'grief', 'embarrassment'],
        'fear': ['fear', 'nervousness'],
        'surprise': ['surprise', 'realization', 'curiosity'],
        'love': ['love', 'caring', 'desire', 'admiration', 'gratitude', 'approval']
    }
    
    # 4. Extract texts for batch processing
    texts = [turn['text'][:512] for turn in turns]  # truncate to 512 chars to avoid model limits
    
    print(f"Classifying {len(turns)} turns in batches...")
    results = classifier(texts, batch_size=32, truncation=True)
    
    # 5. Process results and map to target emotions
    print("Mapping predictions to target emotions...")
    
    # Dominant emotion selection priority (highest arousal/negative first)
    emotion_priority = ['anger', 'sadness', 'fear', 'surprise', 'love', 'joy']
    
    processed_turns = []
    
    # Counts for summary stats
    emotion_counts = {
        "overall": Counter(),
        "developer": Counter(),
        "gpt": Counter(),
        "raw_labels": Counter()
    }
    
    # Classification threshold for summed categories
    THRESHOLD = 0.20
    
    for idx, turn in enumerate(turns):
        res = results[idx]
        # Convert list of dicts to dict: {label: score}
        score_dict = {item['label']: item['score'] for item in res}
        
        # Calculate category scores
        category_scores = {}
        yes_emotions = []
        for cat, labels in emotion_mapping.items():
            score_sum = sum(score_dict.get(lbl, 0.0) for lbl in labels)
            category_scores[cat] = score_sum
            if score_sum >= THRESHOLD:
                yes_emotions.append(cat)
                
        # Determine dominant emotion
        dominant = 'neutral'
        dominant_score = 0.0
        for emo in emotion_priority:
            if emo in yes_emotions:
                dominant = emo
                dominant_score = category_scores[emo]
                break
                
        # Map to display label
        mapped_emotion = dominant.capitalize() # Joy, Anger, Sadness, Fear, Surprise, Love, Neutral
        
        # Update turn fields
        turn['emotion_raw'] = dominant
        turn['emotion_dev'] = mapped_emotion
        # Real confidence score instead of hardcoded 1.0!
        turn['emotion_confidence'] = round(dominant_score, 3) if dominant != 'neutral' else 0.0
        turn['emotxt_all_emotions'] = yes_emotions
        
        processed_turns.append(turn)
        
        # Update counts
        speaker = turn['speaker'].lower() # developer, gpt
        emotion_counts["overall"][mapped_emotion] += 1
        if speaker == 'developer':
            emotion_counts["developer"][mapped_emotion] += 1
        elif speaker == 'gpt':
            emotion_counts["gpt"][mapped_emotion] += 1
            
        for emo in yes_emotions:
            emotion_counts["raw_labels"][emo] += 1
            
    # Write processed turns
    processed_turns_path = os.path.join(OUTPUT_DIR, "processed_turns.json")
    with open(processed_turns_path, 'w', encoding='utf-8') as f:
        json.dump(processed_turns, f, indent=2)
    print(f"Saved processed turns to {processed_turns_path}.")
    
    # 6. Create conversation groups
    print("Grouping conversations...")
    convs_dict = defaultdict(list)
    for turn in processed_turns:
        convs_dict[turn['conversation_id']].append(turn)
        
    groups = []
    for cid, cturns in convs_dict.items():
        # Sort by turn_index
        cturns_sorted = sorted(cturns, key=lambda t: t['turn_index'])
        first_turn = cturns_sorted[0]
        groups.append({
            "conversation_id": cid,
            "num_turns": len(cturns_sorted),
            "num_prompts": sum(1 for t in cturns_sorted if t['speaker'] == 'Developer'),
            "sharing_title": first_turn.get('sharing_title', 'No Title'),
            "source_author": first_turn.get('source_author', 'anonymous'),
            "repo_name": first_turn.get('repo_name', 'No Repo'),
            "repo_language": first_turn.get('repo_language', 'Unknown'),
            "timestamp": first_turn.get('timestamp', ''),
            "turns": cturns_sorted
        })
        
    groups_path = os.path.join(OUTPUT_DIR, "conversation_groups.json")
    with open(groups_path, 'w', encoding='utf-8') as f:
        json.dump(groups, f, indent=2)
    print(f"Saved conversation groups to {groups_path}.")
    
    # 7. Compile stats
    print("Compiling summary statistics...")
    unique_authors = len(set(t['source_author'] for t in processed_turns if t.get('source_author')))
    unique_repos = len(set(t['repo_name'] for t in processed_turns if t.get('repo_name')))
    dev_turns_count = sum(1 for t in processed_turns if t['speaker'] == 'Developer')
    gpt_turns_count = sum(1 for t in processed_turns if t['speaker'] == 'GPT')
    
    stats = {
        "overview": {
            "total_turns": len(processed_turns),
            "total_conversations": len(groups),
            "developer_turns": dev_turns_count,
            "gpt_turns": gpt_turns_count,
            "unique_authors": unique_authors,
            "unique_repos": unique_repos
        },
        "emotion_distribution": {
            "overall": dict(emotion_counts["overall"]),
            "developer": dict(emotion_counts["developer"]),
            "gpt": dict(emotion_counts["gpt"]),
            "raw_labels": dict(emotion_counts["raw_labels"])
        }
    }
    
    stats_path = os.path.join(OUTPUT_DIR, "summary_stats.json")
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)
    print(f"Saved stats summary to {stats_path}.")
    
    print("\n--- Pipeline Completed Successfully! ---")

if __name__ == "__main__":
    main()
