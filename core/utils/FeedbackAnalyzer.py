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


class FeedbackAnalysisResult(BaseModel):
    """Output schema for feedback analysis"""
    analysis: Dict = Field(description="Structured analysis of the feedback")
    severity: str = Field(description="Severity: low, medium, high")
    new_insights: List[Dict] = Field(description="New insights/patterns discovered")


class ReadinessResult(BaseModel):
    """Output schema for readiness assessment"""
    readiness_score: float = Field(description="Overall readiness score 0-100")
    skill_scores: Dict = Field(description="Score breakdown by skill")
    improvements: List[Dict] = Field(description="Recommended improvements")
    ready_to_apply: bool = Field(description="Whether user is ready to apply")
    recommendation: str = Field(description="Overall recommendation")


feedback_analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert career coach analyzing rejection feedback to help candidates improve.

Feedback Type: {feedback_type}
Raw Feedback: {raw_feedback}
Previous Feedback History: {user_history}

Analyze this rejection feedback to:
1. Extract the core reasons for rejection
2. Identify specific skill gaps or issues
3. Determine severity (low: minor adjustments needed, medium: notable gaps, high: significant issues)
4. Generate actionable insights with:
   - type: skill_gap, communication, experience, technical, behavioral, resume, interview
   - title: Brief title of the insight
   - description: Detailed explanation
   - actions: Specific steps to address
   - skills: Related skills affected
   - priority: critical, high, medium, low

Look for patterns across multiple rejections if history is provided.

{format_instructions}

Be constructive and focus on actionable improvements. Every rejection is a learning opportunity."""),
    ("human", "Analyze this rejection feedback.")
])


readiness_assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert career readiness assessor. Evaluate if a candidate is ready to apply for a role.

Target Role: {target_role}
Current Skills: {current_skills}
Skill Assessment Scores: {skill_scores}
Mock Interview Average Score: {mock_interview_avg}
Years of Experience: {experience_years}

Evaluate readiness by considering:
1. Skill coverage for the target role
2. Demonstrated competency through assessments
3. Interview performance
4. Experience level appropriateness

Provide:
1. Overall readiness score (0-100)
2. Breakdown of scores by key skill areas
3. Specific improvements needed with priority
4. Clear recommendation on whether to apply now or prepare more

{format_instructions}

Thresholds:
- 80+: Ready to apply with confidence
- 65-79: Can apply but should continue improving
- 50-64: More preparation recommended
- Below 50: Focus on skill building before applying"""),
    ("human", "Assess readiness for this target role.")
])


class FeedbackAnalyzer(InterviewManager):
    """Analyzes rejection patterns and generates actionable insights"""
    
    def __init__(self, config: InterviewConfig = None):
        super().__init__(
            config=config,
            prompt=feedback_analysis_prompt,
            output_parser=JsonOutputParser(pydantic_object=FeedbackAnalysisResult)
        )
    
    def evaluate(self, req: dict) -> dict:
        """Analyze rejection feedback"""
        print("\n🔬 Analyzing feedback for insights...")
        
        try:
            chain = self.prompt | self.llm | self.output_parser
            
            result = chain.invoke({
                "feedback_type": req.get('feedback_type', ''),
                "raw_feedback": req.get('raw_feedback', 'No specific feedback provided'),
                "user_history": str(req.get('user_history', [])),
                "format_instructions": self.output_parser.get_format_instructions()
            })
            
            if isinstance(result, dict):
                return result
            
            return result.dict() if hasattr(result, 'dict') else dict(result)
            
        except Exception as e:
            print(f"Error in feedback analysis: {e}")
            return {
                "analysis": {"error": "Unable to analyze feedback"},
                "severity": "medium",
                "new_insights": []
            }
    
    def assess_readiness(self, req: dict) -> dict:
        """Assess readiness for a target role"""
        print("\n📋 Assessing job readiness...")
        
        try:
            parser = JsonOutputParser(pydantic_object=ReadinessResult)
            chain = readiness_assessment_prompt | self.llm | parser
            
            result = chain.invoke({
                "target_role": req.get('target_role', ''),
                "current_skills": str(req.get('current_skills', [])),
                "skill_scores": str(req.get('skill_scores', {})),
                "mock_interview_avg": req.get('mock_interview_avg') or 'No mock interviews completed',
                "experience_years": req.get('experience_years', 0),
                "format_instructions": parser.get_format_instructions()
            })
            
            if isinstance(result, dict):
                return result
            
            return result.dict() if hasattr(result, 'dict') else dict(result)
            
        except Exception as e:
            print(f"Error in readiness assessment: {e}")
            return {
                "readiness_score": 0,
                "skill_scores": {},
                "improvements": [],
                "ready_to_apply": False,
                "recommendation": "Unable to assess. Please complete your profile and take some mock interviews."
            }
