"""
Coding Question Generator using Groq/LangChain

Generates full coding questions from vague topics.
"""
import os
from django.conf import settings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate


def generate_coding_question(topic: str, post_title: str = None) -> dict:
    """
    Generate a complete coding question from a topic or vague description.
    
    Args:
        topic: The topic or vague description (e.g., "langchain", "binary search", "API integration")
        post_title: The job post title for context
    
    Returns:
        dict with 'question' (full problem statement) and 'is_generated' (bool)
    """
    # Check if topic is already a full question (more than 100 characters with proper structure)
    if len(topic) > 150 and ('input' in topic.lower() or 'output' in topic.lower() or 'example' in topic.lower()):
        return {
            'question': topic,
            'is_generated': False
        }
    
    groq_api_key = settings.GROQ_API_KEY
    if not groq_api_key:
        # If no API key, return the original topic as-is
        return {
            'question': topic,
            'is_generated': False
        }
    
    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2000,
            groq_api_key=groq_api_key
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert technical interview question creator. 
Given a topic or concept, create a complete, well-structured coding problem suitable for a technical interview.

The question should include:
1. **Problem Statement**: Clear description of what needs to be solved
2. **Input Format**: What input the solution should accept
3. **Output Format**: What the solution should return
4. **Constraints**: Any limitations or boundaries
5. **Examples**: 2-3 example inputs and outputs
6. **Hints** (optional): A subtle hint if the problem is complex

Make the difficulty appropriate for a junior to mid-level developer interview.
Format the question in clean markdown."""),
            ("human", """Create a coding interview question for the following:

Topic/Concept: {topic}
{context}

Generate a complete, professional coding question.""")
        ])
        
        context = f"Job Position: {post_title}" if post_title else ""
        
        chain = prompt | llm
        response = chain.invoke({
            "topic": topic,
            "context": context
        })
        
        generated_question = response.content.strip()
        
        return {
            'question': generated_question,
            'is_generated': True
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to generate question: {e}")
        # Return original topic on failure
        return {
            'question': topic,
            'is_generated': False
        }
