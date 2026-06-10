# Next.js Emotion Dynamics Dashboard

An interactive, premium web application built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, and custom **D3.js** visualizations. This dashboard analyzes and displays the emotional dynamics, sentiment polarity, and interaction patterns between software developers and ChatGPT, based on the **DevGPT** dataset.

---

## 🚀 Key Features

* **13 Custom D3.js Visualizations**: Handcrafted, interactive, and fully-responsive D3.js charts built directly in React without third-party wrapper chart libraries.
* **Global Filters & State Management**: Seamless filtering across all charts using a global Zustand store. Filter interactions by speaker, emotion category, dialogue complexity, or user intent.
* **4-Tab Narrative Layout**:
  1. **Overview**: KPI cards with animated count-up counters and high-level emotion/sentiment distributions.
  2. **Deep Analysis**: Explores correlations, sentiment patterns, code vs. no-code dialogue impact, and intent-emotion intersections.
  3. **Case Inspector**: Click on individual turns/scatter plots to inspect the full conversation log in an elegant thread viewer with search/sort capabilities.
  4. **Model Quality**: Showcases classification confidence distribution across categories to assess model performance.
* **Robust Data Pipeline**: Raw DevGPT JSON data processed, enriched, and classified using an optimized Python pipeline.

---

## 📊 Included D3.js Visualizations

1. **Emotion Donut**: Double-layered donut chart showcasing Dev vs. GPT emotion distribution.
2. **Emotion Bar Chart**: Grouped horizontal bar chart comparison.
3. **Complexity Comparison Bar**: Dialogue complexity compared side-by-side against emotions.
4. **Interactive Multi-Scatter Plot**: Maps Dev words, GPT words, and code blocks.
5. **Emotion Heatmap**: Visualizes transition mapping from Dev Emotion to GPT response Emotion.
6. **Code Impact Chart**: Highlights differences between turns with code snippets vs. text-only turns.
7. **Correlation Matrix**: Cross-references user intents against expressed emotions.
8. **Interactive Sentiment-Length Scatter Plot**: Clickable points mapping polarity against word count.
9. **Confidence Histogram**: Frequency distributions of emotion classification confidence scores.
10. **Sentiment Distribution**: Beautiful KDE/area chart showing density curves.
11. **Keyword Association**: Stacked horizontal bars mapping keyword frequencies to emotions.
12. **Sentiment Flow/Line Chart**: Sequential polarity changes across turns in threads.
13. **Filtered Donut Details**: Dynamic breakdown of sub-categories.

---

## 🛠️ Tech Stack & Design System

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4 & custom HSL-tailored dark theme
* **State Management**: Zustand
* **Visualizations**: D3.js (v7.9.0)
* **UI Components**: Shadcn UI & Framer Motion for elegant micro-animations

---

## 🗂️ Project Directory Structure

```text
nextjs-emotion-dashboard/
├── src/
│   ├── app/                 # Next.js Pages & Layouts
│   ├── components/
│   │   ├── charts/          # 13 D3.js React Chart Components
│   │   ├── dashboard/       # Dashboard Layout, Sidebar, KPI Cards
│   │   ├── inspector/       # Conversation Viewer & Thread Inspector
│   │   ├── shared/          # Chart Tooltips & Pattern Definitions
│   │   └── ui/              # Radix/Shadcn primitives
│   ├── hooks/               # Custom hooks (e.g., data loading)
│   └── lib/                 # Store, color utils, types, data loaders
├── scripts/                 # GoEmotions classifier & pipeline scripts
└── public/data/             # Preprocessed JSON datasets
```

---

## 🧬 Data Pipeline & Emotion Mapping

Dialogue turns are run through a pure Python pipeline that processes conversations and classifies emotions using the pre-trained Hugging Face **GoEmotions** model (`SamLowe/roberta-base-go_emotions`). 

GoEmotions' 28 categories are programmatically mapped into **6 primary categories** tailored for developer emotional analysis:
* **Joy**: `joy`, `excitement`, `amusement`, `pride`, `optimism`, `relief`
* **Anger**: `anger`, `annoyance`, `disapproval`, `disgust`
* **Sadness**: `sadness`, `disappointment`, `remorse`, `grief`, `embarrassment`
* **Fear**: `fear`, `nervousness`
* **Surprise**: `surprise`, `realization`, `curiosity`
* **Love**: `love`, `caring`, `desire`, `admiration`, `gratitude`, `approval`
* **Neutral**

---

## ⚡ Getting Started

### 1. Requirements
* [Bun](https://bun.sh/) (preferred) or Node.js (v18+)

### 2. Installation
Install dependencies inside the project folder:
```bash
bun install
# or
npm install
```

### 3. Running Development Server
Start the development server:
```bash
bun dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.


