import re
import math
from typing import Dict, List, Any, Set, Tuple
from collections import defaultdict, deque

class SkillGraph:
    """Graph structure to represent skill relationships and hierarchy"""
    
    def __init__(self):
        self.graph = defaultdict(set)
        self.skill_categories = {}
        self.skill_levels = {}
        self._build_default_graph()
    
    def _build_default_graph(self):
        """Build a default skill relationship graph"""
        # Programming languages and their relationships
        relationships = [
            # Python ecosystem
            ('python', 'django'), ('python', 'flask'), ('python', 'fastapi'),
            ('python', 'pandas'), ('python', 'numpy'), ('python', 'machine learning'),
            
            # JavaScript ecosystem
            ('javascript', 'react'), ('javascript', 'vue'), ('javascript', 'angular'),
            ('javascript', 'node.js'), ('javascript', 'express'), ('javascript', 'typescript'),
            ('typescript', 'react'), ('typescript', 'angular'),
            
            # Java ecosystem
            ('java', 'spring'), ('java', 'spring boot'), ('java', 'hibernate'),
            
            # Databases
            ('sql', 'postgresql'), ('sql', 'mysql'), ('sql', 'oracle'),
            ('nosql', 'mongodb'), ('nosql', 'cassandra'), ('nosql', 'redis'),
            
            # DevOps
            ('devops', 'docker'), ('devops', 'kubernetes'), ('devops', 'jenkins'),
            ('devops', 'terraform'), ('cloud', 'aws'), ('cloud', 'azure'), ('cloud', 'gcp'),
            
            # Data Science
            ('machine learning', 'tensorflow'), ('machine learning', 'pytorch'),
            ('machine learning', 'deep learning'), ('data science', 'machine learning'),
            
            # Web
            ('frontend', 'html'), ('frontend', 'css'), ('frontend', 'javascript'),
            ('backend', 'api'), ('backend', 'database'),
        ]
        
        for parent, child in relationships:
            self.add_edge(parent, child)
    
    def add_edge(self, parent: str, child: str):
        """Add a directed edge from parent to child skill"""
        self.graph[parent.lower()].add(child.lower())
    
    def get_related_skills(self, skill: str, depth: int = 2) -> Set[str]:
        """Get all related skills within specified depth using BFS"""
        skill = skill.lower()
        if skill not in self.graph:
            return set()
        
        related = set()
        queue = deque([(skill, 0)])
        visited = {skill}
        
        while queue:
            current, current_depth = queue.popleft()
            if current_depth >= depth:
                continue
            
            for neighbor in self.graph[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    related.add(neighbor)
                    queue.append((neighbor, current_depth + 1))
        
        return related
    
    def calculate_skill_distance(self, skill1: str, skill2: str) -> float:
        """Calculate distance between two skills (0 = same, 1 = related, 2+ = unrelated)"""
        skill1, skill2 = skill1.lower(), skill2.lower()
        
        if skill1 == skill2:
            return 0.0
        
        # BFS to find shortest path
        queue = deque([(skill1, 0)])
        visited = {skill1}
        
        while queue:
            current, dist = queue.popleft()
            if dist > 3:  # Max search depth
                break
            
            for neighbor in self.graph[current]:
                if neighbor == skill2:
                    return dist + 1.0
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))
        
        return 5.0  # Unrelated


class AdvancedRecommendationEngine:
    """
    Sophisticated recommendation engine with graph-based skill analysis,
    semantic matching, and proper score normalization.
    """
    
    def __init__(self):
        # Component weights (must sum to 1.0)
        self.SKILL_WEIGHT = 0.45
        self.EXPERIENCE_WEIGHT = 0.25
        self.ROLE_WEIGHT = 0.15
        self.SKILL_DEPTH_WEIGHT = 0.10
        self.PREFERENCE_WEIGHT = 0.05
        
        # Skill level multipliers (normalized)
        self.LEVEL_MULTIPLIERS = {
            'beginner': 0.5,
            'intermediate': 0.75,
            'advanced': 0.9,
            'expert': 1.0
        }
        
        # Initialize skill graph
        self.skill_graph = SkillGraph()
        
        # Scoring thresholds
        self.MIN_SCORE = 0.0
        self.MAX_SCORE = 100.0
    
    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        return re.sub(r'[^a-z0-9\s+#]', '', text.lower()).strip()
    
    def extract_ngrams(self, text: str, n: int = 2) -> Set[str]:
        """Extract n-grams from text for fuzzy matching"""
        words = text.split()
        ngrams = set()
        for i in range(len(words) - n + 1):
            ngrams.add(' '.join(words[i:i+n]))
        return ngrams
    
    def fuzzy_match_score(self, text1: str, text2: str) -> float:
        """Calculate fuzzy match score between two texts using n-grams"""
        text1 = self.normalize_text(text1)
        text2 = self.normalize_text(text2)
        
        if text1 == text2:
            return 1.0
        
        if not text1 or not text2:
            return 0.0
        
        # Word-level Jaccard similarity
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        if not union:
            return 0.0
        
        jaccard = len(intersection) / len(union)
        
        # Bigram similarity
        bigrams1 = self.extract_ngrams(text1, 2)
        bigrams2 = self.extract_ngrams(text2, 2)
        
        if bigrams1 and bigrams2:
            bigram_intersection = bigrams1.intersection(bigrams2)
            bigram_union = bigrams1.union(bigrams2)
            bigram_sim = len(bigram_intersection) / len(bigram_union) if bigram_union else 0
        else:
            bigram_sim = 0
        
        # Weighted combination
        return (0.6 * jaccard + 0.4 * bigram_sim)
    
    def calculate_experience_score(self, user_years: int, req_level: str, 
                                   req_years: int = None) -> float:
        """
        Calculate experience match score with proper normalization.
        Returns score between 0-100.
        """
        level_map = {
            'entry': 0,
            'internship': 0,
            'junior': 1,
            'mid': 3,
            'senior': 5,
            'lead': 7,
            'staff': 8,
            'principal': 10,
            'any': 0
        }
        
        target_years = req_years if req_years is not None else level_map.get(
            req_level.lower(), 0
        )
        
        if req_level.lower() == 'any':
            return 100.0
        
        # Perfect match range
        if target_years <= user_years <= target_years + 2:
            return 100.0
        
        # Slightly more experience is good
        if user_years > target_years + 2:
            excess = user_years - (target_years + 2)
            # Diminishing returns for overqualification
            score = 100.0 - (excess * 3)  # -3 points per excess year
            return max(score, 60.0)  # Floor at 60 for overqualified
        
        # Less experience
        gap = target_years - user_years
        if gap <= 1:
            return 85.0  # Close enough
        else:
            # Steep penalty for large gaps
            score = 100.0 - (gap * 20)
            return max(score, 0.0)
    
    def calculate_skill_score(self, user_skills: List[Dict], 
                             req_skills: List[str], 
                             description: str = "") -> Dict:
        """
        Advanced skill matching with graph-based relationships and fuzzy matching.
        """
        result = {
            'score': 0.0,
            'matched': [],
            'partial_matched': [],
            'missing': [],
            'related': []
        }
        
        if not user_skills:
            result['missing'] = req_skills
            return result
        
        # Normalize user skills
        u_skills_map = {}
        for s in user_skills:
            skill_name = self.normalize_text(s.get('skill', ''))
            if skill_name:
                u_skills_map[skill_name] = s.get('level', 'intermediate')
        
        u_skill_names = set(u_skills_map.keys())
        
        # Normalize required skills
        target_skills = [self.normalize_text(s) for s in req_skills if s]
        
        if not target_skills and not description:
            result['score'] = 50.0
            return result
        
        if not target_skills:
            target_skills = []
        
        # Score components
        exact_matches = []
        fuzzy_matches = []
        related_matches = []
        missing_skills = []
        
        for req_skill in target_skills:
            matched = False
            best_fuzzy_score = 0.0
            best_fuzzy_match = None
            
            # 1. Check exact match
            if req_skill in u_skill_names:
                exact_matches.append(req_skill)
                matched = True
            else:
                # 2. Check fuzzy match
                for u_skill in u_skill_names:
                    fuzzy_score = self.fuzzy_match_score(req_skill, u_skill)
                    if fuzzy_score > 0.7:  # Threshold for fuzzy match
                        if fuzzy_score > best_fuzzy_score:
                            best_fuzzy_score = fuzzy_score
                            best_fuzzy_match = u_skill
                
                if best_fuzzy_match:
                    fuzzy_matches.append((req_skill, best_fuzzy_match, best_fuzzy_score))
                    matched = True
                else:
                    # 3. Check graph-based relationships
                    related = self.skill_graph.get_related_skills(req_skill, depth=2)
                    user_related = u_skill_names.intersection(related)
                    if user_related:
                        related_matches.append((req_skill, list(user_related)))
                        matched = True
            
            if not matched:
                missing_skills.append(req_skill)
        
        # Calculate score
        if not target_skills:
            result['score'] = 50.0
            return result
        
        total_req = len(target_skills)
        
        # Weighted scoring
        exact_score = len(exact_matches) / total_req
        fuzzy_score = sum(score for _, _, score in fuzzy_matches) / total_req
        related_score = (len(related_matches) * 0.5) / total_req  # 50% credit for related
        
        # Apply skill level multipliers for exact matches
        level_bonus = 0.0
        for skill in exact_matches:
            level = u_skills_map.get(skill, 'intermediate')
            multiplier = self.LEVEL_MULTIPLIERS.get(level.lower(), 0.75)
            level_bonus += (multiplier - 0.75) / total_req  # Bonus above intermediate
        
        # Combine scores
        raw_score = (exact_score * 1.0 + fuzzy_score * 0.8 + related_score * 0.5 + level_bonus)
        
        # Normalize to 0-100 with proper ceiling
        final_score = min(raw_score * 100, 100.0)
        
        result['score'] = final_score
        result['matched'] = exact_matches
        result['partial_matched'] = [(req, match, score) for req, match, score in fuzzy_matches]
        result['missing'] = missing_skills
        result['related'] = related_matches
        
        return result
    
    def calculate_skill_depth_score(self, user_skills: List[Dict]) -> float:
        """
        Calculate score based on skill breadth and depth.
        Rewards having multiple related skills in the same domain.
        """
        if not user_skills:
            return 0.0
        
        # Count skills by category/domain
        domain_counts = defaultdict(int)
        
        for skill in user_skills:
            skill_name = self.normalize_text(skill.get('skill', ''))
            related = self.skill_graph.get_related_skills(skill_name, depth=1)
            
            # Increment count for this domain
            domain_counts[skill_name] += 1
            for rel in related:
                domain_counts[rel] += 0.5  # Partial credit for related
        
        if not domain_counts:
            return 50.0
        
        # Calculate diversity and depth
        total_skills = len(user_skills)
        unique_domains = len(domain_counts)
        max_domain_depth = max(domain_counts.values())
        
        # Balance between breadth and depth
        breadth_score = min(unique_domains / 10.0, 1.0) * 50  # Up to 50 points for breadth
        depth_score = min(max_domain_depth / 5.0, 1.0) * 50  # Up to 50 points for depth
        
        return breadth_score + depth_score
    
    def calculate_role_match(self, target_roles: List[str], job_title: str, 
                            job_description: str = "") -> float:
        """
        Calculate role match with fuzzy matching and description analysis.
        """
        if not target_roles or not job_title:
            return 50.0
        
        job_title_norm = self.normalize_text(job_title)
        best_score = 0.0
        
        for role in target_roles:
            role_norm = self.normalize_text(role)
            
            # Fuzzy match on title
            fuzzy_score = self.fuzzy_match_score(role_norm, job_title_norm)
            
            # Check description if available
            if job_description and fuzzy_score < 0.8:
                desc_norm = self.normalize_text(job_description)
                if role_norm in desc_norm:
                    fuzzy_score = max(fuzzy_score, 0.7)
            
            best_score = max(best_score, fuzzy_score)
        
        return min(best_score * 100, 100.0)
    
    def calculate_preference_score(self, user_prefs: Dict, 
                                   opportunity: Dict) -> float:
        """Calculate preference match with proper weighting"""
        score = 100.0
        checks = 0
        
        # Remote preference
        if 'open_to_remote' in user_prefs:
            checks += 1
            if user_prefs['open_to_remote'] == opportunity.get('remote', False):
                pass  # No penalty for match
            elif not user_prefs['open_to_remote'] and opportunity.get('remote'):
                score -= 20  # Penalty if job is remote but user doesn't want it
        
        # Location preference
        if 'preferred_locations' in user_prefs and opportunity.get('location'):
            checks += 1
            job_loc = self.normalize_text(opportunity['location'])
            pref_locs = [self.normalize_text(loc) for loc in user_prefs['preferred_locations']]
            
            if any(fuzzy_match_score(job_loc, pref_loc) > 0.8 for pref_loc in pref_locs):
                pass  # Match
            else:
                score -= 15
        
        # Job type preference (full-time, contract, etc.)
        if 'job_type' in user_prefs and opportunity.get('employment_type'):
            checks += 1
            if user_prefs['job_type'].lower() == opportunity['employment_type'].lower():
                pass
            else:
                score -= 10
        
        return max(score, 0.0)
    
    def calculate_score(self, user_profile: Dict, opportunity_data: Dict) -> Dict:
        """
        Main scoring method with proper normalization ensuring score never exceeds 100.
        """
        try:
            # Extract user data
            u_skills = user_profile.get('skills', [])
            u_exp_years = user_profile.get('experience_years', 0)
            u_roles = user_profile.get('target_roles', [])
            u_prefs = user_profile.get('preferences', {})
            
            # Extract opportunity data
            job_title = opportunity_data.get('title', '')
            job_desc = opportunity_data.get('description', '')
            job_reqs = opportunity_data.get('requirements', {})
            
            # Handle requirements format
            job_skills = []
            if isinstance(job_reqs, dict):
                job_skills = job_reqs.get('skills', [])
            elif isinstance(job_reqs, list):
                job_skills = job_reqs
            
            job_exp_level = opportunity_data.get('experience_level', 'any')
            
            # Calculate component scores (all 0-100)
            exp_score = self.calculate_experience_score(u_exp_years, job_exp_level)
            skill_result = self.calculate_skill_score(u_skills, job_skills, job_desc)
            skill_score = skill_result['score']
            role_score = self.calculate_role_match(u_roles, job_title, job_desc)
            depth_score = self.calculate_skill_depth_score(u_skills)
            pref_score = self.calculate_preference_score(u_prefs, opportunity_data)
            
            # Weighted combination (weights sum to 1.0)
            total_score = (
                (skill_score * self.SKILL_WEIGHT) +
                (exp_score * self.EXPERIENCE_WEIGHT) +
                (role_score * self.ROLE_WEIGHT) +
                (depth_score * self.SKILL_DEPTH_WEIGHT) +
                (pref_score * self.PREFERENCE_WEIGHT)
            )
            
            # Final clamp to ensure [0, 100]
            final_score = max(self.MIN_SCORE, min(total_score, self.MAX_SCORE))
            
            return {
                'match_score': round(final_score, 1),
                'breakdown': {
                    'skill_score': round(skill_score, 1),
                    'experience_score': round(exp_score, 1),
                    'role_score': round(role_score, 1),
                    'skill_depth_score': round(depth_score, 1),
                    'preference_score': round(pref_score, 1)
                },
                'matched_skills': skill_result['matched'],
                'partial_matched_skills': skill_result['partial_matched'],
                'missing_skills': skill_result['missing'],
                'related_skills': skill_result['related'],
                'confidence': self._calculate_confidence(u_skills, job_skills)
            }
            
        except Exception as e:
            print(f"Error in recommendation engine: {e}")
            return {
                'match_score': 0.0,
                'breakdown': {},
                'matched_skills': [],
                'partial_matched_skills': [],
                'missing_skills': [],
                'related_skills': [],
                'confidence': 'low'
            }
    
    def _calculate_confidence(self, user_skills: List[Dict], 
                             req_skills: List[str]) -> str:
        """Calculate confidence level of the recommendation"""
        if not user_skills or not req_skills:
            return 'low'
        
        if len(user_skills) >= 5 and len(req_skills) >= 3:
            return 'high'
        elif len(user_skills) >= 3 or len(req_skills) >= 2:
            return 'medium'
        else:
            return 'low'


# Example usage
if __name__ == "__main__":
    engine = AdvancedRecommendationEngine()
    
    user = {
        'skills': [
            {'skill': 'Python', 'level': 'expert'},
            {'skill': 'Django', 'level': 'advanced'},
            {'skill': 'React', 'level': 'intermediate'},
            {'skill': 'PostgreSQL', 'level': 'advanced'},
            {'skill': 'AWS', 'level': 'intermediate'}
        ],
        'experience_years': 5,
        'target_roles': ['Software Engineer', 'Backend Developer'],
        'preferences': {
            'open_to_remote': True,
            'preferred_locations': ['San Francisco', 'Remote'],
            'job_type': 'full-time'
        }
    }
    
    job = {
        'title': 'Senior Backend Engineer',
        'description': 'Looking for Python expert with Django experience',
        'requirements': {
            'skills': ['Python', 'Django', 'PostgreSQL', 'Docker']
        },
        'experience_level': 'senior',
        'remote': True,
        'location': 'Remote',
        'employment_type': 'full-time'
    }
    
    result = engine.calculate_score(user, job)
    print(f"Match Score: {result['match_score']}%")
    print(f"Breakdown: {result['breakdown']}")
    print(f"Matched Skills: {result['matched_skills']}")
    print(f"Missing Skills: {result['missing_skills']}")
    print(f"Confidence: {result['confidence']}")