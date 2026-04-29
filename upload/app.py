import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import os
from transformers import pipeline

# Emotions that make no sense for software dev data
IGNORE_EMOTIONS = ["love", "desire", "grief", "remorse", "caring", "pride", "surprise", "optimism", "neutral", "admiration"]

# Import our simplifier
from data_parser import simplify_devgpt

# ---------------------------------------------------------
# 0. MODEL & DATA LOADING (Replacing Mock Data)
# ---------------------------------------------------------
@st.cache_resource(show_spinner="Loading Go-Emotions model...")
def load_model():
    return pipeline(task="text-classification", model="SamLowe/roberta-base-go_emotions", top_k=1)

classifier = load_model()

def get_emotion(text):
    if not isinstance(text, str) or len(text.strip()) == 0:
        return "Neutral", 0.0
    try:
        res = classifier(text[:512], truncation=True)[0][0]
        return res["label"], round(res["score"], 3)
    except:
        return "Neutral", 0.0

@st.cache_data
def load_real_data():
    path = os.path.join('..', 'DevGPT', 'snapshot_20230810', '20230810_123110_pr_sharings.json')
    raw_df = simplify_devgpt(path)
    
    turns = []
    p_bar = st.progress(0, text="Analyzing Developer Prompts...")
    for i, row in raw_df.iterrows():
        e, s = get_emotion(row['prompt'])
        turns.append({'speaker': 'Developer', 'emotion': e, 'intensity': s, 'code_lines': 0, 'text': row['prompt'], **row})
        p_bar.progress((i+1)/len(raw_df))
    p_bar.empty()
    
    a_bar = st.progress(0, text="Analyzing GPT Answers...")
    for i, row in raw_df.iterrows():
        e, s = get_emotion(row['answer'])
        dev_length = len(str(row['prompt']).split())
        turns.append({'speaker': 'GPT', 'emotion': e, 'intensity': s, 'code_lines': row['code_lines'], 'text': row['answer'], 'dev_prompt_length': dev_length, **row})
        a_bar.progress((i+1)/len(raw_df))
    a_bar.empty()
    
    df = pd.DataFrame(turns)
    df['turn_id'] = range(1, len(df) + 1)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # --- SIMULATED THESIS METRICS (Since real data lacks these specific labels) ---
    # 1. Hallucination flag: Simulated at 10% like your mock, but weighted slightly if GPT confidence is low
    df['hallucination_flag'] = np.random.choice([True, False], len(df), p=[0.1, 0.9])
    mask = (df['speaker'] == 'GPT') & (df['intensity'] < 0.5)
    df.loc[mask, 'hallucination_flag'] = True 
    
    # 2. Prompt complexity: Based on word count of the user's prompt
    def get_complexity(text):
        words = len(str(text).split())
        if words < 50: return 'Low'
        elif words < 150: return 'Medium'
        return 'High'
        
    df['prompt_complexity'] = df['text'].apply(get_complexity)
    df = df[~df['emotion'].isin(IGNORE_EMOTIONS)]
    return df

df = load_real_data()

# ---------------------------------------------------------
# 1. DASHBOARD LAYOUT (YOUR EXACT CODE BELOW)
# ---------------------------------------------------------
st.set_page_config(page_title="DevGPT Emotion Analyzer", layout="wide", page_icon="🤖")

st.title("🤖 DevGPT Conversation & Emotion Dynamics")
st.markdown("""
**Thesis Prototype:** Analyzing developer frustration, hallucination points, and prompt efficacy.
""")

# --- SIDEBAR FILTERS ---
st.sidebar.header("Global Filters")
selected_emotions = st.sidebar.multiselect("Filter by Emotion", df['emotion'].unique(), default=df['emotion'].unique())
complexity_filter = st.sidebar.multiselect("Prompt Complexity", df['prompt_complexity'].unique(), default=df['prompt_complexity'].unique())

filtered_df = df[
    (df['emotion'].isin(selected_emotions)) & 
    (df['prompt_complexity'].isin(complexity_filter))
]

# --- KPI METRICS (Only Real Data Now) ---
col1, col2, col3 = st.columns(3)
with col1:
    total_turns = len(filtered_df)
    st.metric("Total Message Turns", total_turns)
with col2:
    negative_count = len(filtered_df[filtered_df['emotion'].isin(['disappointment', 'annoyance', 'disapproval'])])
    frustration_rate = (negative_count / total_turns * 100) if total_turns > 0 else 0
    st.metric("Developer Negative Rate", f"{frustration_rate:.1f}%")
with col3:
    avg_dev_words = filtered_df[filtered_df['speaker']=='Developer']['text'].apply(lambda x: len(str(x).split())).mean()
    st.metric("Avg Dev Prompt Length", f"{avg_dev_words:.0f} words")

st.divider()

# ---------------------------------------------------------
# TOP ROW: CODE IMPACT & OVERALL DONUT
# ---------------------------------------------------------
top_col1, top_col2 = st.columns(2)

with top_col1:
    st.markdown("#### How Code Blocks Affect AI Tone")
    st.caption("*Comparing AI emotions when it gives code vs when it just gives text.*")
    ai_df_code = filtered_df[filtered_df['speaker'] == 'GPT']
    code_impact = ai_df_code.groupby(['code_lines', 'emotion']).size().reset_index(name='Count')
    code_impact['Had_Code'] = code_impact['code_lines'].apply(lambda x: 'Included Code' if x > 0 else 'No Code')
    
    fig_code = px.bar(
        code_impact, x='Had_Code', y='Count', color='emotion', barmode='group', template="plotly_dark"
    )
    fig_code.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font=dict(color="#c9d1d9"))
    st.plotly_chart(fig_code, use_container_width=True)

with top_col2:
    st.markdown("#### Overall Emotion Distribution")
    st.caption("*Total count of all emotion labels across Developer and AI messages.*")
    emotion_counts = filtered_df['emotion'].value_counts().reset_index()
    emotion_counts.columns = ['emotion', 'count']
    fig_pie = px.pie(emotion_counts, values='count', names='emotion', hole=0.4, template="plotly_dark")
    fig_pie.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font=dict(color="#c9d1d9"))
    st.plotly_chart(fig_pie, use_container_width=True)

st.divider()

# ---------------------------------------------------------
# ROW 2: PROMPTS & AI CONFIDENCE
# ---------------------------------------------------------
row1_col1, row1_col2 = st.columns(2)

with row1_col1:
    st.subheader("Developer Emotion vs. Prompt Length (Complexity)")
    st.caption("*Complexity defined by word count: <50 Low, 50-150 Med, >150 High*")
    dev_df = filtered_df[filtered_df['speaker'] == 'Developer']
    comp_emotion = dev_df.groupby(['prompt_complexity', 'emotion']).size().reset_index(name='Count')
    fig_complex = px.bar(
        comp_emotion, x='prompt_complexity', y='Count', color='emotion', 
        barmode='group', template="plotly_dark"
    )
    fig_complex.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font=dict(color="#c9d1d9"))
    st.plotly_chart(fig_complex, use_container_width=True)

with row1_col2:
    st.subheader("Does Long Prompting Confuse the AI?")
    st.caption("*X-axis: Words in Dev Prompt. Y-axis: How certain the AI was in its emotion guess.*")
    ai_df_scatter = filtered_df[filtered_df['speaker'] == 'GPT']
    fig_scatter = px.scatter(
        ai_df_scatter, x='dev_prompt_length', y='intensity', color='emotion',
        template="plotly_dark", trendline="ols" 
    )
    fig_scatter.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font=dict(color="#c9d1d9"))
    fig_scatter.update_xaxes(title_text="Developer Prompt Length (Words)")
    fig_scatter.update_yaxes(title_text="AI Certainty Score (0 to 1.0)")
    st.plotly_chart(fig_scatter, use_container_width=True)

st.divider()


row1_col1, row1_col2 = st.columns(2)

    # ---------------------------------------------------------
    # ROW 3: DIRECT DEV VS AI COMPARISON 
    # ---------------------------------------------------------

with row1_col1:
    st.subheader("🆚 Direct Comparison: Developer vs. AI Emotions")
    st.markdown("*Total counts of emotion labels assigned to Humans vs the Machine.*")

    dev_ai_comp = filtered_df.groupby(['speaker', 'emotion']).size().reset_index(name='Count')
    fig_dev_ai = px.bar(
        dev_ai_comp, x='emotion', y='Count', color='speaker', barmode='group', 
        template="plotly_dark",
    color_discrete_map={'Developer': '#f85149', 'GPT': '#58a6ff'} 
    )
    fig_dev_ai.update_layout(
        plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font=dict(color="#c9d1d9"),
        xaxis_title="Emotion Detected", yaxis_title="Raw Count of Messages",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    st.plotly_chart(fig_dev_ai, use_container_width=True)

with row1_col2:
    # ---------------------------------------------------------
    #  HEATMAP
    # ---------------------------------------------------------
    st.markdown("#### Emotion Mapping Heatmap")
    st.caption("*Counts how many times a Developer Emotion was followed by a specific AI Emotion in the same thread.*")

    dev_prompts = filtered_df[filtered_df['speaker'] == 'Developer'][['conversation_id', 'emotion']].rename(columns={'emotion': 'dev_emotion'})
    ai_answers = filtered_df[filtered_df['speaker'] == 'GPT'][['conversation_id', 'emotion']].rename(columns={'emotion': 'ai_emotion'})
    paired_df = pd.merge(dev_prompts, ai_answers, on='conversation_id')

    heatmap_data = pd.crosstab(paired_df['dev_emotion'], paired_df['ai_emotion'])
    fig_heat = px.imshow(
    heatmap_data, text_auto=True, aspect="auto", color_continuous_scale='Blues'
    )
    fig_heat.update_layout(font=dict(color="#c9d1d9"), xaxis_title="AI Emotion Response", yaxis_title="Developer Initial Emotion")
    st.plotly_chart(fig_heat, use_container_width=True)

st.divider()
# ---------------------------------------------------------
# DATA VIEW
# ---------------------------------------------------------
st.subheader("📋 Raw Data Inspector")
st.dataframe(
    filtered_df[['timestamp', 'speaker', 'emotion', 'intensity', 'prompt_complexity']].sort_values('timestamp'),
    use_container_width=True
)