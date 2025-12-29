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


class MatchResult(BaseModel):
    """Output schema for opportunity matching"""
    match_score: float = Field(description="Match score 0-100")
    match_reasons: List[str] = Field(description="Reasons why this opportunity matches")
    skill_gaps: List[str] = Field(description="Skills the user lacks for this role")
    recommendation: str = Field(description="Personalized recommendation")


opportunity_match_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert job matching algorithm. Evaluate how well a candidate matches a job opportunity.

Candidate Profile:
- Skills: {user_skills}
- Experience: {user_experience} years
- Preferences: {user_preferences}

Opportunity:
- Title: {opportunity_title}
- Requirements: {opportunity_requirements}
- Experience Level: {opportunity_experience}
- Type: {opportunity_type}

Evaluate the match by considering:
1. Skill overlap: How many required skills does the candidate have?
2. Experience fit: Does their experience level match?
3. Preference alignment: Does it match their stated preferences?

Provide:
1. Match score (0-100) - be realistic, not everyone is a perfect match
2. Specific reasons why this opportunity is a good match
3. Skills the candidate is missing
4. Personalized recommendation (apply now, gain X skill first, etc.)

{format_instructions}

Score Guidelines:
- 90-100: Excellent match, should apply immediately
- 75-89: Good match, minor gaps
- 60-74: Fair match, some development needed
- Below 60: Significant gaps, focus on skill building first"""),
    ("human", "Evaluate this opportunity match.")
])


class OpportunityMatcher(InterviewManager):
    """Matches opportunities to user profiles"""
    
    def __init__(self, config: InterviewConfig = None):
        super().__init__(
            config=config,
            prompt=opportunity_match_prompt,
            output_parser=JsonOutputParser(pydantic_object=MatchResult)
        )
    
    def evaluate(self, req: dict) -> dict:
        """Evaluate opportunity match for a user"""
        print("\n🎯 Matching opportunity to profile...")
        
        try:
            opportunity = req.get('opportunity', {})
            
            chain = self.prompt | self.llm | self.output_parser
            
            result = chain.invoke({
                "user_skills": str(req.get('user_skills', [])),
                "user_experience": req.get('user_experience', 0),
                "user_preferences": str(req.get('user_preferences', {})),
                "opportunity_title": opportunity.get('title', ''),
                "opportunity_requirements": str(opportunity.get('requirements', {})),
                "opportunity_experience": opportunity.get('experience_level', 'any'),
                "opportunity_type": opportunity.get('type', 'job'),
                "format_instructions": self.output_parser.get_format_instructions()
            })
            
            if isinstance(result, dict):
                return result
            
            return result.dict() if hasattr(result, 'dict') else dict(result)
            
        except Exception as e:
            print(f"Error in opportunity matching: {e}")
            return {
                "match_score": 50,
                "match_reasons": ["Unable to fully analyze match"],
                "skill_gaps": [],
                "recommendation": "Review this opportunity manually."
            }
