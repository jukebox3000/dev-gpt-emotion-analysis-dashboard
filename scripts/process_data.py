#!/usr/bin/env python3
"""
DevGPT Data Processing Pipeline
================================
Processes the DevGPT dataset (GitHub PR conversations with ChatGPT)
into structured JSON for the thesis dashboard analyzing emotional dynamics
between Developers and ChatGPT.

Usage:
    python3 /home/z/my-project/scripts/process_data.py
"""

import json
import os
import re
import hashlib
from collections import defaultdict, Counter
from typing import Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# =============================================================================
# Configuration
# =============================================================================

INPUT_FILE = "/home/z/my-project/upload/20230817_125147_pr_sharings.json"
OUTPUT_DIR = "/home/z/my-project/public/data"

OUTPUT_FILES = {
    "conversations": os.path.join(OUTPUT_DIR, "processed_conversations.json"),
    "groups": os.path.join(OUTPUT_DIR, "conversation_groups.json"),
    "stats": os.path.join(OUTPUT_DIR, "summary_stats.json"),
}

# Dev-aligned emotion mapping from GoEmotions 27 labels to 6 categories
DEV_EMOTION_MAP = {
    # Frustration
    "annoyance": "Frustration",
    "disapproval": "Frustration",
    "disappointment": "Frustration",
    "anger": "Frustration",
    # Confusion
    "confusion": "Confusion",
    "curiosity": "Confusion",
    # Satisfaction
    "approval": "Satisfaction",
    "gratitude": "Satisfaction",
    "realization": "Satisfaction",
    "relief": "Satisfaction",
    # Engagement
    "excitement": "Engagement",
    "optimism": "Engagement",
    "amusement": "Engagement",
    "surprise": "Engagement",
    "pride": "Engagement",
    # Negativity
    "sadness": "Negativity",
    "fear": "Negativity",
    "nervousness": "Negativity",
    "embarrassment": "Negativity",
    "grief": "Negativity",
    "remorse": "Negativity",
    "disgust": "Negativity",
    # Neutral
    "neutral": "Neutral",
    "love": "Neutral",
    "desire": "Neutral",
    "caring": "Neutral",
    "admiration": "Neutral",
}

# Sentiment word lists
POSITIVE_WORDS = {
    "good", "great", "excellent", "thanks", "thank", "perfect", "awesome",
    "nice", "helpful", "correct", "working", "works", "worked", "solved",
    "fixed", "fix", "done", "success", "successful", "amazing", "wonderful",
    "fantastic", "brilliant", "outstanding", "superb", "appreciate",
    "appreciated", "love", "loved", "best", "better", "easy", "easier",
    "efficient", "cool", "exactly", "right", "clean", "solid", "sweet",
    "beautiful", "neat", "impressive", "exactly", "spot", "on",
}

NEGATIVE_WORDS = {
    "error", "bug", "bugs", "wrong", "fail", "fails", "failed", "failure",
    "broken", "break", "breaks", "issue", "issues", "problem", "problems",
    "bad", "terrible", "frustrated", "frustrating", "annoying", "annoyed",
    "doesn't", "doesnt", "can't", "cant", "won't", "wont", "isn't", "isnt",
    "crash", "crashed", "crashes", "ugly", "horrible", "worst", "worse",
    "difficult", "hard", "slow", "stuck", "unfortunately", "sadly",
    "confused", "confusing", "unclear", "missing", "lack", "lackluster",
    "disappointing", "disappointed", "mess", "messy", "incomplete",
    "invalid", "unresolved", "unsupported",
}

# Question words for heuristic classification
QUESTION_WORDS = {"what", "how", "why", "when", "where", "which", "who", "whom"}

# Imperative verbs for intent detection
IMPERATIVE_VERBS = {
    "write", "create", "build", "generate", "implement", "add", "remove",
    "delete", "update", "fix", "make", "show", "explain", "describe",
    "provide", "give", "tell", "help", "please", "let", "run", "test",
    "refactor", "optimize", "convert", "translate", "format", "install",
    "configure", "set", "deploy", "debug", "review", "check", "verify",
}

# Code-related terms for code_request detection
CODE_TERMS = {
    "code", "function", "class", "method", "script", "program", "module",
    "component", "api", "endpoint", "algorithm", "snippet", "file",
    "library", "package", "docker", "container", "database", "query",
    "sql", "html", "css", "json", "yaml", "xml", "regex", "test",
    "unit", "feature", "pipeline", "workflow",
}

# Debugging terms
DEBUG_TERMS = {
    "error", "bug", "fix", "issue", "problem", "debug", "traceback",
    "exception", "stack", "trace", "crash", "fail", "broken", "unexpected",
    "incorrect", "wrong", "misbehave", "not working", "doesn't work",
}


# =============================================================================
# Helper Functions
# =============================================================================

def generate_turn_id(conversation_id: str, turn_index: int, speaker: str) -> str:
    """Generate a unique turn ID."""
    raw = f"{conversation_id}_{turn_index}_{speaker}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def word_count(text: str) -> int:
    """Count words in text."""
    if not text:
        return 0
    return len(text.split())


def is_question(text: str) -> bool:
    """Check if text is a question."""
    if not text:
        return False
    text_lower = text.lower().strip()
    if text_lower.endswith("?"):
        return True
    first_words = text_lower.split()[:5]
    return any(w in QUESTION_WORDS for w in first_words)


def classify_prompt_intent(text: str) -> str:
    """
    Heuristic prompt intent classification.
    Priority order: question > debugging > code_request > clarification > command > other
    """
    if not text:
        return "other"

    text_lower = text.lower().strip()

    # Check if it's a question (ends with ? or starts with question word)
    if text_lower.endswith("?") or any(
        text_lower.startswith(qw + " ") for qw in QUESTION_WORDS
    ):
        return "question"

    # Check for debugging intent
    if any(term in text_lower for term in DEBUG_TERMS):
        return "debugging"

    # Check for code request
    has_code_term = any(term in text_lower for term in CODE_TERMS)
    has_imperative = any(text_lower.startswith(v + " ") for v in IMPERATIVE_VERBS)
    if has_code_term and has_imperative:
        return "code_request"

    # Check for clarification
    clarification_patterns = [
        "what about", "how about", "can you explain", "could you explain",
        "can you clarify", "could you clarify", "what do you mean",
        "what does", "can you elaborate", "tell me more", "more details",
    ]
    if any(p in text_lower for p in clarification_patterns):
        return "clarification"

    # Check for command (starts with imperative verb)
    if has_imperative:
        return "command"

    return "other"


def classify_complexity(
    wc: int, has_code: bool, is_q: bool, intent: str
) -> str:
    """
    Classify prompt complexity.
    - Low: <50 words AND no code AND not a question
    - Medium: 50-150 words OR has code OR is a question
    - High: >150 words OR (has code AND is debugging)
    """
    if wc > 150 or (has_code and intent == "debugging"):
        return "High"
    if wc >= 50 or has_code or is_q:
        return "Medium"
    return "Low"


def compute_sentiment_polarity(text: str) -> float:
    """
    Rule-based sentiment polarity scoring.
    Returns value in [-1, 1] range.
    """
    if not text:
        return 0.0

    words = re.findall(r"\b\w+\b", text.lower())
    if not words:
        return 0.0

    score = 0
    for w in words:
        if w in POSITIVE_WORDS:
            score += 1
        elif w in NEGATIVE_WORDS:
            score -= 1

    # Normalize by word count with scaling factor
    # Using sqrt for a gentler normalization
    scale = max(np.sqrt(len(words)), 1.0)
    normalized = score / scale

    # Clamp to [-1, 1]
    return float(np.clip(normalized, -1.0, 1.0))


def heuristic_emotion(text: str, speaker: str) -> tuple:
    """
    Heuristic-based emotion classification.
    Returns (emotion_raw, emotion_dev, emotion_confidence).

    Rules:
    - Frustration triggers → "Frustration" for dev, "Engagement" for GPT
    - Confusion triggers → "Confusion" for dev, "Engagement" for GPT
    - Satisfaction triggers → "Satisfaction" for both
    - Engagement triggers → "Engagement" for dev
    - Otherwise → "Neutral"
    """
    if not text:
        return ("neutral", "Neutral", 0.0)

    text_lower = text.lower()

    # Frustration patterns
    frustration_patterns = [
        r'\berror\b', r'\bbug\b', r'\bfail\b', r'\bfailed\b', r'\bissue\b',
        r'\bproblem\b', r'\bbroken\b', r'\bcrash\b', r"\bdoesn't work\b",
        r"\bdoes not work\b", r'\bnot working\b', r'\bstuck\b',
        r'\bfrustrat', r'\bannoy', r'\bwrong\b', r'\bbad\b',
    ]
    # Confusion patterns
    confusion_patterns = [
        r'\bwhat\b', r'\bhow\b', r'\bwhy\b', r'\?', r'\bconfused\b',
        r'\bunderstand\b', r'\bunclear\b', r'\bconfusing\b',
        r'\bexplain\b', r'\bclarif',
    ]
    # Satisfaction patterns
    satisfaction_patterns = [
        r'\bthanks\b', r'\bthank you\b', r'\bgreat\b', r'\bworks\b',
        r'\bworked\b', r'\bworking\b', r'\bperfect\b', r'\bsolved\b',
        r'\bdone\b', r'\bexcellent\b', r'\bawesome\b', r'\bgood\b',
        r'\bhelpful\b', r'\bappreciate\b', r'\bnice\b', r'\bcorrect\b',
        r'\bright\b', r'\bcool\b',
    ]
    # Engagement patterns
    engagement_patterns = [
        r'\bplease help\b', r'\bcan you\b', r'\bwould you\b',
        r'\bcould you\b', r'\blet\'s\b', r'\blet us\b',
        r'\bi\'d like\b', r'\bi would like\b', r'\bi want\b',
        r'\bneed to\b', r'\btrying to\b',
    ]

    # Score each category
    frustration_score = sum(
        1 for p in frustration_patterns if re.search(p, text_lower)
    )
    confusion_score = sum(
        1 for p in confusion_patterns if re.search(p, text_lower)
    )
    satisfaction_score = sum(
        1 for p in satisfaction_patterns if re.search(p, text_lower)
    )
    engagement_score = sum(
        1 for p in engagement_patterns if re.search(p, text_lower)
    )

    # Determine dominant emotion with priority ordering
    if frustration_score >= 2 or (frustration_score >= 1 and satisfaction_score == 0 and confusion_score == 0):
        raw = "annoyance"
        dev_emotion = "Frustration" if speaker == "Developer" else "Engagement"
    elif satisfaction_score >= 2 or (satisfaction_score >= 1 and frustration_score == 0 and confusion_score == 0):
        raw = "gratitude" if "thank" in text_lower else "approval"
        dev_emotion = "Satisfaction"
    elif confusion_score >= 2 or (confusion_score >= 1 and frustration_score == 0 and satisfaction_score == 0):
        raw = "confusion"
        dev_emotion = "Confusion" if speaker == "Developer" else "Engagement"
    elif engagement_score >= 1:
        raw = "excitement"
        dev_emotion = "Engagement" if speaker == "Developer" else "Engagement"
    else:
        raw = "neutral"
        dev_emotion = "Neutral"

    return (raw, dev_emotion, 0.0)


# =============================================================================
# TF-IDF Keyword Extraction
# =============================================================================

def extract_keywords_tfidf(documents: list, top_n: int = 5) -> list:
    """
    Extract top-N keywords per document using TF-IDF.
    Returns a list of lists (one per document) of keyword strings.
    """
    if not documents:
        return []

    # Filter out empty documents and track indices
    valid_indices = []
    valid_docs = []
    for i, doc in enumerate(documents):
        if doc and len(doc.strip()) > 0:
            valid_indices.append(i)
            valid_docs.append(doc.strip())

    # If no valid documents, return empty lists for all
    if not valid_docs:
        return [[] for _ in documents]

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.95,
            token_pattern=r"\b[a-zA-Z]{2,}\b",
        )
        tfidf_matrix = vectorizer.fit_transform(valid_docs)
        feature_names = np.array(vectorizer.get_feature_names_out())

        # Extract top keywords per valid document
        valid_keywords = []
        for row_idx in range(tfidf_matrix.shape[0]):
            row = tfidf_matrix.getrow(row_idx).toarray().flatten()
            top_indices = row.argsort()[-top_n:][::-1]
            top_indices = top_indices[row[top_indices] > 0]  # Filter zero scores
            keywords = feature_names[top_indices].tolist()
            valid_keywords.append(keywords)
    except ValueError:
        # Fallback if TF-IDF fails (e.g., all stop words)
        valid_keywords = [[] for _ in valid_docs]

    # Map back to original document indices
    result = [[] for _ in documents]
    for i, vi in enumerate(valid_indices):
        result[vi] = valid_keywords[i]

    return result


# =============================================================================
# Main Processing Pipeline
# =============================================================================

def parse_sources(data: dict) -> list:
    """
    Parse the raw JSON data into a list of turn objects.
    Each conversation turn (prompt + answer) produces two turn objects:
    one for the Developer, one for GPT.
    """
    turns = []
    all_prompt_texts = []  # For TF-IDF
    all_answer_texts = []  # For TF-IDF
    turn_meta = []  # Track which turn index maps to which

    for source in data.get("Sources", []):
        # Extract source-level fields
        source_type = source.get("Type", "")
        source_author = source.get("Author", "")
        repo_name = source.get("RepoName", "")
        repo_language = source.get("RepoLanguage", "")
        pr_title = source.get("Title", "")
        pr_state = source.get("State", "")
        pr_additions = source.get("Additions", 0)
        pr_deletions = source.get("Deletions", 0)
        pr_changed_files = source.get("ChangedFiles", 0)
        pr_commits = source.get("CommitsTotalCount", 0)
        created_at = source.get("CreatedAt", "")

        for sharing in source.get("ChatgptSharing", []):
            sharing_url = sharing.get("URL", "")
            sharing_title = sharing.get("Title", "")
            num_prompts = sharing.get("NumberOfPrompts", 0)
            tokens_prompt = sharing.get("TokensOfPrompts", 0)
            tokens_answer = sharing.get("TokensOfAnswers", 0)
            model = sharing.get("Model", "")
            date_of_conversation = sharing.get("DateOfConversation", "")

            conversations = sharing.get("Conversations", [])
            if not conversations:
                continue

            for turn_index, conv in enumerate(conversations):
                prompt = conv.get("Prompt", "")
                answer = conv.get("Answer", "")
                list_of_code = conv.get("ListOfCode", [])

                # Code-related fields
                code_block_count = len(list_of_code)
                code_types = list(set(
                    code.get("Type", "") for code in list_of_code if code.get("Type")
                ))
                has_code = code_block_count > 0

                # Word counts
                pwc = word_count(prompt)
                awc = word_count(answer)

                # Question detection
                is_q = is_question(prompt)

                # Prompt intent
                intent = classify_prompt_intent(prompt)

                # Complexity (only for prompts)
                complexity = classify_complexity(pwc, has_code, is_q, intent)

                # Collect texts for batch TF-IDF processing
                all_prompt_texts.append(prompt)
                all_answer_texts.append(answer)
                turn_meta.append({
                    "source_type": source_type,
                    "source_author": source_author,
                    "repo_name": repo_name,
                    "repo_language": repo_language,
                    "pr_title": pr_title,
                    "pr_state": pr_state,
                    "pr_additions": pr_additions,
                    "pr_deletions": pr_deletions,
                    "pr_changed_files": pr_changed_files,
                    "pr_commits": pr_commits,
                    "created_at": created_at,
                    "sharing_url": sharing_url,
                    "sharing_title": sharing_title,
                    "num_prompts": num_prompts,
                    "tokens_prompt": tokens_prompt,
                    "tokens_answer": tokens_answer,
                    "model": model,
                    "date_of_conversation": date_of_conversation,
                    "turn_index": turn_index,
                    "prompt": prompt,
                    "answer": answer,
                    "prompt_word_count": pwc,
                    "answer_word_count": awc,
                    "code_block_count": code_block_count,
                    "code_types": code_types,
                    "has_code": has_code,
                    "is_question": is_q,
                    "prompt_intent": intent,
                    "prompt_complexity": complexity,
                    "conversation_id": sharing_url,
                })

    # Batch TF-IDF keyword extraction
    print(f"  Extracting keywords via TF-IDF for {len(all_prompt_texts)} prompts...")
    prompt_keywords = extract_keywords_tfidf(all_prompt_texts, top_n=5)
    print(f"  Extracting keywords via TF-IDF for {len(all_answer_texts)} answers...")
    answer_keywords = extract_keywords_tfidf(all_answer_texts, top_n=5)

    # Build turn objects
    for i, meta in enumerate(turn_meta):
        # Developer turn
        p_emotion_raw, p_emotion_dev, p_emotion_conf = heuristic_emotion(
            meta["prompt"], "Developer"
        )
        p_sentiment = compute_sentiment_polarity(meta["prompt"])

        dev_turn = {
            "turn_id": generate_turn_id(meta["conversation_id"], meta["turn_index"], "Developer"),
            "conversation_id": meta["conversation_id"],
            "turn_index": meta["turn_index"],
            "speaker": "Developer",
            "text": meta["prompt"],
            "text_preview": meta["prompt"][:150] + "..." if len(meta["prompt"]) > 150 else meta["prompt"],
            "emotion_raw": p_emotion_raw,
            "emotion_dev": p_emotion_dev,
            "emotion_confidence": p_emotion_conf,
            "sentiment_polarity": round(p_sentiment, 4),
            "prompt_intent": meta["prompt_intent"],
            "prompt_complexity": meta["prompt_complexity"],
            "word_count": meta["prompt_word_count"],
            "code_block_count": meta["code_block_count"],
            "code_types": meta["code_types"],
            "has_code": meta["has_code"],
            "is_question": meta["is_question"],
            "top_keywords": prompt_keywords[i],
            "source_type": meta["source_type"],
            "source_author": meta["source_author"],
            "repo_language": meta["repo_language"],
            "repo_name": meta["repo_name"],
            "pr_title": meta["pr_title"],
            "pr_state": meta["pr_state"],
            "pr_additions": meta["pr_additions"],
            "pr_deletions": meta["pr_deletions"],
            "timestamp": meta["created_at"],
            "tokens_prompt": meta["tokens_prompt"],
            "tokens_answer": meta["tokens_answer"],
            "model": meta["model"],
            "sharing_title": meta["sharing_title"],
            "sharing_url": meta["sharing_url"],
        }

        # GPT turn
        a_emotion_raw, a_emotion_dev, a_emotion_conf = heuristic_emotion(
            meta["answer"], "GPT"
        )
        a_sentiment = compute_sentiment_polarity(meta["answer"])

        gpt_turn = {
            "turn_id": generate_turn_id(meta["conversation_id"], meta["turn_index"], "GPT"),
            "conversation_id": meta["conversation_id"],
            "turn_index": meta["turn_index"],
            "speaker": "GPT",
            "text": meta["answer"],
            "text_preview": meta["answer"][:150] + "..." if len(meta["answer"]) > 150 else meta["answer"],
            "emotion_raw": a_emotion_raw,
            "emotion_dev": a_emotion_dev,
            "emotion_confidence": a_emotion_conf,
            "sentiment_polarity": round(a_sentiment, 4),
            "prompt_intent": meta["prompt_intent"],  # Inherited from the prompt
            "prompt_complexity": meta["prompt_complexity"],  # Inherited from the prompt
            "word_count": meta["answer_word_count"],
            "code_block_count": meta["code_block_count"],
            "code_types": meta["code_types"],
            "has_code": meta["has_code"],
            "is_question": meta["is_question"],  # Inherited from the prompt
            "top_keywords": answer_keywords[i],
            "source_type": meta["source_type"],
            "source_author": meta["source_author"],
            "repo_language": meta["repo_language"],
            "repo_name": meta["repo_name"],
            "pr_title": meta["pr_title"],
            "pr_state": meta["pr_state"],
            "pr_additions": meta["pr_additions"],
            "pr_deletions": meta["pr_deletions"],
            "timestamp": meta["created_at"],
            "tokens_prompt": meta["tokens_prompt"],
            "tokens_answer": meta["tokens_answer"],
            "model": meta["model"],
            "sharing_title": meta["sharing_title"],
            "sharing_url": meta["sharing_url"],
        }

        turns.append(dev_turn)
        turns.append(gpt_turn)

    return turns


def group_by_conversation(turns: list) -> dict:
    """Group turns by conversation_id into conversation threads."""
    groups = defaultdict(list)
    for turn in turns:
        groups[turn["conversation_id"]].append(turn)

    # Sort each group by turn_index, then speaker (Developer before GPT)
    result = {}
    for conv_id, conv_turns in groups.items():
        conv_turns.sort(key=lambda t: (t["turn_index"], 0 if t["speaker"] == "Developer" else 1))
        result[conv_id] = conv_turns

    return result


def compute_summary_stats(turns: list, groups: dict) -> dict:
    """Compute aggregate statistics for the dashboard."""

    total_turns = len(turns)
    total_conversations = len(groups)

    # Speaker breakdown
    dev_turns = [t for t in turns if t["speaker"] == "Developer"]
    gpt_turns = [t for t in turns if t["speaker"] == "GPT"]

    # Emotion distribution
    dev_emotion_counts = Counter(t["emotion_dev"] for t in turns)
    dev_only_emotion_counts = Counter(t["emotion_dev"] for t in dev_turns)
    gpt_only_emotion_counts = Counter(t["emotion_dev"] for t in gpt_turns)

    # Emotion raw distribution
    raw_emotion_counts = Counter(t["emotion_raw"] for t in turns)

    # Intent distribution
    intent_counts = Counter(t["prompt_intent"] for t in dev_turns)

    # Complexity distribution
    complexity_counts = Counter(t["prompt_complexity"] for t in dev_turns)

    # Language distribution
    language_counts = Counter(t["repo_language"] for t in turns if t["repo_language"])

    # State distribution
    state_counts = Counter(t["pr_state"] for t in turns if t["pr_state"])

    # Code presence
    has_code_count = sum(1 for t in turns if t["has_code"])
    has_code_pct = round(has_code_count / total_turns * 100, 1) if total_turns else 0

    # Question rate
    question_count = sum(1 for t in dev_turns if t["is_question"])
    question_pct = round(question_count / len(dev_turns) * 100, 1) if dev_turns else 0

    # Word count stats
    dev_word_counts = [t["word_count"] for t in dev_turns]
    gpt_word_counts = [t["word_count"] for t in gpt_turns]

    # Sentiment stats
    dev_sentiments = [t["sentiment_polarity"] for t in dev_turns]
    gpt_sentiments = [t["sentiment_polarity"] for t in gpt_turns]

    # Conversation length distribution
    conv_lengths = [len(v) for v in groups.values()]
    conv_prompt_counts = {}
    for conv_id, conv_turns in groups.items():
        unique_turn_indices = set(t["turn_index"] for t in conv_turns)
        conv_prompt_counts[conv_id] = len(unique_turn_indices)
    prompt_counts = list(conv_prompt_counts.values())

    # Top authors
    author_counts = Counter(t["source_author"] for t in turns if t["source_author"])

    # Top repos
    repo_counts = Counter(t["repo_name"] for t in turns if t["repo_name"])

    # Tokens stats
    tokens_prompt_list = [t["tokens_prompt"] for t in turns if t["tokens_prompt"]]
    tokens_answer_list = [t["tokens_answer"] for t in turns if t["tokens_answer"]]

    stats = {
        "overview": {
            "total_turns": total_turns,
            "total_conversations": total_conversations,
            "developer_turns": len(dev_turns),
            "gpt_turns": len(gpt_turns),
            "unique_authors": len(set(t["source_author"] for t in turns if t["source_author"])),
            "unique_repos": len(set(t["repo_name"] for t in turns if t["repo_name"])),
        },
        "emotion_distribution": {
            "overall": dict(dev_emotion_counts),
            "developer": dict(dev_only_emotion_counts),
            "gpt": dict(gpt_only_emotion_counts),
            "raw_labels": dict(raw_emotion_counts),
        },
        "intent_distribution": dict(intent_counts),
        "complexity_distribution": dict(complexity_counts),
        "language_distribution": dict(language_counts),
        "state_distribution": dict(state_counts),
        "code_stats": {
            "turns_with_code": has_code_count,
            "percentage_with_code": has_code_pct,
        },
        "question_stats": {
            "developer_questions": question_count,
            "question_percentage": question_pct,
        },
        "word_count_stats": {
            "developer": {
                "mean": round(float(np.mean(dev_word_counts)), 1) if dev_word_counts else 0,
                "median": round(float(np.median(dev_word_counts)), 1) if dev_word_counts else 0,
                "min": min(dev_word_counts) if dev_word_counts else 0,
                "max": max(dev_word_counts) if dev_word_counts else 0,
                "std": round(float(np.std(dev_word_counts)), 1) if dev_word_counts else 0,
            },
            "gpt": {
                "mean": round(float(np.mean(gpt_word_counts)), 1) if gpt_word_counts else 0,
                "median": round(float(np.median(gpt_word_counts)), 1) if gpt_word_counts else 0,
                "min": min(gpt_word_counts) if gpt_word_counts else 0,
                "max": max(gpt_word_counts) if gpt_word_counts else 0,
                "std": round(float(np.std(gpt_word_counts)), 1) if gpt_word_counts else 0,
            },
        },
        "sentiment_stats": {
            "developer": {
                "mean": round(float(np.mean(dev_sentiments)), 4) if dev_sentiments else 0,
                "median": round(float(np.median(dev_sentiments)), 4) if dev_sentiments else 0,
                "positive_pct": round(sum(1 for s in dev_sentiments if s > 0) / len(dev_sentiments) * 100, 1) if dev_sentiments else 0,
                "negative_pct": round(sum(1 for s in dev_sentiments if s < 0) / len(dev_sentiments) * 100, 1) if dev_sentiments else 0,
                "neutral_pct": round(sum(1 for s in dev_sentiments if s == 0) / len(dev_sentiments) * 100, 1) if dev_sentiments else 0,
            },
            "gpt": {
                "mean": round(float(np.mean(gpt_sentiments)), 4) if gpt_sentiments else 0,
                "median": round(float(np.median(gpt_sentiments)), 4) if gpt_sentiments else 0,
                "positive_pct": round(sum(1 for s in gpt_sentiments if s > 0) / len(gpt_sentiments) * 100, 1) if gpt_sentiments else 0,
                "negative_pct": round(sum(1 for s in gpt_sentiments if s < 0) / len(gpt_sentiments) * 100, 1) if gpt_sentiments else 0,
                "neutral_pct": round(sum(1 for s in gpt_sentiments if s == 0) / len(gpt_sentiments) * 100, 1) if gpt_sentiments else 0,
            },
        },
        "conversation_length_stats": {
            "mean_prompts": round(float(np.mean(prompt_counts)), 1) if prompt_counts else 0,
            "median_prompts": round(float(np.median(prompt_counts)), 1) if prompt_counts else 0,
            "min_prompts": min(prompt_counts) if prompt_counts else 0,
            "max_prompts": max(prompt_counts) if prompt_counts else 0,
            "total_turns_per_conversation": {
                "mean": round(float(np.mean(conv_lengths)), 1) if conv_lengths else 0,
                "median": round(float(np.median(conv_lengths)), 1) if conv_lengths else 0,
            },
        },
        "top_authors": dict(author_counts.most_common(20)),
        "top_repos": dict(repo_counts.most_common(20)),
        "token_stats": {
            "tokens_prompt": {
                "total": sum(tokens_prompt_list) if tokens_prompt_list else 0,
                "mean": round(float(np.mean(tokens_prompt_list)), 1) if tokens_prompt_list else 0,
            },
            "tokens_answer": {
                "total": sum(tokens_answer_list) if tokens_answer_list else 0,
                "mean": round(float(np.mean(tokens_answer_list)), 1) if tokens_answer_list else 0,
            },
        },
    }

    return stats


# =============================================================================
# Main Entry Point
# =============================================================================

def main():
    print("=" * 60)
    print("DevGPT Data Processing Pipeline")
    print("=" * 60)

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load input data
    print(f"\n[1/5] Loading input data from: {INPUT_FILE}")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    num_sources = len(data.get("Sources", []))
    print(f"      Loaded {num_sources} sources")

    # Parse into turn objects
    print("\n[2/5] Parsing sources into conversation turns...")
    turns = parse_sources(data)
    print(f"      Generated {len(turns)} turn objects")

    # Group by conversation
    print("\n[3/5] Grouping turns by conversation...")
    groups = group_by_conversation(turns)
    print(f"      Found {len(groups)} unique conversations")

    # Compute summary statistics
    print("\n[4/5] Computing summary statistics...")
    stats = compute_summary_stats(turns, groups)

    # Save outputs
    print("\n[5/5] Saving output files...")

    with open(OUTPUT_FILES["conversations"], "w", encoding="utf-8") as f:
        json.dump(turns, f, indent=2, ensure_ascii=False)
    print(f"      Saved: {OUTPUT_FILES['conversations']}")

    # Convert groups dict to list for JSON serialization with conversation metadata
    groups_list = []
    for conv_id, conv_turns in groups.items():
        groups_list.append({
            "conversation_id": conv_id,
            "num_turns": len(conv_turns),
            "num_prompts": len(set(t["turn_index"] for t in conv_turns)),
            "sharing_title": conv_turns[0].get("sharing_title", ""),
            "source_author": conv_turns[0].get("source_author", ""),
            "repo_name": conv_turns[0].get("repo_name", ""),
            "repo_language": conv_turns[0].get("repo_language", ""),
            "timestamp": conv_turns[0].get("timestamp", ""),
            "turns": conv_turns,
        })

    with open(OUTPUT_FILES["groups"], "w", encoding="utf-8") as f:
        json.dump(groups_list, f, indent=2, ensure_ascii=False)
    print(f"      Saved: {OUTPUT_FILES['groups']}")

    with open(OUTPUT_FILES["stats"], "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"      Saved: {OUTPUT_FILES['stats']}")

    # Print summary
    print("\n" + "=" * 60)
    print("PROCESSING COMPLETE — Summary")
    print("=" * 60)
    print(f"  Total turns:           {stats['overview']['total_turns']}")
    print(f"  Developer turns:       {stats['overview']['developer_turns']}")
    print(f"  GPT turns:             {stats['overview']['gpt_turns']}")
    print(f"  Conversations:         {stats['overview']['total_conversations']}")
    print(f"  Unique authors:        {stats['overview']['unique_authors']}")
    print(f"  Unique repos:          {stats['overview']['unique_repos']}")
    print(f"\n  Emotion Distribution (Developer):")
    for emotion, count in sorted(stats["emotion_distribution"]["developer"].items()):
        pct = round(count / stats["overview"]["developer_turns"] * 100, 1)
        print(f"    {emotion:15s}: {count:4d} ({pct:5.1f}%)")
    print(f"\n  Emotion Distribution (GPT):")
    for emotion, count in sorted(stats["emotion_distribution"]["gpt"].items()):
        pct = round(count / stats["overview"]["gpt_turns"] * 100, 1)
        print(f"    {emotion:15s}: {count:4d} ({pct:5.1f}%)")
    print(f"\n  Intent Distribution:")
    for intent, count in sorted(stats["intent_distribution"].items(), key=lambda x: -x[1]):
        print(f"    {intent:15s}: {count:4d}")
    print(f"\n  Complexity Distribution:")
    for comp, count in sorted(stats["complexity_distribution"].items()):
        print(f"    {comp:8s}: {count:4d}")
    print(f"\n  Avg word count — Developer: {stats['word_count_stats']['developer']['mean']}, "
          f"GPT: {stats['word_count_stats']['gpt']['mean']}")
    print(f"  Avg sentiment   — Developer: {stats['sentiment_stats']['developer']['mean']}, "
          f"GPT: {stats['sentiment_stats']['gpt']['mean']}")
    print(f"  Code present in {stats['code_stats']['percentage_with_code']}% of turns")
    print(f"  Questions: {stats['question_stats']['question_percentage']}% of developer prompts")
    print("\n" + "=" * 60)
    print("Output files:")
    for key, path in OUTPUT_FILES.items():
        size_kb = os.path.getsize(path) / 1024
        print(f"  {key:15s}: {path} ({size_kb:.1f} KB)")
    print("=" * 60)


if __name__ == "__main__":
    main()
