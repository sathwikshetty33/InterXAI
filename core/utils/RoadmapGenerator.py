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


class RoadmapResult(BaseModel):
    """Output schema for roadmap generation"""
    current_readiness_score: float = Field(description="Current readiness score 0-100")
    skill_gaps: List[str] = Field(description="List of skills the user needs to develop")
    milestones: List[Dict] = Field(description="List of learning milestones")
    estimated_duration_weeks: int = Field(description="Estimated weeks to complete roadmap")
    reasoning: str = Field(description="Explanation for this roadmap")


class SkillGapResult(BaseModel):
    """Output schema for skill gap analysis"""
    current_readiness: float = Field(description="Current readiness percentage")
    skill_gaps: List[Dict] = Field(description="List of skill gaps with importance")
    strengths: List[str] = Field(description="User's strong skills for the role")
    recommendations: List[str] = Field(description="Specific recommendations")


roadmap_generation_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert career coach and learning path designer. Create a personalized learning roadmap.

Target Role: {target_role}
Current Skills: {current_skills}
Years of Experience: {experience_years}
Education: {education}
Target Readiness Score: {target_readiness}

Create a structured learning roadmap that includes:
1. Assessment of current readiness score (0-100)
2. Specific skill gaps that need to be addressed
3. Milestones with:
   - title: Clear milestone name
   - skills: Skills to learn in this milestone
   - resources: Suggested learning resources (courses, tutorials, projects)
   - duration_weeks: Estimated time to complete
   - status: "pending"
   - priority: "high", "medium", or "low"
4. Total estimated duration in weeks
5. Clear reasoning for why this roadmap was designed this way

{format_instructions}

Be realistic about timelines. Focus on practical skills that directly impact job readiness.
Order milestones by priority and dependency (foundational skills first)."""),
    ("human", "Generate a personalized learning roadmap for this user.")
])


skill_gap_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at analyzing skill gaps for career development.

Target Role: {target_role}
Current Skills: {current_skills}
Years of Experience: {experience_years}

Analyze the gap between current skills and what's required for the target role:
1. Calculate current readiness percentage (0-100)
2. List specific skill gaps with:
   - skill: Name of the skill
   - importance: "critical", "important", or "nice_to_have"
   - current_level: Estimated current level
   - required_level: Required level for the role
3. Identify user's strengths that are valuable for the role
4. Provide specific, actionable recommendations

{format_instructions}

Be honest but encouraging. Focus on actionable gaps that can be addressed."""),
    ("human", "Analyze the skill gaps for this role.")
])


class RoadmapGenerator(InterviewManager):
    """Generates personalized learning roadmaps"""
    
    def __init__(self, config: InterviewConfig = None):
        super().__init__(
            config=config,
            prompt=roadmap_generation_prompt,
            output_parser=JsonOutputParser(pydantic_object=RoadmapResult)
        )
    
    def evaluate(self, req: dict) -> dict:
        """Generate personalized learning roadmap"""
        print("\n🗺️ Generating personalized learning roadmap...")
        
        try:
            chain = self.prompt | self.llm | self.output_parser
            
            result = chain.invoke({
                "target_role": req.get('target_role', ''),
                "current_skills": str(req.get('current_skills', [])),
                "experience_years": req.get('experience_years', 0),
                "education": str(req.get('education', {})),
                "target_readiness": req.get('target_readiness', 80),
                "format_instructions": self.output_parser.get_format_instructions()
            })
            
            if isinstance(result, dict):
                return result
            
            return result.dict() if hasattr(result, 'dict') else dict(result)
            
        except Exception as e:
            print(f"Error in roadmap generation: {e}")
            return {
                "current_readiness_score": 0,
                "skill_gaps": [],
                "milestones": [],
                "estimated_duration_weeks": 12,
                "reasoning": "Unable to generate roadmap. Please try again."
            }
    
    def analyze_skill_gap(self, req: dict) -> dict:
        """Analyze skill gaps for a target role"""
        print("\n📊 Analyzing skill gaps...")
        
        try:
            parser = JsonOutputParser(pydantic_object=SkillGapResult)
            chain = skill_gap_prompt | self.llm | parser
            
            result = chain.invoke({
                "target_role": req.get('target_role', ''),
                "current_skills": str(req.get('current_skills', [])),
                "experience_years": req.get('experience_years', 0),
                "format_instructions": parser.get_format_instructions()
            })
            
            if isinstance(result, dict):
                return result
            
            return result.dict() if hasattr(result, 'dict') else dict(result)
            
        except Exception as e:
            print(f"Error in skill gap analysis: {e}")
            return {
                "current_readiness": 0,
                "skill_gaps": [],
                "strengths": [],
                "recommendations": ["Unable to analyze. Please ensure your profile is complete."]
            }
