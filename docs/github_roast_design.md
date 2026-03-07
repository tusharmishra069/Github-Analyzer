# GitHub Profile Brutal Roast Feature Design
## Understanding Lock
*   **What is being built:** A "brutal roast" feature where users paste a GitHub profile URL and receive a highly critical, AI-generated roast.
*   **Why it exists:** To create a fun, engaging, and highly shareable social feature.
*   **Who it is for:** Developers who want a funny, brutal critique of their own (or others') GitHub profiles.
*   **Key constraints:** Public GitHub data only, managed AI response time, exportable UI.

## Decision Log
1. **Scope:** Option C (Comprehensive roast using stats, language choices, and repo quality). 
   * *Why:* Provides the most personalized and entertaining output.
2. **Tone:** Sarcastic, witty, unapologetic passive-aggressive. 
   * *Why:* Fits the "brutal roast" theme best without being overly toxic.
3. **Visual Style:** GitHub-themed (Dark mode, GitHub fonts, green/grey accents). 
   * *Why:* Makes the roast feel authentic and ironic.
4. **Architecture:** Backend-orchestrated (Approach B). 
   * *Why:* Cleaner frontend, centralized error handling for GitHub/AI APIs, better security for tokens.

## Non-Functional Requirements
*   **Performance:** 5-10s generation time, handled with a fun custom loading animation.
*   **Reliability:** Graceful error handling for GitHub API and AI provider rate limits.
*   **Security:** Only public GitHub data; no user tokens required or stored.

