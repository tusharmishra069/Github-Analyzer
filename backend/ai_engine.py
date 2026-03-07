import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from groq import Groq
import json

# ---------------------------------------------------------------------------
# Targeted retrieval queries — each probes a different dimension of quality
# ---------------------------------------------------------------------------
RETRIEVAL_QUERIES = [
    "entry point main application server setup startup routing middleware",
    "database models schema ORM queries migrations data layer",
    "authentication authorization security validation error handling",
    "external API integrations third-party services environment configuration secrets",
    "business logic core algorithms data processing patterns design",
]

# ---------------------------------------------------------------------------
# System prompt — Staff-Engineer-grade review using RSCIT framework
# ---------------------------------------------------------------------------
ANALYSIS_SYSTEM_PROMPT = """You are a Staff Engineer with 15+ years of experience conducting architecture and security reviews at companies like Google, Stripe, and Airbnb. You specialize in identifying production risks, security vulnerabilities, and architectural anti-patterns across any language or framework.

Your reviews are trusted by CTOs because they are:
- Concrete: every finding references a specific file or pattern from the code
- Actionable: every bug has a fix, every improvement has a clear next step
- Calibrated: severity/priority levels are accurate, not inflated
- Honest: you give real grades — a messy codebase gets a D, not a B"""

ANALYSIS_USER_TEMPLATE = """## TASK
Perform a thorough Staff Engineer code review of the codebase segments below.

## CODEBASE CONTEXT
The following chunks were retrieved from multiple files across the repository. Each chunk is labeled with its source file path.

{context}

## ANALYSIS INSTRUCTIONS

Think through the following dimensions before producing output:

1. **Architecture** — What is the overall structure? Is there a clear separation of concerns? Any god objects, circular dependencies, or missing abstraction layers?

2. **Security** — Scan for: hardcoded secrets, SQL/command injection vectors, missing auth checks, insecure defaults, exposed sensitive data in logs or responses.

3. **Reliability** — Look for: missing error handling, unhandled promise rejections, no retry logic, silent failures, race conditions, resource leaks.

4. **Code Quality** — Identify: dead code, duplicated logic, overly complex functions, magic numbers/strings, missing type hints, misleading variable names.

5. **Performance** — Flag: N+1 queries, blocking I/O in async context, missing indexes implied by query patterns, unbounded loops, no pagination.

6. **Tech Stack** — Identify all detected languages, frameworks, and key libraries.

## HEALTH SCORE RUBRIC
- **A+**: Production-ready, clean architecture, no critical issues, strong security posture
- **A**: Minor improvements needed, no critical bugs, good patterns
- **B+**: Some improvements needed, no critical security issues, reasonable structure
- **B**: Several issues, moderate tech debt, needs refactoring
- **C**: Significant problems, some security concerns, notable tech debt
- **D**: Serious bugs and security issues, poor architecture, needs major rework
- **F**: Critical vulnerabilities, broken logic, or fundamentally flawed architecture

## OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown, no explanation, no ```json fences. The JSON must match this exact schema:

{{
  "health_score": "<A+|A|B+|B|C|D|F>",
  "health_reasoning": "<1-2 sentences explaining why this score was given>",
  "tech_stack": ["<framework or library>", "..."],
  "architecture_summary": "<2-3 sentences describing the overall architecture, data flow, and key design decisions>",
  "bugs": [
    {{
      "title": "<concise bug title>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "description": "<specific explanation of the issue and where it occurs>",
      "file_hint": "<filename or pattern where this appears, or 'multiple files'>",
      "fix": "<concrete, actionable fix in 1-2 sentences>"
    }}
  ],
  "improvements": [
    {{
      "title": "<improvement title>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "description": "<specific suggestion with context from the code>",
      "effort": "<Low|Medium|High>"
    }}
  ]
}}

RULES:
- Include 2-6 bugs (only real issues — do not invent bugs not visible in the code)
- Include 3-6 improvements (real architectural or quality suggestions)
- Reference actual file names from the context in bug file_hints
- Do NOT include markdown code fences or any text outside the JSON object"""


class CodeAnalyzer:
    def __init__(self):
        # Fast local embedding model — avoids API costs on large codebases
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def create_vector_store(self, code_documents: list[dict]) -> FAISS:
        """
        Chunks codebase files using code-aware separators and builds a FAISS vector store.
        Larger chunks (1200 tokens) preserve more function/class context per retrieval hit.
        """
        print("Chunking documents...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=150,
            separators=["\nclass ", "\ndef ", "\nfunction ", "\nexport ", "\n\n", "\n", " ", ""]
        )

        docs: list[Document] = []
        for doc in code_documents:
            chunks = text_splitter.split_text(doc["content"])
            for chunk in chunks:
                docs.append(Document(
                    page_content=chunk,
                    metadata={"source": doc["path"]}
                ))

        print(f"Created {len(docs)} chunks. Embedding into FAISS...")
        vectorstore = FAISS.from_documents(documents=docs, embedding=self.embeddings)
        return vectorstore

    def _multi_query_retrieve(self, vectorstore: FAISS, k_per_query: int = 8) -> str:
        """
        Runs multiple targeted retrieval queries to maximize coverage across
        architecture, security, data layer, and business logic dimensions.
        Deduplicates by source+content to avoid redundant context.
        """
        seen: set[str] = set()
        all_chunks: list[str] = []

        for query in RETRIEVAL_QUERIES:
            docs = vectorstore.similarity_search(query, k=k_per_query)
            for doc in docs:
                dedup_key = doc.metadata["source"] + doc.page_content[:120]
                if dedup_key not in seen:
                    seen.add(dedup_key)
                    all_chunks.append(
                        f"### FILE: {doc.metadata['source']}\n{doc.page_content}"
                    )

        print(f"Multi-query retrieval: {len(all_chunks)} unique chunks assembled for LLM context.")
        return "\n\n---\n\n".join(all_chunks)

    def analyze_codebase(self, vectorstore: FAISS) -> dict:
        """
        Runs multi-query RAG retrieval then sends an elite Staff Engineer
        system prompt to Groq for a comprehensive codebase review.
        """
        context = self._multi_query_retrieve(vectorstore, k_per_query=8)

        user_message = ANALYSIS_USER_TEMPLATE.format(context=context)

        print("Querying Groq LLM for deep codebase analysis...")
        chat_completion = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=2048,
        )

        response_text = chat_completion.choices[0].message.content.strip()

        try:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end > start:
                response_text = response_text[start:end]
            result = json.loads(response_text)
            result.setdefault("health_score", "N/A")
            result.setdefault("health_reasoning", "")
            result.setdefault("tech_stack", [])
            result.setdefault("architecture_summary", "")
            result.setdefault("bugs", [])
            result.setdefault("improvements", [])
            return result
        except json.JSONDecodeError:
            print(f"[ai_engine] JSON parse failed. Raw response:\n{response_text[:500]}")
            return {
                "health_score": "N/A",
                "health_reasoning": "Analysis could not be parsed.",
                "tech_stack": [],
                "architecture_summary": "The AI model returned an unparseable response. Please try again.",
                "bugs": [],
                "improvements": [],
            }
