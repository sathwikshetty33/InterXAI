import os
import django
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from .BaseAgent import InterviewManager
from .config import InterviewConfig
from langchain_core.prompts import ChatPromptTemplate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()


class ProfileAnalysisResult(BaseModel):
    """Output schema for profile analysis"""
    skills: List[Dict] = Field(description="List of extracted skills with level and source")
    experience_years: int = Field(description="Total years of experience")
    education: Dict = Field(description="Education details")
    certifications: List[str] = Field(description="List of certifications")
    profile_completeness: int = Field(description="Profile completeness score 0-100")
    recommendations: List[str] = Field(description="Recommendations to improve profile")


profile_analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert career analyst. Analyze the candidate's profile information and extract structured data.

Given the following information:
- Resume Text: {resume_text}
- GitHub Username: {github_username}
- LeetCode Username: {leetcode_username}
- Existing Skills: {existing_skills}

Extract and evaluate:
1. All technical and soft skills with proficiency levels (beginner/intermediate/advanced)
2. Total years of experience from work history
3. Education background
4. Any certifications mentioned
5. Profile completeness score (0-100) based on available information
6. Recommendations for improving the profile

{format_instructions}

Be thorough but realistic in your assessment. Only mark skills as "verified: true" if there's clear evidence (projects, experience) supporting the skill level."""),
    ("human", "Please analyze this profile and provide structured output.")
])


class ProfileAnalyzer(InterviewManager):
    """Analyzes user profile, resume, and GitHub to extract skills"""
    
    def __init__(self, config: InterviewConfig = None):
        super().__init__(
            config=config,
            prompt=profile_analysis_prompt,
            output_parser=JsonOutputParser(pydantic_object=ProfileAnalysisResult)
        )
    
    def evaluate(self, req: dict) -> dict:
        """Analyze profile and extract skills"""
        print("\n🔍 Analyzing profile with AI...")
        
        try:
            chain = self.prompt | self.llm | self.output_parser
            
            result = chain.invoke({
                "resume_text": req.get('resume_text', ''),
                "github_username": req.get('github_username', ''),
                "leetcode_username": req.get('leetcode_username', ''),
                "existing_skills": str(req.get('existing_skills', [])),
                "format_instructions": self.output_parser.get_format_instructions()
            })
            
            if isinstance(result, dict):
                return result
            
            return result.dict() if hasattr(result, 'dict') else dict(result)
            
        except Exception as e:
            print(f"Error in profile analysis: {e}")
            return {
                "skills": [],
                "experience_years": 0,
                "education": {},
                "certifications": [],
                "profile_completeness": 0,
                "recommendations": ["Please add more information to your profile"]
            }
