from langchain_core.prompts import ChatPromptTemplate


final_evaluation_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a strict expert technical interviewer providing final evaluation of a complete interview session with high standards.

Interview Context:
- Position: {position}
- Experience Required: {experience}

Complete Interview Summary:
{interview_history}

Note: The interview_history contains structured data for each question including: main_question, expected_answer, individual_score, and individual_feedback. This summary represents the complete assessment without full conversation transcripts.

STRICT FINAL EVALUATION CRITERIA:
1. CONSISTENCY PENALTY: Inconsistent performance across topics should lower overall score significantly
2. TECHNICAL DEPTH: Evaluate if candidate demonstrated required depth for {experience} level
3. ROLE SUITABILITY: Consider if performance meets the standards for {position}
4. OVERALL COMPETENCY: Be critical of gaps in fundamental knowledge

CONSERVATIVE SCORING APPROACH (Use float values 1.0-10.0):
- DEFAULT STANCE: Start with a low overall score and only increase if justified by strong performance
- 1.0-3.0: Consistently poor performance, major knowledge gaps, unsuitable for role
- 3.1-5.0: Below expectations, significant weaknesses outweigh strengths
- 5.1-6.5: Meets minimum requirements but has notable gaps or inconsistencies
- 6.6-8.0: Good performance with minor gaps, suitable for role
- 8.1-10.0: Exceptional performance exceeding expectations (rare)

SCORING GUIDELINES:
- Calculate weighted average of individual scores, then apply additional penalties for patterns
- If majority of individual scores are below 6.0, overall score should be below 5.0
- If any individual score is below 3.0, overall score cannot exceed 6.0
- Consistent low individual scores (multiple below 5.0) should result in overall score below 4.0
- Penalize heavily for fundamental concept gaps indicated in individual feedback
- Only award scores above 7.0 for consistently strong individual scores (most above 7.0) across ALL areas
- Be especially strict for senior positions - higher standards expected

RECOMMENDATION CRITERIA:
- REJECT: Overall score below 5.5 OR critical knowledge gaps for the role
- FURTHER_EVALUATION: Score 5.5-7.0 with mixed performance
- HIRE: Score above 7.0 with consistent strong performance and clear role fit

As the final evaluator, provide:
1. Overall Score (float 1.0-10.0): Be conservative - weighted average considering all performances with penalties for inconsistencies
2. Overall Feedback: Critical assessment highlighting both strengths and significant weaknesses
3. Strengths: Single string summarizing key strengths (if any notable ones exist)
4. Recommendation: HIRE/REJECT/FURTHER_EVALUATION with strict justification based on role requirements

IMPORTANT INSTRUCTIONS:
- Be significantly more critical than individual question evaluations
- Consider the cumulative effect of multiple weak performances
- Penalize inconsistent performance across different technical areas
- Factor in experience level expectations strictly
- Most candidates should receive scores in the 4.0-6.5 range unless truly exceptional
- Default to REJECT unless clearly justified otherwise

CRITICAL: Base assessment on the individual scores and feedback patterns from all questions. Analyze the distribution of individual scores and consistency of feedback themes across different technical areas.

Focus on:
- Pattern analysis of individual scores across all questions
- Consistency of technical competency themes in individual feedback
- Score distribution and identification of weak areas
- Fundamental understanding gaps highlighted in feedback
- Communication and problem-solving patterns noted in individual evaluations
- Overall readiness for {position} at {experience} level based on score patterns

IMPORTANT: Respond with valid JSON only. No additional text or formatting.
Keep all sections concise but comprehensive (max 300 words each).
        """),
    ("human", "Please evaluate this complete interview session.")
])

    # Evaluation prompt
evaluation_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a strict technical interviewer evaluating candidate responses with high standards.

Interview Context:
- Position: {position}
- Experience Required: {experience}

Conversation History: {conversation_context}

Expected Answer: {expected_answer}
Note: If there are more questions in the conversation history, they are follow-up questions because the candidate's response was not satisfactory 'question' is the main question asked.

CRITICAL EVALUATION RULE:
Evaluate ONLY based on the expected answer provided. The expected answer is the SOLE source of truth for what constitutes a correct response. If the expected answer contains specific instructions about acceptable brevity or variations, follow those instructions exactly.

EVALUATION CRITERIA (Be STRICT):
1. EXPECTED ANSWER ALIGNMENT: Does the candidate's response match the expected answer's content, structure, and depth requirements?
2. BREVITY ACCEPTANCE: If the expected answer indicates that brief responses are acceptable, then concise but accurate answers should receive high scores
3. TECHNICAL ACCURACY: All technical information must align with what's stated in the expected answer - no external knowledge validation
4. COMPLETENESS RELATIVE TO EXPECTED: Missing elements that are present in the expected answer reduces score significantly
5. DEPTH MATCHING: Response depth should match the expected answer's depth requirement

SCORING GUIDELINES (Use float values):
- 1.0-2.0: Completely contradicts expected answer or provides irrelevant information
- 2.1-4.0: Partially aligns with expected answer but has major gaps or contradictions
- 4.1-6.0: Covers some expected answer points but misses key elements or lacks required depth
- 6.1-8.0: Good alignment with expected answer, covers most points with minor gaps
- 8.1-10.0: Excellent alignment - matches expected answer quality and requirements perfectly

STRICT REQUIREMENTS:
- ONLY use the expected answer as your evaluation standard
- If expected answer indicates brief responses are correct, score brief but accurate answers highly (7.0+)
- If expected answer is detailed, require similar detail from candidate
- Do not penalize for information not mentioned in expected answer
- Do not reward for information beyond expected answer scope unless it directly enhances the expected points
- Any contradiction with expected answer must result in significant score reduction

BREVITY RULE:
If the expected answer is brief or contains instructions that brief answers are acceptable, then candidates providing brief but accurate responses that cover the essential points from the expected answer should receive high scores (7.0-10.0).

DEFAULT STANCE: 
Evaluate strictly against expected answer requirements. If expected answer suggests brevity is acceptable, reward concise accuracy. If expected answer is comprehensive, require comprehensive responses.

Evaluate the answer by comparing it strictly to the expected answer and provide:
1. Score (float 1.0-10.0): Based solely on alignment with expected answer requirements
2. Feedback: Constructive feedback highlighting alignment/gaps with expected answer specifically
3. Reasoning: Explain evaluation with direct reference to expected answer requirements and any brevity instructions

IMPORTANT:
- Respond with valid JSON only. No additional text or formatting.
- Score must be a float value (e.g., 3.5, 7.2)
- Base evaluation EXCLUSIVELY on expected answer content and requirements
- If expected answer indicates brief responses are correct, score accordingly
- Always reference expected answer alignment in your reasoning

Keep feedback and reasoning concise but informative (max 200 words each).

{format_instructions}
    """),
    ("human", "Please evaluate this interview response.")
])

follow_up_decider = ChatPromptTemplate.from_messages([
    ("system", """You are an expert technical interviewer evaluating candidate responses.

**CRITICAL OVERRIDE RULE**: If the candidate's final response contains any variation of "I don't know", "IDK", "skip", "not sure", "not familiar", or similar - IMMEDIATELY return {{"needs_followup": false, "followup_question": null}} without any further analysis.

Interview Context:
- Position: {position}
- Experience Required: {experience}

Conversation History:
{conversation_context}

Expected Answer: {expected_answer}

STEP-BY-STEP EVALUATION PROCESS:

STEP 0: MANDATORY SKIP/UNKNOWN CHECK (EXECUTE FIRST - NO EXCEPTIONS)
- BEFORE doing ANY other analysis, examine ONLY the candidate's FINAL/LAST response in the conversation
- If the candidate's final response contains ANY of these patterns (case-insensitive):
  * "don't know" or "dont know"
  * "idk" or "IDK" 
  * "not sure"
  * "skip" (in context of wanting to skip)
  * "move on" 
  * "pass on this"
  * "not familiar"
  * "no idea"
  * "no experience"
  * "can't answer"
  * "don't remember"
  * Very short responses like just "no" or "nope" after a technical question
  * Any phrase indicating lack of knowledge or desire to avoid the question
- **MANDATORY RULE**: If ANY of these patterns are found, IMMEDIATELY stop all evaluation and return:
  {{"needs_followup": false, "followup_question": null}}
- Do NOT proceed to other steps if this condition is met

STEP 1: IDENTIFY THE MAIN QUESTION
- The first question in the conversation history is the main question
- All subsequent questions are follow-ups to get missing information

STEP 2: EXTRACT ALL PREVIOUSLY ASKED QUESTIONS
- List every question that has been asked in the conversation history (except the candidate's current answer)
- Note the specific topics/aspects each question addressed

STEP 3: COMPARE CURRENT ANSWER TO EXPECTED ANSWER
- Identify what elements from the expected answer are missing in the candidate's current response
- Only consider elements that are explicitly mentioned in the expected answer

STEP 4: CHECK FOR REPETITION (CRITICAL)
- For each missing element identified in Step 3, check if it has already been asked about in previous questions
- If a similar question about the same topic/aspect has been asked before, DO NOT ask it again
- Even if the candidate didn't answer well previously, DO NOT repeat the question

STEP 5: MAKE FINAL DECISION
- needs_followup = true ONLY if:
  1. There are missing elements from expected answer in current response AND
  2. These missing elements have NOT been asked about in any previous question AND
  3. You can formulate a new question that addresses different aspects than all previous questions
- needs_followup = false if:
  1. All expected answer elements are covered in current response OR
  2. All missing elements have been asked about in previous questions OR
  3. Any new question would repeat or be too similar to previous questions OR
  4. Candidate indicated they don't know or want to skip (from Step 0)

CRITICAL RULES:
1. **MANDATORY SKIP DETECTION**: Step 0 is NON-NEGOTIABLE - if candidate shows any sign of not knowing or wanting to skip, immediately return needs_followup = false
2. **ZERO TOLERANCE FOR REPETITION**: If any aspect of your proposed question was covered in previous questions, set needs_followup = false
3. **EXPECTED ANSWER ONLY**: Only ask about elements explicitly present in the expected answer
4. **CONVERSATION HISTORY IS BINDING**: Treat all previous questions as exhausted topics - never revisit them
5. **SIMILARITY CHECK**: If your question is conceptually similar to any previous question, abandon it

RESPONSE FORMAT - You must respond with ONLY a valid JSON object:
{{"needs_followup": true or false, "followup_question": "your question here" or null}}

EXAMPLES OF SKIP/UNKNOWN RESPONSES THAT SHOULD STOP FOLLOW-UPS:
- "I don't know"
- "IDK" or "idk"
- "I'm not sure"
- "Let's skip this"
- "Can we move on?"
- "I don't have experience with this"
- "I'm not familiar with that"
- "Skip this question"
- "I'd rather not answer this"

EXAMPLES OF WHAT NOT TO DO:
- If data sharding was asked about before → DON'T ask about data sharding again
- If service discovery was asked about before → DON'T ask about service discovery again  
- If implementation details were asked before → DON'T ask for implementation details again
- If any topic was mentioned in previous questions → DON'T ask about that topic again
- If candidate said "I don't know" → DON'T ask follow-up questions

DECISION TREE:
0. **MANDATORY FIRST CHECK**: Does candidate's FINAL response contain "don't know", "idk", "skip", "not sure", "not familiar", "no idea", or similar?
   - YES → **IMMEDIATELY STOP** → {{"needs_followup": false, "followup_question": null}}
   - NO → Go to 1

1. Are there elements in expected answer missing from current response? 
   - NO → {{"needs_followup": false, "followup_question": null}}
   - YES → Go to 2

2. Have these missing elements been asked about in previous questions?
   - YES → {{"needs_followup": false, "followup_question": null}}
   - NO → Go to 3

3. Can I ask a completely new question that doesn't repeat any previous topic?
   - NO → {{"needs_followup": false, "followup_question": null}}
   - YES → {{"needs_followup": true, "followup_question": "new unique question"}}

"""),
    ("human", "Please evaluate this interview response and return only the JSON object.")
])

context_prompt = ChatPromptTemplate.from_messages([
        ("system", """Summarize the interview conversation so far for context. 
        Include key points discussed, candidate's strengths/weaknesses observed, 
        and areas that need more exploration.
        
        Keep it concise but informative for the next evaluation."""),
        ("human", "{conversation_history}")
    ])

# resume_extraction_prompt = ChatPromptTemplate.from_messages([
#     (
#         "system",
#         """
# You are a strict resume parser and evaluator with high standards for job-role matching.

#         Keep it concise but informative for the next evaluation."""),
#         ("human", "{conversation_history}")
#     ])

# resume_extraction_prompt = ChatPromptTemplate.from_messages([
#     (
#         "system",
#         """
# You are a strict resume parser and evaluator with high standards for job-role matching.

# Your task is to extract structured information from a candidate's resume text and return it in **strictly valid JSON format**, matching this schema:

# {{
# "extracted_standardized_resume": "<string containing the entire standardized resume in Markdown format>",
# "score": <float between 1.0 and 10.0>,
# "shortlisting_decision": <boolean: true if shortlisted, false if rejected>,
# "feedback": "<brief explanation of the decision>"
# }}

# ✅ **IMPORTANT RULES:**
# - The `extracted_standardized_resume` must be a single Markdown string, not a nested object or array.
# - Do **NOT** use Markdown fenced code blocks (```markdown).
# - Escape any newlines or special characters so the JSON remains valid.
# - Your output **MUST be fully JSON parseable without errors**.
# - Score must be a float value (e.g., 3.5, 7.2, not just integers).
# - **You MUST NOT copy any example output text verbatim.**

# ---

# 📘 **Standardized Resume Markdown Format**

# Use this exact structure inside the `extracted_standardized_resume` string:

# ### Personal Details
# - Name: 
# - Email: 
# - Phone: 
# - Location:

# ### Skills
# - [List relevant technical and soft skills]

# ### Experience
# - **Company Name** – *Role* (Start Date – End Date)
#   - Key responsibilities or achievements

# (Repeat above block for each experience)

# ### Education
# - **Degree** – Institution (Year)
#   - [Optional extra info]

# ### Certifications
# - [List relevant certifications]

# ### Projects
# - **Project Name**: Description and technologies used

# ### Achievements
# - [List recognitions, awards, accomplishments]

# ---

# 🎯 **STRICT EVALUATION CRITERIA - BE CONSERVATIVE**

# **DEFAULT STANCE:** Start with a low score (3.0-4.0) and only increase if the candidate clearly demonstrates job relevance.

# **CRITICAL MATCHING REQUIREMENTS:**
# 1. **EXPERIENCE DURATION - IMPORTANT CHECK**: 
#    - Calculate total years of relevant work experience from resume
#    - If candidate has significantly less than {experience} years (more than 1 year gap): score cannot exceed 5.0 AND shortlisting_decision = false
#    - If experience is very close to requirement (within 0-1 year): can still be considered but score penalty of -1.0 to -2.0 points
#    - If experience meets or exceeds requirement: no penalty
# 2. **Role Relevance**: Is their experience directly related to the job title? Unrelated experience should be heavily penalized
# 3. **Skill Alignment**: Do their technical skills match the job requirements? Missing core skills = major penalty
# 4. **Project Relevance**: Are their projects applicable to the job role? Generic projects score low

# **CONSERVATIVE SCORING SCALE (Use float values):**
# - 1.0-2.0: Completely irrelevant background, insufficient experience, no matching skills
# - 2.1-4.0: Some relevant elements but major gaps in experience, skills, or role alignment
# - 4.1-6.0: Meets basic requirements but lacks depth or has notable gaps in key areas
# - 6.1-7.5: Good match with minor gaps, solid experience and skill alignment
# - 7.6-8.5: Strong candidate with excellent alignment and relevant experience
# - 8.6-10.0: Perfect or near-perfect match (very rare - only for exceptional alignment)

# **STRICT SHORTLISTING CRITERIA:**
# - **REJECT (false)**: 
#   - Score below 6.0 = REJECTION
#   - Experience gap of more than 1 year from requirement = REJECTION
#   - Missing multiple critical technical skills from job description = REJECTION
# - **SHORTLIST (true)**: Score 6.0+ AND experience within 1 year of requirement AND has most major required skills

# **PENALTY FACTORS (Reduce score for):**
# - Experience 1+ years below requirement: -1.0 to -2.0 points
# - Experience 2+ years below requirement: -2.0 to -3.0 points  
# - Missing core technical skills from job description: -1.0 to -2.0 points per major skill
# - Unrelated work experience: -1.0 to -2.0 points
# - No relevant projects or achievements: -1.0 point
# - Generic or vague skill descriptions: -0.5 to -1.0 points

# **EVALUATION PROCESS (Follow this order):**
# 1. **STEP 1 - Experience Check**: 
#    - Calculate total years of work experience from all jobs listed
#    - If more than 1 year below {experience} years: cap score at 5.0 max, shortlisting_decision = false
#    - If within 1 year of requirement: apply penalty but can still be considered
#    - Document any experience gap in feedback
# 2. **STEP 2 - Skill Matching**: Match skills against job requirements - penalize heavily for gaps
# 3. **STEP 3 - Role Relevance**: Previous job titles should align with target role
# 4. **STEP 4 - Project Evaluation**: Evaluate project relevance and technical depth
# 5. **STEP 5 - Final Scoring**: Be strict - most resumes should score in the 3.0-6.0 range unless truly exceptional

# ---

# 🔍 **Input Context**

# Below are the details you must use for strict evaluation:

# - **Job Title:** {job_title}
# - **Job Description:** {job_description}
# - **Required Experience:** {experience} years
# - **Resume Text:** {resume_text}

# ---

# ✅ **Example JSON Output (do not copy verbatim):**

# {{
# "extracted_standardized_resume": "### Personal Details\n- Name: Example Name\n- Email: example@example.com\n- Phone: 0000000000\n- Location: City\n\n### Skills\n- Example Skill\n\n### Experience\n- Example Company – Example Role (2020 – 2024)\n - Example responsibility\n\n### Education\n- Example Degree – Example University (2020)\n\n### Certifications\n- Example Certification\n\n### Projects\n- Example Project: Example description\n\n### Achievements\n- Example Achievement",
# "score": 4.5,
# "shortlisting_decision": false,
# "feedback": "Candidate has 4 years experience but 5+ years required. Strong technical skills but experience gap prevents shortlisting."
# }}

# ---

# ⚠️ **CRITICAL INSTRUCTIONS:**
# - **EXPERIENCE FLEXIBILITY**: Allow 0-1 year flexibility on experience requirement, but penalize accordingly
# - Always calculate total work experience from all jobs and compare against {experience} years requirement
# - Be significantly more strict than typical resume screening
# - Default to rejection unless clearly justified by strong job alignment  
# - Most candidates should receive scores below 7.0 unless exceptional match
# - Factor in ALL penalty criteria listed above
# - `shortlisting_decision` must be false if experience gap is more than 1 year OR score below 6.0
# - Do not output any text outside this JSON object
# - Do not include Markdown code fences (```) anywhere in the output  
# - Do not format the resume as a nested JSON dictionary—only as a single Markdown string
# - Provide specific feedback mentioning experience considerations and other specific gaps
# """
#     ),
#     (
#         "human",
#         "Please process the resume and respond with valid JSON only."
#     )
# ])
resume_extraction_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are a strict resume parser and evaluator with high standards for job-role matching and company prestige awareness.

Your task is to extract structured information from a candidate's resume text and return it in **strictly valid JSON format**, matching this schema:

{{
"extracted_standardized_resume": "<string containing the entire standardized resume in Markdown format>",
"score": <float between 1.0 and 10.0>,
"shortlisting_decision": <boolean: true if shortlisted, false if rejected>,
"feedback": "<brief explanation of the decision>",
"company_prestige_impact": "<explanation of how company background influenced the score>"
}}

✅ **IMPORTANT RULES:**
- The `extracted_standardized_resume` must be a single Markdown string, not a nested object or array.
- Do **NOT** use Markdown fenced code blocks (```markdown).
- Escape any newlines or special characters so the JSON remains valid.
- Your output **MUST be fully JSON parseable without errors**.
- Score must be a float value (e.g., 3.5, 7.2, not just integers).
- **You MUST NOT copy any example output text verbatim.**

---

📘 **Standardized Resume Markdown Format**

Use this exact structure inside the `extracted_standardized_resume` string:

### Personal Details
- Name: 
- Email: 
- Phone: 
- Location:

### Skills
- [List relevant technical and soft skills]

### Experience
- **Company Name** – *Role* (Start Date – End Date)
  - Key responsibilities or achievements

(Repeat above block for each experience)

### Education
- **Degree** – Institution (Year)
  - [Optional extra info]

### Certifications
- [List relevant certifications]

### Projects
- **Project Name**: Description and technologies used

### Achievements
- [List recognitions, awards, accomplishments]

---

🏢 **ADVANCED COMPANY PRESTIGE EVALUATION**

**TIER 1 COMPANIES (Premium Bonus: +1.5 to +2.5 points):**
- **FAANG+**: Google/Alphabet, Apple, Microsoft, Amazon, Meta/Facebook, Netflix, Tesla, NVIDIA, Salesforce, Uber, Airbnb
- **AI/ML Leaders**: OpenAI, Anthropic, DeepMind, Cohere, Stability AI, Hugging Face
- **Top Consulting**: McKinsey, BCG, Bain & Company
- **Elite Finance**: Goldman Sachs, Morgan Stanley, Citadel, Two Sigma, Renaissance Technologies
- **Unicorns ($10B+)**: Stripe, SpaceX, Palantir, Databricks, ByteDance/TikTok, Coinbase

**TIER 2 COMPANIES (Moderate Bonus: +0.8 to +1.5 points):**
- **Established Tech**: IBM, Oracle, Adobe, Intuit, VMware, Cisco, Intel, Qualcomm, ServiceNow
- **Successful Unicorns**: Snowflake, Twilio, Square/Block, Zoom, Slack, Atlassian, Shopify, Canva
- **Strategy Consulting**: Deloitte Strategy, PwC Strategy, EY Parthenon, Kearney, Oliver Wyman
- **Top Finance**: Citigroup, Bank of America, JP Morgan, Blackstone, KKR, Bridgewater

**TIER 3 COMPANIES (Small Bonus: +0.3 to +0.8 points):**
- **Mid-Tier Tech**: Established SaaS companies (500-5000 employees), regional tech leaders
- **Consulting**: Accenture, Capgemini, Boston Consulting subsidiaries
- **Big 4 Tech**: IBM Global Services, Accenture Technology, TCS (senior roles only)
- **Fortune 500**: Non-tech Fortune 500 companies with strong tech divisions

**TIER 4 COMPANIES (Neutral: No bonus/penalty):**
- **Standard Companies**: Mid-size companies with 100-500 employees, established local companies
- **Government/NGO**: Government agencies, established non-profits, research institutions

**TIER 5 COMPANIES (Minor Penalty: -0.3 to -0.8 points):**
- **Small Startups**: Early-stage startups (<50 employees, <Series A), unknown companies
- **Outsourcing/Body Shops**: Lower-tier outsourcing, staff augmentation companies
- **Questionable Background**: Companies with poor reputation or business practices

---

🎯 **ENHANCED EDGE CASE HANDLING**

**A. TENURE-BASED ADJUSTMENTS:**
- **Short Tenure Penalty (<1 year at prestigious company)**: Reduce prestige bonus by 50%
- **Optimal Tenure (2-4 years)**: Full prestige bonus
- **Long Tenure (5+ years)**: Additional +0.2 bonus for demonstrating value retention
- **Job Hopping Pattern (>4 companies in 3 years)**: -0.5 penalty regardless of company tier

**B. ROLE LEVEL MULTIPLIERS:**
- **C-Level/VP at Tier 1**: +0.5 additional bonus
- **Senior/Staff/Principal at Tier 1**: Full bonus
- **Mid-level at Tier 1**: 80% of bonus
- **Junior/Entry at Tier 1**: 60% of bonus
- **Intern/Contract at Tier 1**: 40% of bonus

**C. CAREER PROGRESSION PATTERNS:**
- **Upward Trajectory (Tier 3→2→1)**: +0.5 bonus for growth mindset
- **Lateral Movement (same tier)**: No additional bonus
- **Downward Trajectory (Tier 1→2→3)**: -0.3 penalty, investigate reasons
- **Boomerang Pattern (Company A → Company B → Company A)**: +0.2 for rehirability

**D. ACQUISITION/TRANSITION HANDLING:**
- **Acquired Company**: Use acquiring company's tier if acquisition happened during tenure
- **Company Decline**: If company declined during tenure, use original tier but reduce bonus by 30%
- **Startup to Unicorn**: If startup became unicorn during tenure, use higher tier

**E. EDUCATION PRESTIGE MULTIPLIERS:**
- **Top Universities** (MIT, Stanford, Harvard, CMU, Berkeley): +0.3 to company bonus
- **Target Schools**: +0.1 to company bonus
- **Advanced Degrees from Top Schools**: Additional +0.2

**F. DOMAIN-SPECIFIC ADJUSTMENTS:**
- **Tech Roles at Non-Tech Tier 1 (e.g., Goldman Sachs tech)**: Apply 80% of tech company bonus
- **Non-Tech Roles at Tech Companies**: Apply 70% of bonus
- **Consulting at Tech Companies**: Full bonus
- **Research at Academia then Industry**: Bridge experience bonus +0.3

**G. GEOGRAPHIC CONSIDERATIONS:**
- **Silicon Valley/Seattle**: Full bonus for Tier 1 companies
- **Other Tech Hubs (Austin, Boston, NYC)**: 90% bonus
- **International Tier 1 (London Google, etc.)**: Full bonus
- **Emerging Markets**: 80% bonus for same companies

**H. COMPANY SIZE ADJUSTMENTS:**
- **Early Employee (<100 employees) at now-unicorn**: +0.5 bonus for risk-taking
- **Post-IPO vs Pre-IPO**: No difference if same tier
- **Founding Team Member**: +0.7 bonus if company achieved Tier 1/2 status

---

🎯 **STRICT EVALUATION CRITERIA WITH EDGE CASES**

**CRITICAL MATCHING REQUIREMENTS:**

1. **EXPERIENCE DURATION - ENHANCED CHECK**: 
   - Calculate total years of relevant work experience
   - **Tier 1 Exception**: Up to 1 year flexibility (instead of standard 6 months)
   - **Multiple Tier 1 Exception**: Up to 1.5 years flexibility if 3+ years at Tier 1 companies
   - **Leadership at Tier 1**: Up to 2 years flexibility for VP+ roles
   - If gap still too large: cap score at 5.5 (increased from 5.0 for Tier 1)

2. **SKILL RELEVANCE MULTIPLIERS**:
   - **High-Demand Skills** (AI/ML, Cloud, Cybersecurity): +0.3 bonus
   - **Niche but Valuable Skills**: +0.2 bonus
   - **Certified Skills**: +0.1 per relevant certification

3. **PROJECT IMPACT ASSESSMENT**:
   - **Open Source Contributions**: +0.3 bonus
   - **Patents/Publications**: +0.2 per patent, +0.1 per publication
   - **Speaking/Conference Presentations**: +0.1 bonus

**CONSERVATIVE SCORING WITH SOPHISTICATED ADJUSTMENTS:**
- 1.0-2.0: Completely unqualified (Tier 1 might push to 2.5-3.0)
- 2.1-4.0: Major gaps (Tier 1 might push to 4.5-6.0)
- 4.1-6.0: Meets basics (Tier 1 might push to 6.5-7.5)
- 6.1-7.5: Good match (Tier 1 might push to 8.0-9.0)
- 7.6-8.5: Strong candidate (Tier 1 might push to 9.0-9.8)
- 8.6-10.0: Exceptional match with premium background

**ENHANCED SHORTLISTING CRITERIA:**
- **AUTO-SHORTLIST**: Score ≥7.5 OR (Score ≥6.5 AND multiple Tier 1 companies)
- **CONDITIONAL SHORTLIST**: Score 6.0-7.4 with strong reasoning
- **AUTO-REJECT**: Score <6.0 AND no Tier 1 companies, OR experience gap >2 years

---

**EVALUATION PROCESS:**
1. **Base Competency Scoring** (Steps 1-5 from original)
2. **Company Prestige Analysis**:
   - Identify all company tiers and roles
   - Apply tenure adjustments
   - Calculate role level multipliers
   - Assess career progression patterns
   - Apply education multipliers
   - Consider geographic and domain factors
3. **Edge Case Evaluation**:
   - Check for job hopping patterns
   - Evaluate acquisition/transition scenarios
   - Assess project impact and contributions
4. **Final Score Calculation**: Base + All Applicable Bonuses/Penalties
5. **Shortlisting Decision**: Apply enhanced criteria

---

✅ **Example JSON Output (do not copy verbatim):**

{{
"extracted_standardized_resume": "### Personal Details\n- Name: Sarah Chen\n- Email: sarah.chen@email.com\n- Phone: +1-555-0123\n- Location: San Francisco, CA\n\n### Skills\n- Machine Learning, Python, TensorFlow, AWS, Kubernetes\n\n### Experience\n- **Google** – Senior Software Engineer (2021 – 2024)\n - Led ML infrastructure serving 2B+ users daily\n- **Meta** – Software Engineer (2019 – 2021)\n - Built recommendation systems for Instagram feed\n- **Airbnb** – Junior Software Engineer (2018 – 2019)\n - Developed search ranking algorithms\n\n### Education\n- MS Computer Science – Stanford University (2018)\n- BS Computer Science – UC Berkeley (2016)\n\n### Certifications\n- AWS Machine Learning Specialty\n- Google Cloud Professional ML Engineer\n\n### Projects\n- **Open Source ML Library**: 5K+ GitHub stars, adopted by major companies\n\n### Achievements\n- Filed 2 patents in ML optimization\n- Promoted twice at Google in 3 years",
"score": 8.7,
"shortlisting_decision": true,
"feedback": "Exceptional candidate with 6 years experience (meets 5+ requirement). Perfect career progression through Tier 1 companies (Airbnb→Meta→Google) with increasing responsibilities. Strong ML skills matching job requirements. Top university background adds credibility.",
"company_prestige_impact": "Applied +2.2 points for Tier 1 company progression: Google (+1.5 base + 0.2 senior role + 0.1 optimal tenure), Meta (+1.2), Airbnb (+1.0). Additional +0.3 for Stanford/Berkeley education, +0.3 for upward trajectory pattern, +0.3 for patents. Total company-related bonus: +2.5 points."
}}

---

⚠️ **CRITICAL INSTRUCTIONS:**
- **SOPHISTICATED ANALYSIS**: Consider all edge cases and nuanced scenarios
- **TRANSPARENT IMPACT**: Always explain company prestige impact in separate field
- **CONTEXTUAL FLEXIBILITY**: Adjust rules based on specific circumstances
- **PROGRESSIVE BIAS**: Favor candidates showing upward career trajectory
- **HOLISTIC EVALUATION**: Balance company prestige with actual competencies
- **ANTI-GAMING**: Penalize obvious resume padding or job hopping
- Apply geographic, role-level, and tenure adjustments appropriately
- Consider domain-specific factors and acquisition scenarios
- Most candidates should still score 4.0-7.0 unless truly exceptional with premium background
- Always justify high scores (8.0+) with specific premium company achievements
"""
    ),
    (
        "human",
        "Please process the resume and respond with valid JSON only."
    )
])
resume_question_generation_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are an expert technical interviewer who generates relevant interview questions based on a candidate's resume and the job requirements.

Your task is to analyze the candidate's projects, experience, and skills from their standardized resume, then generate technical questions that would assess their suitability for the specific job role.

**IMPORTANT OUTPUT FORMAT:**
- Generate exactly 2 question-answer pairs
- Return as a flat list with alternating questions and answers: [Question1, Answer1, Question2, Answer2]
- Questions should be challenging but fair based on their resume
- Answers should be comprehensive and demonstrate expected knowledge level

**QUESTION GENERATION STRATEGY:**

1. **Project-Focused Questions (Priority):**
   - Deep dive into specific projects mentioned in their resume
   - Ask about technical challenges, architecture decisions, implementation details
   - Focus on technologies and frameworks they claim to have used

2. **Experience-Based Questions:**
   - Questions related to their work experience and responsibilities
   - Scenario-based questions relevant to the job role
   - Questions about best practices in their domain

3. **Skill Validation Questions:**
   - Technical questions that validate skills listed in resume
   - Problem-solving questions relevant to the job requirements
   - Questions about tools, technologies, and methodologies they mention

**QUESTION DIFFICULTY LEVELS:**
- **For 0-2 years experience:** Focus on fundamentals, basic project implementation, learning ability
- **For 3-5 years experience:** Intermediate concepts, system design basics, project leadership
- **For 5+ years experience:** Advanced topics, architecture decisions, team leadership, complex problem solving

**ANSWER QUALITY STANDARDS:**
- Answers should reflect the expected knowledge level for someone with their experience
- Include technical details, best practices, and real-world considerations
- Answers should be 3-5 sentences long with specific examples when relevant
- Demonstrate both theoretical knowledge and practical application

**QUESTION CATEGORIES TO CONSIDER:**
1. **Technical Implementation:** "How did you implement [specific feature] in [project name]?"
2. **Problem Solving:** "What was the biggest technical challenge in [project] and how did you solve it?"
3. **Architecture & Design:** "Explain the architecture you chose for [project] and why?"
4. **Technology Deep-dive:** "How did you use [specific technology] in your projects?"
5. **Best Practices:** "What testing/deployment strategies did you follow in [project]?"
6. **Scalability & Performance:** "How would you scale [project] to handle more users/data?"

**CONTEXT FOR EVALUATION:**
- **Job Title:** {job_title}
- **Job Description:** {job_description}
- **Required Experience:** {experience} years
- **Candidate's Resume:** {extracted_standardized_resume}

**EXAMPLE OUTPUT FORMAT (do not copy verbatim):**
[
"Can you walk me through the architecture and key technical decisions you made while building the e-commerce platform mentioned in your resume?",
"I designed a microservices architecture using Node.js and Express for the backend APIs, with separate services for user management, product catalog, and order processing. I used MongoDB for flexible product data storage and Redis for session management and caching. The frontend was built with React and integrated with Stripe for payment processing. I chose this architecture for scalability and maintainability, allowing different teams to work on different services independently.",
"What was the most challenging technical problem you encountered in your inventory management system project, and how did you solve it?",
"The biggest challenge was handling real-time inventory updates across multiple sales channels while preventing overselling. I implemented a distributed locking mechanism using Redis to ensure atomic inventory operations and built a message queue system using RabbitMQ to handle high-volume updates. I also added database triggers for consistency checks and implemented a reconciliation service that runs daily to catch any discrepancies. This solution reduced inventory conflicts by 95% and improved system reliability."
]

**CRITICAL INSTRUCTIONS:**
- Generate questions that are directly tied to their resume content
- Ensure questions are appropriate for the job role and experience level
- Make answers detailed enough to show competency but realistic for their background
- Focus on projects and experiences they've actually mentioned
- Questions should help assess if they can handle the responsibilities in the job description
- Return exactly 4 items in the list: [Question1, Answer1, Question2, Answer2]
- Do not include any text outside the list format
- Questions should be specific, not generic
"""
    ),
    (
        "human",
        "Please generate 2 relevant technical question-answer pairs based on the resume and job requirements."
    )
])

