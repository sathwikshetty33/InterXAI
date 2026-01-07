import re
import math
from typing import Dict, List, Any, Set

class RecommendationEngine:
    """
    A deterministic, weighted recommendation engine for matching users to opportunities.
    """
    
    def __init__(self):
        # Weights for different components
        self.SKILL_WEIGHT = 0.50
        self.EXPERIENCE_WEIGHT = 0.30
        self.ROLE_WEIGHT = 0.10
        self.PREFERENCE_WEIGHT = 0.10
        
        # Skill level multipliers
        self.LEVEL_MULTIPLIERS = {
            'beginner': 0.6,
            'intermediate': 0.8,
            'advanced': 1.0,
            'expert': 1.2
        }

    def normalize_text(self, text: str) -> str:
        if not text:
            return ""
        return re.sub(r'[^a-z0-9\s]', '', text.lower()).strip()

    def extract_skills_from_text(self, text: str, known_skills: Set[str] = None) -> Set[str]:
        """Simple extraction of skills from text using a known skill list or basic splitting"""
        if not text:
            return set()
            
        normalized_text = text.lower()
        found_skills = set()
        
        # If we have a known list of users skills to check against
        if known_skills:
            for skill in known_skills:
                # Simple word boundary check
                pattern = r'\b' + re.escape(skill.lower()) + r'\b'
                if re.search(pattern, normalized_text):
                    found_skills.add(skill.lower())
        else:
            # Fallback to basic extraction if needed (or just rely on what is passed)
            pass
            
        return found_skills

    def calculate_experience_score(self, user_years: int, req_level: str, req_years: int = None) -> float:
        """Calculate score based on experience match"""
        
        # Map levels to approximate years if req_years not provided
        level_map = {
            'entry': 0,
            'internship': 0,
            'junior': 1,
            'mid': 3,
            'senior': 5,
            'lead': 7,
            'any': 0
        }
        
        target_years = req_years if req_years is not None else level_map.get(req_level.lower(), 0)
        
        if req_level.lower() == 'any':
            return 100.0
            
        if user_years >= target_years:
            # Bonus for slightly more experience, capped at 110%
            excess = user_years - target_years
            return min(100.0 + (excess * 2), 110.0)
        else:
            # Penalize for less experience
            diff = target_years - user_years
            # If gap is huge (e.g. need 5, have 0), score should be low
            penalty = (diff / max(target_years, 1)) * 50
            return max(0.0, 100.0 - penalty)

    def calculate_skill_score(self, user_skills: List[Dict], req_skills: List[str], description: str = "") -> Dict:
        """
        Calculate score based on skill overlap.
        Returns dict with score, matched_skills, missing_skills.
        """
        result = {
            'score': 0.0,
            'matched': [],
            'missing': []
        }
        
        if not user_skills:
            result['missing'] = req_skills
            return result
            
        # Normalize user skills
        u_skills_map = {s.get('skill', '').lower(): s.get('level', 'intermediate') for s in user_skills}
        u_skill_names = set(u_skills_map.keys())
        
        # If requirements are empty, try to extract from description using user's skills
        target_skills = set(s.lower() for s in req_skills)
        if not target_skills and description:
            # Check which of the user's skills appear in the description
            # This is a "reverse" check: "Does the job need what I have?"
            target_skills = self.extract_skills_from_text(description, u_skill_names)
            
        if not target_skills:
            result['score'] = 50.0
            return result

        matched_skills = u_skill_names.intersection(target_skills)
        missing_skills = target_skills - matched_skills
        
        result['matched'] = list(matched_skills)
        result['missing'] = list(missing_skills)
        
        if not target_skills:
             return result
             
        # simplistic coverage score
        coverage = len(matched_skills) / len(target_skills)
        
        # Refine with levels
        weighted_score = 0.0
        for skill in matched_skills:
            level = u_skills_map.get(skill, 'intermediate')
            multiplier = self.LEVEL_MULTIPLIERS.get(level.lower(), 1.0)
            weighted_score += 1.0 * multiplier
            
        # Normalize back to 0-100
        final_score = (weighted_score / len(target_skills)) * 100
        result['score'] = min(final_score, 100.0)
        
        return result

    def calculate_role_match(self, target_roles: List[str], job_title: str) -> float:
        if not target_roles or not job_title:
            return 50.0 # Neutral
            
        job_title = self.normalize_text(job_title)
        
        for role in target_roles:
            role_norm = self.normalize_text(role)
            # Check for substring match or word overlap
            if role_norm in job_title or job_title in role_norm:
                return 100.0
            
            # Word overlap
            role_words = set(role_norm.split())
            job_words = set(job_title.split())
            if role_words.intersection(job_words):
                return 80.0
                
        return 0.0

    def calculate_score(self, user_profile: Dict, opportunity_data: Dict) -> Dict:
        """
        Main method to calculate matching score.
        """
        try:
            # Extract User Data
            u_skills = user_profile.get('skills', [])
            u_exp_years = user_profile.get('experience_years', 0)
            u_roles = user_profile.get('target_roles', [])
            u_prefs = user_profile.get('preferences', {})
            
            # Extract Opportunity Data
            job_title = opportunity_data.get('title', '')
            job_desc = opportunity_data.get('description', '')
            job_type = opportunity_data.get('type', 'job')
            
            job_reqs = opportunity_data.get('requirements', {})
            # Handle if requirements is a dict (from model) or list
            job_skills = []
            if isinstance(job_reqs, dict):
                job_skills = job_reqs.get('skills', [])
            elif isinstance(job_reqs, list):
                job_skills = job_reqs
            
            # Extract required experience
            job_exp_level = opportunity_data.get('experience_level', 'any')
            
            # 1. Experience Score
            exp_score = self.calculate_experience_score(u_exp_years, job_exp_level)
            
            # 2. Skill Score
            skill_result = self.calculate_skill_score(u_skills, job_skills, job_desc)
            skill_score = skill_result['score']
            
            # 3. Role/Title Score
            role_score = self.calculate_role_match(u_roles, job_title)
            
            # 4. Preference Score (Simple boolean checks)
            pref_score = 100.0
            # Check remote
            if u_prefs.get('open_to_remote') and opportunity_data.get('remote'):
                pass # Match
            elif not u_prefs.get('open_to_remote') and opportunity_data.get('remote'):
                # User doesn't want remote but job is remote -> maybe okay?
                pass
            
            # Weighted Total
            total_score = (
                (skill_score * self.SKILL_WEIGHT) +
                (exp_score * self.EXPERIENCE_WEIGHT) +
                (role_score * self.ROLE_WEIGHT) +
                (pref_score * self.PREFERENCE_WEIGHT)
            )
            
            return {
                'match_score': round(total_score, 1),
                'breakdown': {
                    'skill_score': round(skill_score, 1),
                    'experience_score': round(exp_score, 1),
                    'role_score': round(role_score, 1),
                    'preference_score': round(pref_score, 1)
                },
                'matched_skills': skill_result['matched'],
                'missing_skills': skill_result['missing']
            }
            
        except Exception as e:
            print(f"Error in recommendation engine: {e}")
            return {
                'match_score': 0,
                'breakdown': {},
                'matched_skills': [],
                'missing_skills': []
            }
