# main.py - Enhanced AI Quiz Generator with FastAPI, Chatbot and Comprehensive Folder Tests
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import os
import uuid
import json
import requests
from datetime import datetime
import PyPDF2
import youtube_dl
from bs4 import BeautifulSoup
import google.generativeai as genai
import sqlite3
import threading
import random
import markdown
from contextlib import asynccontextmanager
import tempfile
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Pydantic Models
class FolderCreate(BaseModel):
    folder_name: str
    description: Optional[str] = ""

class LinkAdd(BaseModel):
    urls: Optional[List[str]] = None
    url: Optional[str] = None
    custom_names: Optional[Dict[str, str]] = {}

class TestGenerate(BaseModel):
    link_ids: List[str]
    question_types: List[str] = ["mcq"]
    difficulty: str = "medium"
    num_questions: int = 15
    test_name: Optional[str] = None

class ComprehensiveTestGenerate(BaseModel):
    question_types: List[str] = ["mcq", "short_answer", "true_false"]
    difficulty: str = "mixed"
    num_questions: int = 30
    test_name: Optional[str] = None

class QuizFromUrls(BaseModel):
    urls: List[str]
    question_types: List[str] = ["mcq"]
    difficulty: str = "medium"
    num_questions: int = 15
    test_name: Optional[str] = None

class TestSubmission(BaseModel):
    answers: Dict[str, str]
    scores: Optional[Dict[str, int]] = {}

class ScoreUpdate(BaseModel):
    scores: Dict[str, int]

 
class AnswerExplanation(BaseModel):
    question_data: Dict[str, Any]
    submission_id: str
    question_index: int = 0
    user_answer: Optional[str] = ""

class BulkDelete(BaseModel):
    link_ids: Optional[List[str]] = None
    test_ids: Optional[List[str]] = None
# Add new Pydantic models for chat context
class ChatContextUpdate(BaseModel):
    folder_id: Optional[str] = None
    selected_link_ids: Optional[List[str]] = []
    selected_test_ids: Optional[List[str]] = []
    selected_submission_ids: Optional[List[str]] = []

class ChatMessage(BaseModel):
    message: str
    question_index: Optional[int] = None
# Global configuration
app_config = {
    'UPLOAD_FOLDER': 'uploads',
    'DATABASE': 'quiz_platform.db'
}

# Ensure directories exist
os.makedirs(app_config['UPLOAD_FOLDER'], exist_ok=True)

# AI Configuration
genai.configure(api_key=" ")

# Thread lock for database operations
db_lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=4)

# Session-based chat storage
chat_sessions = {}

# Helper Functions
def format_text(text: str) -> str:
    """Format text with proper markdown rendering"""
    if not text:
        return ""
    html = markdown.markdown(text, extensions=['tables', 'fenced_code', 'nl2br'])
    return html

def calculate_estimated_time(num_questions: int, difficulty: str, question_types: List[str]) -> int:
    """Calculate estimated time to complete test based on difficulty and question types"""
    base_times = {
        'mcq': 1.5,
        'true_false': 1.0,
        'short_answer': 3.0,
        'long_answer': 5.0,
        'fill_blanks': 2.0,
        'multi_select': 2.0
    }
    
    difficulty_multipliers = {
        'easy': 0.8,
        'medium': 1.0,
        'hard': 1.3,
        'mixed': 1.1
    }
    
    total_time = 0
    questions_per_type = num_questions // len(question_types) if question_types else num_questions
    
    for q_type in question_types:
        base_time = base_times.get(q_type, 2.0)
        total_time += base_time * questions_per_type
    
    total_time *= difficulty_multipliers.get(difficulty, 1.0)
    return max(5, int(total_time))

def get_transcript_text(video_url: str) -> str:
    """Simple YouTube transcript extractor"""
    try:
        with youtube_dl.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return info.get('description', info.get('title', 'No transcript available'))
    except:
        return "Transcript not available"

# Database Management
class DatabaseManager:
    @staticmethod
    def init_db():
        """Initialize the database with required tables."""
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute("PRAGMA foreign_keys = ON;")
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS folders (
                        folder_id TEXT PRIMARY KEY, folder_name TEXT NOT NULL, description TEXT,
                        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS links (
                        link_id TEXT PRIMARY KEY, folder_id TEXT, url TEXT NOT NULL, title TEXT,
                        custom_name TEXT, content TEXT NOT NULL, content_preview TEXT,
                        link_type TEXT NOT NULL, created_at TEXT NOT NULL, last_accessed TEXT NOT NULL,
                        FOREIGN KEY (folder_id) REFERENCES folders (folder_id) ON DELETE CASCADE
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS tests (
                        test_id TEXT PRIMARY KEY, test_name TEXT, link_ids TEXT, source_urls TEXT,
                        question_types TEXT NOT NULL, difficulty TEXT NOT NULL, num_questions INTEGER NOT NULL,
                        test_data TEXT NOT NULL, created_at TEXT NOT NULL, folder_id TEXT,
                        estimated_time INTEGER DEFAULT 0, tags TEXT, test_type TEXT DEFAULT 'normal',
                        FOREIGN KEY (folder_id) REFERENCES folders (folder_id) ON DELETE SET NULL
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS test_submissions (
                        submission_id TEXT PRIMARY KEY, test_id TEXT NOT NULL, user_answers TEXT NOT NULL,
                        submitted_at TEXT NOT NULL, user_scores TEXT, performance_metrics TEXT,
                        FOREIGN KEY (test_id) REFERENCES tests (test_id) ON DELETE CASCADE
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS ai_feedback (
                        feedback_id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, question_index INTEGER NOT NULL,
                        feedback_text TEXT NOT NULL, created_at TEXT NOT NULL,
                        FOREIGN KEY (submission_id) REFERENCES test_submissions (submission_id) ON DELETE CASCADE
                    )
                ''')
                conn.commit()

    @staticmethod
    def create_folder(folder_name: str, description: str = "") -> str:
        folder_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO folders (folder_id, folder_name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                               (folder_id, folder_name, description, now, now))
                conn.commit()
        return folder_id

    @staticmethod
    def get_folders() -> List[Dict]:
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT f.folder_id, f.folder_name, f.description, f.created_at, f.updated_at, COUNT(l.link_id) as link_count
                FROM folders f LEFT JOIN links l ON f.folder_id = l.folder_id
                GROUP BY f.folder_id ORDER BY f.updated_at DESC
            ''')
            return [{
                'folder_id': r[0], 'folder_name': r[1], 'description': r[2],
                'created_at': r[3], 'updated_at': r[4], 'link_count': r[5]
            } for r in cursor.fetchall()]

    @staticmethod
    def save_link(folder_id: str, url: str, content: str, title: str = None, custom_name: str = None, link_type: str = "url") -> str:
        link_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        content_preview = content[:300] + "..." if len(content) > 300 else content
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO links (link_id, folder_id, url, title, custom_name, content, content_preview, link_type, created_at, last_accessed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (link_id, folder_id, url, title, custom_name, content, content_preview, link_type, now, now))
                cursor.execute('UPDATE folders SET updated_at = ? WHERE folder_id = ?', (now, folder_id))
                conn.commit()
        return link_id

    @staticmethod
    def save_multiple_links(folder_id: str, links_data: List[Dict]) -> List[str]:
        """Save multiple links at once"""
        link_ids = []
        now = datetime.now().isoformat()
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                for link_data in links_data:
                    link_id = str(uuid.uuid4())
                    content_preview = link_data['content'][:300] + "..." if len(link_data['content']) > 300 else link_data['content']
                    cursor.execute('''
                        INSERT INTO links (link_id, folder_id, url, title, custom_name, content, content_preview, link_type, created_at, last_accessed)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (link_id, folder_id, link_data['url'], link_data['title'], 
                          link_data.get('custom_name'), link_data['content'], 
                          content_preview, link_data['link_type'], now, now))
                    link_ids.append(link_id)
                cursor.execute('UPDATE folders SET updated_at = ? WHERE folder_id = ?', (now, folder_id))
                conn.commit()
        return link_ids

    @staticmethod
    def get_folder_links(folder_id: str) -> List[Dict]:
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT link_id, url, title, custom_name, content_preview, link_type, created_at, last_accessed FROM links WHERE folder_id = ? ORDER BY last_accessed DESC', (folder_id,))
            return [{
                'link_id': r[0], 'url': r[1], 'title': r[2], 'custom_name': r[3],
                'display_name': r[3] or r[2], 'content_preview': r[4], 'link_type': r[5],
                'created_at': r[6], 'last_accessed': r[7]
            } for r in cursor.fetchall()]

    @staticmethod
    def get_link_content(link_ids: List[str]) -> Dict:
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            placeholders = ','.join(['?' for _ in link_ids])
            cursor.execute(f'SELECT link_id, url, title, custom_name, content FROM links WHERE link_id IN ({placeholders})', link_ids)
            return {r[0]: {'url': r[1], 'title': r[2], 'custom_name': r[3], 'content': r[4]} for r in cursor.fetchall()}

    @staticmethod
    def get_all_folder_content(folder_id: str) -> Dict:
        """Get all content from a folder for comprehensive testing"""
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT link_id, url, title, custom_name, content FROM links WHERE folder_id = ?', (folder_id,))
            return {r[0]: {'url': r[1], 'title': r[2], 'custom_name': r[3], 'content': r[4]} for r in cursor.fetchall()}

    @staticmethod
    def get_folder_tests(folder_id: str) -> List[Dict]:
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT test_id, test_name, created_at, num_questions, estimated_time, tags, test_type FROM tests WHERE folder_id = ? ORDER BY created_at DESC', (folder_id,))
            return [{'test_id': r[0], 'test_name': r[1], 'created_at': r[2], 'num_questions': r[3], 'estimated_time': r[4], 'tags': r[5], 'test_type': r[6]} for r in cursor.fetchall()]

    @staticmethod
    def save_test(test_name: str, question_types: List[str], difficulty: str, test_data: List[Dict], 
                  link_ids: List[str] = None, source_urls: List[str] = None, folder_id: str = None, test_type: str = 'normal') -> str:
        test_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        estimated_time = calculate_estimated_time(len(test_data), difficulty, question_types)
        
        tags = set()
        if test_type == 'comprehensive':
            for question in test_data:
                tags.add(question.get('difficulty', difficulty))
                if 'tags' in question:
                    tags.update(question['tags'])
        else:
            tags.add(difficulty)
        
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO tests (test_id, test_name, link_ids, question_types, difficulty, num_questions, test_data, created_at, source_urls, folder_id, estimated_time, tags, test_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (test_id, test_name, json.dumps(link_ids or []), json.dumps(question_types), difficulty, len(test_data), json.dumps(test_data), now, json.dumps(source_urls or []), folder_id, estimated_time, json.dumps(list(tags)), test_type))
                conn.commit()
        return test_id

    @staticmethod
    def get_test(test_id: str) -> Optional[Dict]:
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT test_name, link_ids, question_types, difficulty, test_data, created_at, folder_id, estimated_time, tags, test_type FROM tests WHERE test_id = ?', (test_id,))
            row = cursor.fetchone()
            if row:
                return {
                    'test_id': test_id, 'test_name': row[0], 'link_ids': json.loads(row[1]),
                    'question_types': json.loads(row[2]), 'difficulty': row[3],
                    'test_data': json.loads(row[4]), 'created_at': row[5], 'folder_id': row[6],
                    'estimated_time': row[7], 'tags': json.loads(row[8] or '[]'), 'test_type': row[9]
                }
        return None

    @staticmethod
    def save_submission(test_id: str, user_answers: Dict, user_scores: Dict = None, performance_metrics: Dict = None) -> str:
        submission_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO test_submissions (submission_id, test_id, user_answers, submitted_at, user_scores, performance_metrics) VALUES (?, ?, ?, ?, ?, ?)',
                               (submission_id, test_id, json.dumps(user_answers), now, json.dumps(user_scores or {}), json.dumps(performance_metrics or {})))
                conn.commit()
        return submission_id

    @staticmethod
    def update_submission_scores(submission_id: str, user_scores: Dict):
        """Update user self-assessment scores"""
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('UPDATE test_submissions SET user_scores = ? WHERE submission_id = ?',
                               (json.dumps(user_scores), submission_id))
                conn.commit()

    @staticmethod
    def save_ai_feedback(submission_id: str, question_index: int, feedback_text: str) -> str:
        feedback_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO ai_feedback (feedback_id, submission_id, question_index, feedback_text, created_at) VALUES (?, ?, ?, ?, ?)',
                               (feedback_id, submission_id, question_index, feedback_text, now))
                conn.commit()
        return feedback_id

    @staticmethod
    def get_folder_comprehensive_submissions(folder_id: str) -> List[Dict]:
        """Get all comprehensive test submissions for a folder"""
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT ts.submission_id, ts.test_id, ts.user_answers, ts.submitted_at, 
                       ts.user_scores, ts.performance_metrics, t.test_name, t.test_data, t.tags
                FROM test_submissions ts
                JOIN tests t ON ts.test_id = t.test_id
                WHERE t.folder_id = ? AND t.test_type = 'comprehensive'
                ORDER BY ts.submitted_at DESC
            ''', (folder_id,))
            return [{
                'submission_id': r[0], 'test_id': r[1], 'user_answers': json.loads(r[2]),
                'submitted_at': r[3], 'user_scores': json.loads(r[4] or '{}'),
                'performance_metrics': json.loads(r[5] or '{}'), 'test_name': r[6],
                'test_data': json.loads(r[7]), 'tags': json.loads(r[8] or '[]')
            } for r in cursor.fetchall()]

# Content Extraction
class ContentExtractor:
    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                return "".join(page.extract_text() + "\n" for page in pdf_reader.pages).strip()
        except Exception as e:
            raise Exception(f"Error extracting PDF: {e}")

    @staticmethod
    def extract_from_url(url: str) -> tuple:
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.find('title').get_text().strip() if soup.find('title') else None
            for script in soup(["script", "style"]):
                script.decompose()
            text = ' '.join(chunk for chunk in (phrase.strip() for line in soup.get_text().splitlines() for phrase in line.split("  ")) if chunk)
            return text, title
        except Exception as e:
            raise Exception(f"Error extracting from URL {url}: {e}")

    @staticmethod
    def extract_from_youtube(url: str) -> tuple:
        try:
            transcript = get_transcript_text(url)
            with youtube_dl.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title')
            return transcript, title
        except Exception:
            return ContentExtractor.extract_from_url(url)

    @staticmethod
    def extract_from_multiple_urls(urls: List[str]) -> List[Dict]:
        """Extract content from multiple URLs"""
        results = []
        for url in urls:
            try:
                if 'youtube.com' in url or 'youtu.be' in url:
                    content, title = ContentExtractor.extract_from_youtube(url)
                    link_type = "youtube"
                else:
                    content, title = ContentExtractor.extract_from_url(url)
                    link_type = "url"
                
                results.append({
                    'url': url,
                    'title': title or url,
                    'content': content,
                    'link_type': link_type
                })
            except Exception as e:
                print(f"Failed to extract from {url}: {e}")
                results.append({
                    'url': url,
                    'title': url,
                    'content': f"Failed to extract content: {e}",
                    'link_type': "error"
                })
        return results

# Quiz Generation
class QuizGenerator:
    @staticmethod
    def _distribute_questions(question_types: List[str], total_questions: int) -> Dict[str, int]:
        if not question_types: 
            return {}
        base_count = total_questions // len(question_types)
        remainder = total_questions % len(question_types)
        return {qt: base_count + (1 if i < remainder else 0) for i, qt in enumerate(question_types)}

    @staticmethod
    def _generate_questions_by_type(content: str, quiz_type: str, difficulty: str, num_questions: int, include_detailed_tags: bool = False) -> List[Dict]:
        difficulty_instructions = {
            'easy': "Generate easy questions that test basic understanding and recall.",
            'medium': "Generate medium difficulty questions requiring analysis and application.",
            'hard': "Generate challenging questions requiring deep analysis, synthesis, and critical thinking.",
            'mixed': "Generate questions of varying difficulty levels (easy, medium, and hard)."
        }
        
        tag_instruction = ""
        if include_detailed_tags:
            tag_instruction = """
            Include detailed tags for each question covering:
            - Subject/Topic (e.g., "mathematics", "history", "science")
            - Skill type (e.g., "analytical", "memorization", "problem-solving", "critical-thinking")
            - Specific concept (e.g., "calculus", "world-war-2", "photosynthesis")
            - Difficulty level
            Make tags specific and useful for performance analysis.
            """
        else:
            tag_instruction = "Include only difficulty level as tag."
        
        question_formats = {
            "mcq": {"prompt": f"Generate {num_questions} multiple choice questions (MCQ). {difficulty_instructions[difficulty]} Each question should have 4 options (A, B, C, D) with only one correct answer. {tag_instruction}", "structure": '[{"question": "...", "type": "mcq", "difficulty": "'+difficulty+'", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct_answer": "A", "explanation": "...", "tags": ["topic1", "skill1", "concept1"]}]'},
            "true_false": {"prompt": f"Generate {num_questions} true/false questions. {difficulty_instructions[difficulty]} {tag_instruction}", "structure": '[{"question": "...", "type": "true_false", "difficulty": "'+difficulty+'", "correct_answer": true, "explanation": "...", "tags": ["topic1", "skill1"]}]'},
            "short_answer": {"prompt": f"Generate {num_questions} short answer questions. {difficulty_instructions[difficulty]} These should be answerable in 1-3 sentences. {tag_instruction}", "structure": '[{"question": "...", "type": "short_answer", "difficulty": "'+difficulty+'", "sample_answer": "...", "key_points": ["...", "..."], "tags": ["topic1", "skill1"]}]'},
            "long_answer": {"prompt": f"Generate {num_questions} long answer questions. {difficulty_instructions[difficulty]} These should require detailed explanations. {tag_instruction}", "structure": '[{"question": "...", "type": "long_answer", "difficulty": "'+difficulty+'", "sample_answer": "...", "key_points": ["...", "..."], "tags": ["topic1", "skill1"]}]'},
            "fill_blanks": {"prompt": f"Generate {num_questions} fill in the blanks questions. {difficulty_instructions[difficulty]} Use underscores for blanks. {tag_instruction}", "structure": '[{"question": "The capital is ___.", "type": "fill_blanks", "difficulty": "'+difficulty+'", "correct_answer": "Paris", "explanation": "...", "tags": ["topic1", "skill1"]}]'},
            "multi_select": {"prompt": f"Generate {num_questions} multiple selection questions. {difficulty_instructions[difficulty]} Questions where multiple answers can be correct. {tag_instruction}", "structure": '[{"question": "...", "type": "multi_select", "difficulty": "'+difficulty+'", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct_answers": ["A", "C"], "explanation": "...", "tags": ["topic1", "skill1"]}]'}
        }
        
        format_info = question_formats.get(quiz_type, question_formats["mcq"])
        full_prompt = f"Based on the following content, {format_info['prompt']}\n\nContent:\n{content}\n\nPlease format your response as a valid JSON array with the following structure:\n{format_info['structure']}"
        
        try:
            model = genai.GenerativeModel(model_name="gemini-2.5-pro", system_instruction="You are an expert quiz generator. Generate diverse, engaging questions with relevant tags for categorization. Always respond with valid JSON only.")
            response = model.generate_content(
                contents=[{"role": "user", "parts": [full_prompt]}],
                generation_config=genai.types.GenerationConfig(temperature=0.7, response_mime_type="application/json")
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Error generating {quiz_type} questions: {e}")
            return []

    @staticmethod
    def generate_mixed_quiz(contents_dict: Dict, question_types: List[str], difficulty: str, num_questions: int = 15, test_type: str = 'normal') -> tuple:
        combined_content = "\n\n".join(f"--- Source: {link_data.get('title', 'Unknown')} ---\n{link_data['content']}" for link_data in contents_dict.values())
        source_info = [{'link_id': link_id, 'title': ld.get('title', 'Unknown'), 'url': ld.get('url', '')} for link_id, ld in contents_dict.items()]
        questions_per_type = QuizGenerator._distribute_questions(question_types, num_questions)
        all_questions = []
        
        include_detailed_tags = (test_type == 'comprehensive')
        
        for quiz_type, count in questions_per_type.items():
            if count > 0:
                all_questions.extend(QuizGenerator._generate_questions_by_type(combined_content, quiz_type, difficulty, count, include_detailed_tags))
        random.shuffle(all_questions)
        return all_questions, source_info

# Chatbot
class Chatbot:
    @staticmethod
    def get_session_id(request: Request) -> str:
        """Get or create session ID from request"""
        session_id = request.headers.get('x-session-id')
        if not session_id:
            session_id = str(uuid.uuid4())
        return session_id
    
    @staticmethod
    def initialize_chat_context(session_id: str, folder_id: str = None, selected_link_ids: List[str] = None, 
                               selected_test_ids: List[str] = None, selected_submission_ids: List[str] = None) -> Dict:
        """Initialize chat context with selected folder and content"""
        context = {
            'session_id': session_id,
            'folder_id': folder_id,
            'selected_link_ids': selected_link_ids or [],
            'selected_test_ids': selected_test_ids or [],
            'selected_submission_ids': selected_submission_ids or [],
            'chat_history': [],
            'context_data': {}
        }
        
        # Load folder information if provided
        if folder_id:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT folder_name, description FROM folders WHERE folder_id = ?', (folder_id,))
                folder_info = cursor.fetchone()
                if folder_info:
                    context['context_data']['folder'] = {
                        'name': folder_info[0],
                        'description': folder_info[1]
                    }
        
        # Load selected links content
        if selected_link_ids:
            contents_dict = DatabaseManager.get_link_content(selected_link_ids)
            context['context_data']['links'] = contents_dict
        
        # Load selected tests data
        if selected_test_ids:
            tests_data = []
            for test_id in selected_test_ids:
                test_data = DatabaseManager.get_test(test_id)
                if test_data:
                    tests_data.append(test_data)
            context['context_data']['tests'] = tests_data
        
        # Load selected submissions data
        if selected_submission_ids:
            submissions_data = []
            for submission_id in selected_submission_ids:
                with sqlite3.connect(app_config['DATABASE']) as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT ts.submission_id, ts.test_id, ts.user_answers, ts.submitted_at, 
                               ts.user_scores, ts.performance_metrics, t.test_name, t.test_data
                        FROM test_submissions ts
                        JOIN tests t ON ts.test_id = t.test_id
                        WHERE ts.submission_id = ?
                    ''', (submission_id,))
                    row = cursor.fetchone()
                    if row:
                        submissions_data.append({
                            'submission_id': row[0],
                            'test_id': row[1],
                            'user_answers': json.loads(row[2]),
                            'submitted_at': row[3],
                            'user_scores': json.loads(row[4] or '{}'),
                            'performance_metrics': json.loads(row[5] or '{}'),
                            'test_name': row[6],
                            'test_data': json.loads(row[7])
                        })
            context['context_data']['submissions'] = submissions_data
        
        chat_sessions[session_id] = context
        return context
    
    @staticmethod
    def get_chat_context(session_id: str) -> Optional[Dict]:
        """Get existing chat context"""
        return chat_sessions.get(session_id)
    
    @staticmethod
    def update_chat_context(session_id: str, folder_id: str = None, selected_link_ids: List[str] = None,
                           selected_test_ids: List[str] = None, selected_submission_ids: List[str] = None):
        """Update existing chat context with new selections"""
        if session_id in chat_sessions:
            context = chat_sessions[session_id]
            # Clear previous context data
            context['context_data'] = {}
            
            # Update selections
            context['folder_id'] = folder_id
            context['selected_link_ids'] = selected_link_ids or []
            context['selected_test_ids'] = selected_test_ids or []
            context['selected_submission_ids'] = selected_submission_ids or []
            
            # Reload context data with new selections
            return Chatbot.initialize_chat_context(session_id, folder_id, selected_link_ids, 
                                                 selected_test_ids, selected_submission_ids)
        else:
            return Chatbot.initialize_chat_context(session_id, folder_id, selected_link_ids, 
                                                 selected_test_ids, selected_submission_ids)
    
    @staticmethod
    def generate_response(session_id: str, user_message: str, question_index: int = None) -> str:
        """Generate AI response based on context"""
        context = Chatbot.get_chat_context(session_id)
        if not context:
            # If no context, provide general AI assistance
            return Chatbot._generate_general_response(user_message)
        
        # Build context string based on selected content
        context_info = []
        
        # Add folder context
        if context.get('context_data', {}).get('folder'):
            folder = context['context_data']['folder']
            context_info.append(f"**Current Folder**: {folder['name']}")
            if folder.get('description'):
                context_info.append(f"**Description**: {folder['description']}")
        
        # Add links content
        if context.get('context_data', {}).get('links'):
            context_info.append("\n**Selected Content Sources:**")
            for link_id, link_data in context['context_data']['links'].items():
                title = link_data.get('custom_name') or link_data.get('title', 'Unknown')
                content_preview = link_data['content'][:500] + "..." if len(link_data['content']) > 500 else link_data['content']
                context_info.append(f"- **{title}**: {content_preview}")
        
        # Add tests context
        if context.get('context_data', {}).get('tests'):
            context_info.append("\n**Selected Tests:**")
            for test_data in context['context_data']['tests']:
                context_info.append(f"- **{test_data['test_name']}** ({test_data['difficulty']} difficulty, {len(test_data['test_data'])} questions)")
                context_info.append(f"  Question types: {', '.join(test_data['question_types'])}")
        
        # Add submissions context
        if context.get('context_data', {}).get('submissions'):
            context_info.append("\n**Selected Test Results:**")
            for submission in context['context_data']['submissions']:
                avg_score = sum(submission['user_scores'].values()) / len(submission['user_scores']) if submission['user_scores'] else 0
                context_info.append(f"- **{submission['test_name']}** (Submitted: {submission['submitted_at'][:10]}, Average Score: {avg_score:.1f}%)")
                if submission.get('performance_metrics', {}).get('skill_averages'):
                    skills = submission['performance_metrics']['skill_averages']
                    context_info.append(f"  Key skills: {', '.join([f'{k}: {v:.1f}%' for k, v in skills.items()[:3]])}")
        
        # Build conversation history
        history_context = ""
        if context['chat_history']:
            history_context = "\n**Recent Conversation:**\n" + "\n".join([
                f"User: {h['user']}\nAI: {h['ai'][:200]}..." if len(h['ai']) > 200 else f"User: {h['user']}\nAI: {h['ai']}"
                for h in context['chat_history'][-3:]
            ])
        
        # Determine the type of assistance needed
        context_type = "general"
        if context.get('context_data', {}).get('links'):
            context_type = "content_analysis"
        elif context.get('context_data', {}).get('tests'):
            context_type = "test_assistance"
        elif context.get('context_data', {}).get('submissions'):
            context_type = "performance_analysis"
        
        context_string = "\n".join(context_info) if context_info else "No specific content selected - providing general assistance."
        
        prompt = f"""
        You are an intelligent AI assistant helping a student with their learning materials and test performance.
        
        **Context Type**: {context_type.replace('_', ' ').title()}
        
        **Available Context:**
        {context_string}
        
        {history_context}
        
        **Student's Question**: {user_message}
        
        **Instructions**:
        Based on the available context, provide a helpful response that:
        
        1. **Directly addresses** the student's question using the provided context when relevant
        2. **Analyzes content** if they're asking about their study materials
        3. **Explains concepts** clearly if they need help understanding topics
        4. **Provides study guidance** based on their test results and performance data
        5. **Gives personalized recommendations** based on their strengths and weaknesses
        6. **Offers learning strategies** tailored to their content and performance
        7. **Encourages active learning** and critical thinking
        
        If no specific context is available, provide general educational assistance while being clear that you're working with limited information.
        
        Keep responses helpful, educational, and appropriately detailed. Use markdown formatting for better readability.
        """
        
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-pro",
                system_instruction="You are an expert AI tutor and learning assistant. Provide clear, educational, and contextually relevant responses. Use markdown formatting and be encouraging while maintaining academic rigor."
            )
            response = model.generate_content(
                contents=[{"role": "user", "parts": [prompt]}],
                generation_config=genai.types.GenerationConfig(temperature=0.4)
            )
            
            ai_response = response.text
            
            # Save to chat history
            context['chat_history'].append({
                'user': user_message,
                'ai': ai_response,
                'timestamp': datetime.now().isoformat(),
                'context_type': context_type
            })
            
            # Keep only recent history
            if len(context['chat_history']) > 10:
                context['chat_history'] = context['chat_history'][-10:]
            
            return format_text(ai_response)
            
        except Exception as e:
            return f"I encountered an error while processing your question: {e}. Please try rephrasing your question."
    
    @staticmethod
    def _generate_general_response(user_message: str) -> str:
        """Generate general AI response when no specific context is available"""
        prompt = f"""
        You are a helpful AI assistant. A student is asking: "{user_message}"
        
        Provide a helpful, educational response. If this is about academic topics, provide clear explanations and learning guidance. 
        If you need more specific information or context to give a better answer, let them know what additional details would help.
        
        Use markdown formatting for better readability.
        """
        
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-pro",
                system_instruction="You are a helpful AI assistant. Provide clear, educational responses and ask for more context when needed."
            )
            response = model.generate_content(
                contents=[{"role": "user", "parts": [prompt]}],
                generation_config=genai.types.GenerationConfig(temperature=0.5)
            )
            return format_text(response.text)
        except Exception as e:
            return "I'm having trouble processing your request right now. Please try again or rephrase your question."

# Performance Analytics
class PerformanceAnalyzer:
    @staticmethod
    def analyze_comprehensive_test_performance(folder_id: str) -> Dict:
        """Analyze performance from comprehensive folder tests"""
        submissions = DatabaseManager.get_folder_comprehensive_submissions(folder_id)
        
        if not submissions:
            return {"error": "No comprehensive test submissions found for this folder"}
        
        performance_data = []
        skill_performance = {}
        topic_performance = {}
        difficulty_performance = {'easy': [], 'medium': [], 'hard': []}
        
        for submission in submissions:
            test_data = submission['test_data']
            user_answers = submission['user_answers']
            user_scores = submission['user_scores']
            
            for i, question in enumerate(test_data):
                question_tags = question.get('tags', [])
                difficulty = question.get('difficulty', 'medium')
                question_type = question.get('type', 'unknown')
                
                user_answer = user_answers.get(str(i), '')
                user_score = user_scores.get(str(i), 0)
                
                for tag in question_tags:
                    if any(skill in tag.lower() for skill in ['analytical', 'problem-solving', 'critical-thinking', 'memorization', 'application']):
                        if tag not in skill_performance:
                            skill_performance[tag] = []
                        skill_performance[tag].append(user_score)
                    else:
                        if tag not in topic_performance:
                            topic_performance[tag] = []
                        topic_performance[tag].append(user_score)
                
                if difficulty in difficulty_performance:
                    difficulty_performance[difficulty].append(user_score)
                
                performance_data.append({
                    'submission_id': submission['submission_id'],
                    'submitted_at': submission['submitted_at'],
                    'question_index': i,
                    'question_type': question_type,
                    'difficulty': difficulty,
                    'tags': question_tags,
                    'user_score': user_score,
                    'user_answer': user_answer
                })
        
        skill_averages = {skill: sum(scores)/len(scores) for skill, scores in skill_performance.items() if scores}
        topic_averages = {topic: sum(scores)/len(scores) for topic, scores in topic_performance.items() if scores}
        difficulty_averages = {diff: sum(scores)/len(scores) if scores else 0 for diff, scores in difficulty_performance.items()}
        
        weak_skills = [skill for skill, avg in skill_averages.items() if avg < 70]
        weak_topics = [topic for topic, avg in topic_averages.items() if avg < 70]
        
        submissions_sorted = sorted(submissions, key=lambda x: x['submitted_at'])
        time_performance = []
        for submission in submissions_sorted:
            avg_score = sum(submission['user_scores'].values()) / len(submission['user_scores']) if submission['user_scores'] else 0
            time_performance.append({
                'date': submission['submitted_at'][:10],
                'average_score': avg_score,
                'submission_id': submission['submission_id']
            })
        
        return {
            'overall_stats': {
                'total_submissions': len(submissions),
                'total_questions_attempted': len(performance_data),
                'overall_average': sum(skill_averages.values()) / len(skill_averages) if skill_averages else 0
            },
            'skill_performance': skill_averages,
            'topic_performance': topic_averages,
            'difficulty_performance': difficulty_averages,
            'weak_areas': {
                'skills': weak_skills,
                'topics': weak_topics
            },
            'performance_over_time': time_performance,
            'detailed_performance': performance_data
        }
    
    @staticmethod
    def generate_performance_insights(folder_id: str) -> Dict:
        """Generate AI-powered insights from performance data"""
        analysis = PerformanceAnalyzer.analyze_comprehensive_test_performance(folder_id)
        
        if 'error' in analysis:
            return analysis
        
        prompt = f"""
        You are an expert learning analyst. Based on the following comprehensive test performance data, provide detailed insights and recommendations.
        
        **Performance Data:**
        {json.dumps(analysis, indent=2)}
        
        Please provide a comprehensive analysis using markdown formatting that includes:
        
        ## 📊 Overall Performance Summary
        Brief overview of the student's performance across all comprehensive tests.
        
        ## 💪 Strong Areas
        Skills, topics, and question types where the student excels (>80% average).
        
        ## 🎯 Areas Needing Improvement
        Specific skills, topics, or difficulty levels where performance is below 70%.
        
        ## 📈 Progress Tracking
        Analysis of performance trends over time - is the student improving?
        
        ## 🧠 Skill-Based Analysis
        Breakdown of performance by cognitive skills (analytical, problem-solving, etc.).
        
        ## 📚 Topic-Specific Insights
        Performance analysis by subject areas and topics.
        
        ## 🎲 Difficulty Analysis
        How the student performs across different difficulty levels.
        
        ## 🔧 Actionable Recommendations
        7-10 specific, practical recommendations for improvement based on the data.
        
        ## 📅 Study Plan Suggestions
        Suggested focus areas and study strategies based on weak areas identified.
        
        Use emojis, bullet points, and clear formatting. Be encouraging but honest about areas needing work.
        Provide specific, actionable advice rather than generic suggestions.
        """
        
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            return {"insights": format_text(response.text)}
        except Exception as e:
            return {"error": f"Failed to generate insights: {e}"}

# Answer Explanation
class AnswerExplainer:
    @staticmethod
    def explain_answer(question_data: Dict, user_answer: str, context: str = "") -> str:
        try:
            prompt = f"""
            You are a subject matter expert providing direct, constructive feedback on a quiz answer. Your goal is to clarify concepts and provide educational value.
            
            Analyze the user's response based on the following:
            - **Question Type**: {question_data.get('type', 'unknown').upper()}
            - **Difficulty**: {question_data.get('difficulty', 'medium').upper()}
            - **Question**: "{question_data.get('question', '')}"
            - **Correct Answer**: "{question_data.get('correct_answer') or question_data.get('sample_answer', '')}"
            - **User's Answer**: "{user_answer}"
            - **Tags/Topics**: {question_data.get('tags', [])}
            - **Additional Context**: "{context}"

            Provide a well-formatted explanation following these guidelines:
            1. **Assessment**: Start with whether the answer is correct/incorrect/partially correct
            2. **Analysis**: Compare the user's answer to the ideal answer
            3. **Explanation**: Provide a clear, correct explanation of the concept
            4. **Key Points**: Highlight the most important takeaways
            5. **Tips**: If applicable, provide study tips for this topic

            Format your response using markdown for better readability. Be encouraging but accurate.
            """
            model = genai.GenerativeModel(model_name="gemini-2.5-pro", 
                                        system_instruction="You are an expert tutor. Your feedback is clear, educational, and well-formatted using markdown.")
            response = model.generate_content(contents=[{"role": "user", "parts": [prompt]}], 
                                            generation_config=genai.types.GenerationConfig(temperature=0.2))
            return format_text(response.text)
        except Exception as e:
            return f"Unable to generate explanation: {e}"

# Startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    DatabaseManager.init_db()
    yield
    # Shutdown - cleanup if needed
    pass

# FastAPI app initialization
app = FastAPI(
    title="AI Quiz Generator API",
    description="Enhanced AI Quiz Generator with Chatbot and Comprehensive Folder Tests",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get session ID
def get_session_id(request: Request) -> str:
    return Chatbot.get_session_id(request)

# Health Check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# Folder Routes
@app.get("/api/folders")
async def get_folders():
    folders = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_folders)
    return {"folders": folders}

@app.post("/api/folders")
async def create_folder(folder_data: FolderCreate):
    if not folder_data.folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")
    folder_id = await asyncio.get_event_loop().run_in_executor(
        executor, DatabaseManager.create_folder, folder_data.folder_name, folder_data.description
    )
    return {"folder_id": folder_id, "message": "Folder created"}

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str):
    def _delete_folder():
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM folders WHERE folder_id = ?', (folder_id,))
                conn.commit()
                return cursor.rowcount
    
    deleted_count = await asyncio.get_event_loop().run_in_executor(executor, _delete_folder)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder deleted successfully"}

# Link Routes
@app.get("/api/folders/{folder_id}/links")
async def get_folder_links(folder_id: str):
    links = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_folder_links, folder_id)
    return {"links": links}

@app.post("/api/folders/{folder_id}/links")
async def add_link_to_folder(folder_id: str, link_data: LinkAdd):
    urls = link_data.urls or ([link_data.url] if link_data.url else [])
    
    if not urls:
        raise HTTPException(status_code=400, detail="At least one URL is required")
    
    try:
        links_data = await asyncio.get_event_loop().run_in_executor(
            executor, ContentExtractor.extract_from_multiple_urls, urls
        )
        
        for i, ld in enumerate(links_data):
            if str(i) in link_data.custom_names:
                ld['custom_name'] = link_data.custom_names[str(i)]
        
        link_ids = await asyncio.get_event_loop().run_in_executor(
            executor, DatabaseManager.save_multiple_links, folder_id, links_data
        )
        
        return {
            "link_ids": link_ids, 
            "message": f"Successfully added {len(link_ids)} link(s)",
            "details": [{"url": ld['url'], "title": ld['title'], "status": "success" if ld['link_type'] != "error" else "failed"} for ld in links_data]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process links: {e}")

@app.delete("/api/links/{link_id}")
async def delete_link(link_id: str):
    def _delete_link():
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM links WHERE link_id = ?', (link_id,))
                conn.commit()
                return cursor.rowcount
    
    deleted_count = await asyncio.get_event_loop().run_in_executor(executor, _delete_link)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"message": "Link deleted successfully"}

@app.post("/api/links/bulk-delete")
async def delete_multiple_links(bulk_data: BulkDelete):
    if not bulk_data.link_ids:
        raise HTTPException(status_code=400, detail="No link IDs provided")
    
    def _delete_links():
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                placeholders = ','.join(['?' for _ in bulk_data.link_ids])
                cursor.execute(f'DELETE FROM links WHERE link_id IN ({placeholders})', bulk_data.link_ids)
                deleted_count = cursor.rowcount
                conn.commit()
                return deleted_count
    
    deleted_count = await asyncio.get_event_loop().run_in_executor(executor, _delete_links)
    return {"message": f"Successfully deleted {deleted_count} link(s)"}

# PDF Upload
@app.post("/api/folders/{folder_id}/upload-pdf")
async def upload_pdf_to_folder(folder_id: str, files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            results.append({"filename": file.filename, "status": "failed", "error": "Invalid file. Must be a PDF."})
            continue
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            extracted_content = await asyncio.get_event_loop().run_in_executor(
                executor, ContentExtractor.extract_from_pdf, temp_file_path
            )
            title = file.filename.replace('.pdf', '').replace('_', ' ').title()
            link_id = await asyncio.get_event_loop().run_in_executor(
                executor, DatabaseManager.save_link, folder_id, f"file://{file.filename}", extracted_content, title, None, "pdf"
            )
            results.append({"filename": file.filename, "status": "success", "link_id": link_id})
        except Exception as e:
            results.append({"filename": file.filename, "status": "failed", "error": str(e)})
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    success_count = sum(1 for r in results if r["status"] == "success")
    return {
        "message": f"Processed {len(files)} file(s). {success_count} successful.",
        "results": results
    }

# Test Generation Routes
@app.post("/api/folders/{folder_id}/generate-test")
async def generate_test_from_folder_links(folder_id: str, test_data: TestGenerate):
    try:
        if not test_data.link_ids:
            raise HTTPException(status_code=400, detail="At least one link must be selected")
        
        contents_dict = await asyncio.get_event_loop().run_in_executor(
            executor, DatabaseManager.get_link_content, test_data.link_ids
        )
        if not contents_dict:
            raise HTTPException(status_code=400, detail="No content found for selected links")
        
        test_name = test_data.test_name or f"Test - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        quiz_data, _ = await asyncio.get_event_loop().run_in_executor(
            executor, QuizGenerator.generate_mixed_quiz, contents_dict, 
            test_data.question_types, test_data.difficulty, test_data.num_questions, 'normal'
        )
        
        test_id = await asyncio.get_event_loop().run_in_executor(
            executor, DatabaseManager.save_test, test_name, test_data.question_types, 
            test_data.difficulty, quiz_data, test_data.link_ids, None, folder_id, 'normal'
        )
        
        test_details = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_test, test_id)
        
        return {
            "test_id": test_id, 
            "test_name": test_name, 
            "quiz_data": quiz_data,
            "estimated_time": test_details['estimated_time'],
            "tags": test_details['tags']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/folders/{folder_id}/generate-comprehensive-test")
async def generate_comprehensive_folder_test(folder_id: str, test_data: ComprehensiveTestGenerate):
    try:
        contents_dict = await asyncio.get_event_loop().run_in_executor(
            executor, DatabaseManager.get_all_folder_content, folder_id
        )
        if not contents_dict:
            raise HTTPException(status_code=400, detail="No content found in this folder")
        
        test_name = test_data.test_name or f"Comprehensive Test - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        quiz_data, _ = await asyncio.get_event_loop().run_in_executor(
            executor, QuizGenerator.generate_mixed_quiz, contents_dict, 
            test_data.question_types, test_data.difficulty, test_data.num_questions, 'comprehensive'
        )
        
        test_id = await asyncio.get_event_loop().run_in_executor(
            executor, DatabaseManager.save_test, test_name, test_data.question_types, 
            test_data.difficulty, quiz_data, list(contents_dict.keys()), None, folder_id, 'comprehensive'
        )
        
        test_details = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_test, test_id)
        
        return {
            "test_id": test_id, 
            "test_name": test_name, 
            "quiz_data": quiz_data,
            "estimated_time": test_details['estimated_time'],
            "tags": test_details['tags'],
            "test_type": "comprehensive",
            "total_sources": len(contents_dict)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-quiz-from-links")
async def generate_quiz_from_urls(quiz_data: QuizFromUrls):
    try:
        if not quiz_data.urls:
            raise HTTPException(status_code=400, detail="At least one URL is required")

        contents_dict = {}
        urls_data = await asyncio.get_event_loop().run_in_executor(
            executor, ContentExtractor.extract_from_multiple_urls, quiz_data.urls
        )
        
        for i, url_data in enumerate(urls_data):
            if url_data['link_type'] != 'error':
                contents_dict[f"temp_{i}"] = {
                    'content': url_data['content'], 
                    'title': url_data['title'], 
                    'url': url_data['url']
                }

        if not contents_dict:
            raise HTTPException(status_code=400, detail="Could not extract content from any provided URLs.")

        test_name = quiz_data.test_name or f"Ad-hoc Test - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        quiz_questions, _ = await asyncio.get_event_loop().run_in_executor(
            executor, QuizGenerator.generate_mixed_quiz, contents_dict, 
            quiz_data.question_types, quiz_data.difficulty, quiz_data.num_questions, 'normal'
        )
        
        test_id = await asyncio.get_event_loop().run_in_executor(
            executor, DatabaseManager.save_test, test_name, quiz_data.question_types, 
            quiz_data.difficulty, quiz_questions, None, quiz_data.urls, None, 'normal'
        )
        
        test_details = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_test, test_id)
        
        return {
            "test_id": test_id, 
            "test_name": test_name, 
            "quiz_data": quiz_questions,
            "estimated_time": test_details['estimated_time'],
            "tags": test_details['tags']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Test Management Routes
@app.get("/api/tests")
async def get_all_tests():
    def _get_tests():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT test_id, test_name, created_at, num_questions, folder_id, estimated_time, tags, test_type FROM tests ORDER BY created_at DESC')
            return [{'test_id': r[0], 'test_name': r[1], 'created_at': r[2], 'num_questions': r[3], 'folder_id': r[4], 'estimated_time': r[5], 'tags': json.loads(r[6] or '[]'), 'test_type': r[7]} for r in cursor.fetchall()]
    
    tests = await asyncio.get_event_loop().run_in_executor(executor, _get_tests)
    return {"tests": tests}

@app.get("/api/tests/{test_id}")
async def get_test_details(test_id: str):
    test_data = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_test, test_id)
    if not test_data:
        raise HTTPException(status_code=404, detail="Test not found")
    return test_data

@app.delete("/api/tests/{test_id}")
async def delete_test(test_id: str):
    def _delete_test():
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM tests WHERE test_id = ?', (test_id,))
                conn.commit()
                return cursor.rowcount
    
    deleted_count = await asyncio.get_event_loop().run_in_executor(executor, _delete_test)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"message": "Test deleted successfully"}

@app.get("/api/folders/{folder_id}/tests")
async def get_folder_tests(folder_id: str):
    tests = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_folder_tests, folder_id)
    return {"tests": tests}

# Chatbot Routes
@app.post("/api/tests/{test_id}/chat/init")
async def initialize_chat(test_id: str, session_id: str = Depends(get_session_id)):
    """Initialize chat context for a test"""
    context = await asyncio.get_event_loop().run_in_executor(
        executor, Chatbot.initialize_chat_context, test_id, session_id
    )
    if not context:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {
        "message": "Chat initialized successfully",
        "test_name": context['test_name'],
        "total_questions": len(context['questions']),
        "session_id": session_id
    }

# Submission Routes
@app.post("/api/tests/{test_id}/submit")
async def submit_test(test_id: str, submission: TestSubmission):
    test_data = await asyncio.get_event_loop().run_in_executor(executor, DatabaseManager.get_test, test_id)
    if not test_data:
        raise HTTPException(status_code=404, detail="Test not found")
    
    performance_metrics = {}
    if test_data.get('test_type') == 'comprehensive':
        skill_scores = {}
        topic_scores = {}
        difficulty_scores = {'easy': [], 'medium': [], 'hard': []}
        
        for i, question in enumerate(test_data['test_data']):
            user_score = submission.scores.get(str(i), 0)
            difficulty = question.get('difficulty', 'medium')
            tags = question.get('tags', [])
            
            if difficulty in difficulty_scores:
                difficulty_scores[difficulty].append(user_score)
            
            for tag in tags:
                if any(skill in tag.lower() for skill in ['analytical', 'problem-solving', 'critical-thinking', 'memorization']):
                    if tag not in skill_scores:
                        skill_scores[tag] = []
                    skill_scores[tag].append(user_score)
                else:
                    if tag not in topic_scores:
                        topic_scores[tag] = []
                    topic_scores[tag].append(user_score)
        
        performance_metrics = {
            'skill_averages': {k: sum(v)/len(v) if v else 0 for k, v in skill_scores.items()},
            'topic_averages': {k: sum(v)/len(v) if v else 0 for k, v in topic_scores.items()},
            'difficulty_averages': {k: sum(v)/len(v) if v else 0 for k, v in difficulty_scores.items()},
            'overall_average': sum(submission.scores.values()) / len(submission.scores) if submission.scores else 0
        }
    
    submission_id = await asyncio.get_event_loop().run_in_executor(
        executor, DatabaseManager.save_submission, test_id, submission.answers, submission.scores, performance_metrics
    )
    
    questions_with_answers = []
    for i, question in enumerate(test_data['test_data']):
        question_result = {
            'question_index': i,
            'question': question.get('question', ''),
            'type': question.get('type', ''),
            'difficulty': question.get('difficulty', ''),
            'tags': question.get('tags', []),
            'user_answer': submission.answers.get(str(i), ''),
            'user_score': submission.scores.get(str(i), None)
        }
        
        if question.get('type') == 'mcq':
            question_result['correct_answer'] = question.get('correct_answer')
            question_result['options'] = question.get('options', {})
        elif question.get('type') == 'true_false':
            question_result['correct_answer'] = question.get('correct_answer')
        elif question.get('type') in ['short_answer', 'long_answer']:
            question_result['sample_answer'] = question.get('sample_answer', '')
            question_result['key_points'] = question.get('key_points', [])
        elif question.get('type') == 'fill_blanks':
            question_result['correct_answer'] = question.get('correct_answer')
        elif question.get('type') == 'multi_select':
            question_result['correct_answers'] = question.get('correct_answers', [])
            question_result['options'] = question.get('options', {})
        
        question_result['explanation'] = format_text(question.get('explanation', ''))
        questions_with_answers.append(question_result)
    
    return {
        "submission_id": submission_id, 
        "message": "Test submitted successfully",
        "questions_with_answers": questions_with_answers,
        "test_name": test_data['test_name'],
        "test_type": test_data.get('test_type', 'normal'),
        "estimated_time": test_data.get('estimated_time', 0),
        "performance_metrics": performance_metrics
    }

@app.post("/api/submissions/{submission_id}/update-scores")
async def update_submission_scores(submission_id: str, score_data: ScoreUpdate):
    """Allow users to update their self-assessment scores"""
    await asyncio.get_event_loop().run_in_executor(
        executor, DatabaseManager.update_submission_scores, submission_id, score_data.scores
    )
    return {"message": "Scores updated successfully"}

@app.get("/api/tests/{test_id}/submissions")
async def get_test_submissions(test_id: str):
    def _get_submissions():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT submission_id, submitted_at, user_answers, user_scores, performance_metrics FROM test_submissions WHERE test_id = ? ORDER BY submitted_at DESC', (test_id,))
            return [{'submission_id': r[0], 'submitted_at': r[1], 'user_answers': json.loads(r[2]), 'user_scores': json.loads(r[3] or '{}'), 'performance_metrics': json.loads(r[4] or '{}')} for r in cursor.fetchall()]
    
    submissions = await asyncio.get_event_loop().run_in_executor(executor, _get_submissions)
    return {"submissions": submissions}

@app.get("/api/submissions/{submission_id}")
async def get_submission_details(submission_id: str):
    def _get_submission():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT ts.submission_id, ts.test_id, ts.user_answers, ts.submitted_at, ts.user_scores, ts.performance_metrics,
                       t.test_name, t.test_data, t.difficulty, t.num_questions, t.estimated_time, t.tags, t.test_type
                FROM test_submissions ts
                JOIN tests t ON ts.test_id = t.test_id
                WHERE ts.submission_id = ?
            ''', (submission_id,))
            return cursor.fetchone()
    
    row = await asyncio.get_event_loop().run_in_executor(executor, _get_submission)
    if not row:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {
        "submission": {
            "submission_id": row[0],
            "test_id": row[1], 
            "user_answers": json.loads(row[2]),
            "submitted_at": row[3],
            "user_scores": json.loads(row[4] or '{}'),
            "performance_metrics": json.loads(row[5] or '{}')
        },
        "test": {
            "test_name": row[6],
            "test_data": json.loads(row[7]),
            "difficulty": row[8],
            "num_questions": row[9],
            "estimated_time": row[10],
            "tags": json.loads(row[11] or '[]'),
            "test_type": row[12]
        }
    }

# Feedback Routes
@app.post("/api/explain-answer")
async def explain_answer(explanation_data: AnswerExplanation):
    if not all([explanation_data.question_data, explanation_data.submission_id]):
        raise HTTPException(status_code=400, detail="Missing required data")
    
    explanation = await asyncio.get_event_loop().run_in_executor(
        executor, AnswerExplainer.explain_answer, explanation_data.question_data, explanation_data.user_answer
    )
    
    await asyncio.get_event_loop().run_in_executor(
        executor, DatabaseManager.save_ai_feedback, explanation_data.submission_id, explanation_data.question_index, explanation
    )
    
    return {"explanation": explanation}

@app.get("/api/submissions/{submission_id}/feedback")
async def get_submission_feedback(submission_id: str):
    def _get_feedback():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT question_index, feedback_text, created_at FROM ai_feedback WHERE submission_id = ?', (submission_id,))
            return {r[0]: {'feedback_text': r[1], 'created_at': r[2]} for r in cursor.fetchall()}
    
    feedback = await asyncio.get_event_loop().run_in_executor(executor, _get_feedback)
    return {"feedback": feedback}

# Performance Analytics Routes
@app.get("/api/folders/{folder_id}/performance-analytics")
async def get_folder_performance_analytics(folder_id: str):
    """Get comprehensive performance analytics for a folder"""
    analysis = await asyncio.get_event_loop().run_in_executor(
        executor, PerformanceAnalyzer.analyze_comprehensive_test_performance, folder_id
    )
    return analysis

@app.get("/api/folders/{folder_id}/performance-insights")
async def get_folder_performance_insights(folder_id: str):
    """Get AI-powered insights from comprehensive test performance"""
    insights = await asyncio.get_event_loop().run_in_executor(
        executor, PerformanceAnalyzer.generate_performance_insights, folder_id
    )
    return insights

@app.get("/api/folders/{folder_id}/comprehensive-submissions")
async def get_folder_comprehensive_submissions(folder_id: str):
    """Get all comprehensive test submissions for a folder"""
    submissions = await asyncio.get_event_loop().run_in_executor(
        executor, DatabaseManager.get_folder_comprehensive_submissions, folder_id
    )
    return {"submissions": submissions}

# Bulk Operations
@app.post("/api/tests/bulk-delete")
async def delete_multiple_tests(bulk_data: BulkDelete):
    if not bulk_data.test_ids:
        raise HTTPException(status_code=400, detail="No test IDs provided")
    
    def _delete_tests():
        with db_lock:
            with sqlite3.connect(app_config['DATABASE']) as conn:
                cursor = conn.cursor()
                placeholders = ','.join(['?' for _ in bulk_data.test_ids])
                cursor.execute(f'DELETE FROM tests WHERE test_id IN ({placeholders})', bulk_data.test_ids)
                deleted_count = cursor.rowcount
                conn.commit()
                return deleted_count
    
    deleted_count = await asyncio.get_event_loop().run_in_executor(executor, _delete_tests)
    return {"message": f"Successfully deleted {deleted_count} test(s)"}

# Replace the existing chatbot routes in appfast.py with these updated routes

# Enhanced Chatbot Routes
@app.post("/api/chat/init")
async def initialize_chat(
    context_data: ChatContextUpdate,
    session_id: str = Depends(get_session_id)
):
    """Initialize chat context with selected folder and content"""
    context = await asyncio.get_event_loop().run_in_executor(
        executor, Chatbot.initialize_chat_context, session_id, 
        context_data.folder_id, context_data.selected_link_ids,
        context_data.selected_test_ids, context_data.selected_submission_ids
    )
    
    # Prepare context summary for response
    context_summary = {
        "session_id": session_id,
        "folder_name": context.get('context_data', {}).get('folder', {}).get('name'),
        "selected_content_count": {
            "links": len(context.get('selected_link_ids', [])),
            "tests": len(context.get('selected_test_ids', [])),
            "submissions": len(context.get('selected_submission_ids', []))
        }
    }
    
    return {
        "message": "Chat context initialized successfully",
        "context": context_summary
    }

@app.post("/api/chat/update-context")
async def update_chat_context(
    context_data: ChatContextUpdate,
    session_id: str = Depends(get_session_id)
):
    """Update chat context with new selections"""
    context = await asyncio.get_event_loop().run_in_executor(
        executor, Chatbot.update_chat_context, session_id,
        context_data.folder_id, context_data.selected_link_ids,
        context_data.selected_test_ids, context_data.selected_submission_ids
    )
    
    context_summary = {
        "session_id": session_id,
        "folder_name": context.get('context_data', {}).get('folder', {}).get('name'),
        "selected_content_count": {
            "links": len(context.get('selected_link_ids', [])),
            "tests": len(context.get('selected_test_ids', [])),
            "submissions": len(context.get('selected_submission_ids', []))
        }
    }
    
    return {
        "message": "Chat context updated successfully",
        "context": context_summary
    }

@app.post("/api/chat/message")
async def send_chat_message(
    chat_data: ChatMessage,
    session_id: str = Depends(get_session_id)
):
    """Send message to AI with current context"""
    if not chat_data.message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    response = await asyncio.get_event_loop().run_in_executor(
        executor, Chatbot.generate_response, session_id, chat_data.message, chat_data.question_index
    )
    
    return {
        "response": response,
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id
    }

@app.get("/api/chat/history")
async def get_chat_history(session_id: str = Depends(get_session_id)):
    """Get chat history for current session"""
    context = await asyncio.get_event_loop().run_in_executor(
        executor, Chatbot.get_chat_context, session_id
    )
    
    if not context:
        return {
            "chat_history": [],
            "context_summary": None
        }
    
    context_summary = {
        "folder_name": context.get('context_data', {}).get('folder', {}).get('name'),
        "selected_content_count": {
            "links": len(context.get('selected_link_ids', [])),
            "tests": len(context.get('selected_test_ids', [])),
            "submissions": len(context.get('selected_submission_ids', []))
        }
    }
    
    return {
        "chat_history": context['chat_history'],
        "context_summary": context_summary
    }

@app.post("/api/chat/clear")
async def clear_chat_history(session_id: str = Depends(get_session_id)):
    """Clear chat history while keeping context"""
    if session_id in chat_sessions:
        chat_sessions[session_id]['chat_history'] = []
        return {"message": "Chat history cleared successfully"}
    
    return {"message": "No active chat session found"}

@app.get("/api/chat/context")
async def get_chat_context_info(session_id: str = Depends(get_session_id)):
    """Get current chat context information"""
    context = await asyncio.get_event_loop().run_in_executor(
        executor, Chatbot.get_chat_context, session_id
    )
    
    if not context:
        return {"context": None}
    
    context_info = {
        "session_id": session_id,
        "folder_id": context.get('folder_id'),
        "folder_name": context.get('context_data', {}).get('folder', {}).get('name'),
        "selected_content": {
            "links": [],
            "tests": [],
            "submissions": []
        }
    }
    
    # Add link information
    if context.get('context_data', {}).get('links'):
        for link_id, link_data in context['context_data']['links'].items():
            context_info["selected_content"]["links"].append({
                "link_id": link_id,
                "title": link_data.get('custom_name') or link_data.get('title', 'Unknown'),
                "url": link_data.get('url', ''),
                "link_type": link_data.get('link_type', 'url')
            })
    
    # Add test information
    if context.get('context_data', {}).get('tests'):
        for test_data in context['context_data']['tests']:
            context_info["selected_content"]["tests"].append({
                "test_id": test_data['test_id'],
                "test_name": test_data['test_name'],
                "difficulty": test_data['difficulty'],
                "num_questions": len(test_data['test_data']),
                "question_types": test_data['question_types']
            })
    
    # Add submission information
    if context.get('context_data', {}).get('submissions'):
        for submission in context['context_data']['submissions']:
            avg_score = sum(submission['user_scores'].values()) / len(submission['user_scores']) if submission['user_scores'] else 0
            context_info["selected_content"]["submissions"].append({
                "submission_id": submission['submission_id'],
                "test_name": submission['test_name'],
                "submitted_at": submission['submitted_at'],
                "average_score": round(avg_score, 1),
                "total_questions": len(submission['user_answers'])
            })
    
    return {"context": context_info}

# Helper endpoint to get available content for a folder
@app.get("/api/folders/{folder_id}/available-content")
async def get_folder_available_content(folder_id: str):
    """Get all available content in a folder for chat context selection"""
    
    def _get_available_content():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            
            # Get folder info
            cursor.execute('SELECT folder_name, description FROM folders WHERE folder_id = ?', (folder_id,))
            folder_info = cursor.fetchone()
            if not folder_info:
                return None
            
            # Get links
            cursor.execute('''
                SELECT link_id, url, title, custom_name, link_type, created_at, content_preview
                FROM links WHERE folder_id = ? ORDER BY created_at DESC
            ''', (folder_id,))
            links = [{
                'link_id': r[0],
                'url': r[1],
                'title': r[2],
                'custom_name': r[3],
                'display_name': r[3] or r[2],
                'link_type': r[4],
                'created_at': r[5],
                'content_preview': r[6]
            } for r in cursor.fetchall()]
            
            # Get tests
            cursor.execute('''
                SELECT test_id, test_name, difficulty, num_questions, created_at, question_types, tags, test_type
                FROM tests WHERE folder_id = ? ORDER BY created_at DESC
            ''', (folder_id,))
            tests = [{
                'test_id': r[0],
                'test_name': r[1],
                'difficulty': r[2],
                'num_questions': r[3],
                'created_at': r[4],
                'question_types': json.loads(r[5] or '[]'),
                'tags': json.loads(r[6] or '[]'),
                'test_type': r[7]
            } for r in cursor.fetchall()]
            
            # Get submissions for folder tests
            test_ids = [test['test_id'] for test in tests]
            submissions = []
            if test_ids:
                placeholders = ','.join(['?' for _ in test_ids])
                cursor.execute(f'''
                    SELECT ts.submission_id, ts.test_id, ts.submitted_at, ts.user_scores, 
                           t.test_name, t.num_questions
                    FROM test_submissions ts
                    JOIN tests t ON ts.test_id = t.test_id
                    WHERE ts.test_id IN ({placeholders})
                    ORDER BY ts.submitted_at DESC
                ''', test_ids)
                
                submissions = []
                for r in cursor.fetchall():
                    user_scores = json.loads(r[3] or '{}')
                    avg_score = sum(user_scores.values()) / len(user_scores) if user_scores else 0
                    submissions.append({
                        'submission_id': r[0],
                        'test_id': r[1],
                        'submitted_at': r[2],
                        'test_name': r[4],
                        'num_questions': r[5],
                        'average_score': round(avg_score, 1)
                    })
            
            return {
                'folder': {
                    'folder_id': folder_id,
                    'name': folder_info[0],
                    'description': folder_info[1]
                },
                'links': links,
                'tests': tests,
                'submissions': submissions
            }
    
    content = await asyncio.get_event_loop().run_in_executor(executor, _get_available_content)
    if not content:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return content

# Search and Filter Routes
@app.get("/api/search/tests")
async def search_tests(
    q: Optional[str] = None,
    difficulty: Optional[str] = None,
    folder_id: Optional[str] = None,
    test_type: Optional[str] = None
):
    def _search_tests():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            sql = '''
                SELECT test_id, test_name, created_at, num_questions, difficulty, estimated_time, tags, folder_id, test_type
                FROM tests WHERE 1=1
            '''
            params = []
            
            if q:
                sql += ' AND (test_name LIKE ? OR tags LIKE ?)'
                params.extend([f'%{q}%', f'%{q}%'])
            
            if difficulty:
                sql += ' AND difficulty = ?'
                params.append(difficulty)
                
            if folder_id:
                sql += ' AND folder_id = ?'
                params.append(folder_id)
                
            if test_type:
                sql += ' AND test_type = ?'
                params.append(test_type)
            
            sql += ' ORDER BY created_at DESC'
            
            cursor.execute(sql, params)
            return [{
                'test_id': r[0], 'test_name': r[1], 'created_at': r[2], 
                'num_questions': r[3], 'difficulty': r[4], 'estimated_time': r[5], 
                'tags': json.loads(r[6] or '[]'), 'folder_id': r[7], 'test_type': r[8]
            } for r in cursor.fetchall()]
    
    tests = await asyncio.get_event_loop().run_in_executor(executor, _search_tests)
    return {"tests": tests}

# Dashboard/Statistics Routes
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get overall dashboard statistics"""
    def _get_stats():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            
            # Basic counts
            cursor.execute('SELECT COUNT(*) FROM folders')
            total_folders = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM links')
            total_links = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM tests')
            total_tests = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM test_submissions')
            total_submissions = cursor.fetchone()[0]
            
            # Test type distribution
            cursor.execute('SELECT test_type, COUNT(*) FROM tests GROUP BY test_type')
            test_type_distribution = {r[0]: r[1] for r in cursor.fetchall()}
            
            # Recent activity
            cursor.execute('''
                SELECT test_name, created_at, test_type 
                FROM tests 
                ORDER BY created_at DESC 
                LIMIT 5
            ''')
            recent_tests = [{'test_name': r[0], 'created_at': r[1], 'test_type': r[2]} for r in cursor.fetchall()]
            
            cursor.execute('''
                SELECT ts.submitted_at, t.test_name, t.test_type
                FROM test_submissions ts
                JOIN tests t ON ts.test_id = t.test_id
                ORDER BY ts.submitted_at DESC
                LIMIT 5
            ''')
            recent_submissions = [{'submitted_at': r[0], 'test_name': r[1], 'test_type': r[2]} for r in cursor.fetchall()]
            
            return {
                "overview": {
                    "total_folders": total_folders,
                    "total_links": total_links,
                    "total_tests": total_tests,
                    "total_submissions": total_submissions
                },
                "test_type_distribution": test_type_distribution,
                "recent_activity": {
                    "recent_tests": recent_tests,
                    "recent_submissions": recent_submissions
                }
            }
    
    stats = await asyncio.get_event_loop().run_in_executor(executor, _get_stats)
    return stats

# Export/Import Routes
@app.get("/api/folders/{folder_id}/export")
async def export_folder_data(folder_id: str):
    """Export folder data including tests and submissions"""
    def _export_data():
        with sqlite3.connect(app_config['DATABASE']) as conn:
            cursor = conn.cursor()
            
            # Get folder info
            cursor.execute('SELECT folder_name, description FROM folders WHERE folder_id = ?', (folder_id,))
            folder_info = cursor.fetchone()
            if not folder_info:
                return None
            
            # Get all tests
            cursor.execute('SELECT * FROM tests WHERE folder_id = ?', (folder_id,))
            tests = cursor.fetchall()
            
            # Get all submissions for these tests
            test_ids = [test[0] for test in tests]
            if test_ids:
                placeholders = ','.join(['?' for _ in test_ids])
                cursor.execute(f'SELECT * FROM test_submissions WHERE test_id IN ({placeholders})', test_ids)
                submissions = cursor.fetchall()
            else:
                submissions = []
            
            return {
                "folder": {
                    "name": folder_info[0],
                    "description": folder_info[1],
                    "exported_at": datetime.now().isoformat()
                },
                "tests": [dict(zip([col[0] for col in cursor.description], test)) for test in tests],
                "submissions": [dict(zip([col[0] for col in cursor.description], sub)) for sub in submissions]
            }
    
    export_data = await asyncio.get_event_loop().run_in_executor(executor, _export_data)
    if not export_data:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return export_data

@app.get("/api/session/info")
async def get_session_info(session_id: str = Depends(get_session_id)):
    """Get current session information"""
    active_chats = []
    
    if session_id in chat_sessions:
        context = chat_sessions[session_id]
        active_chats.append({
            "test_id": context['test_id'],
            "test_name": context['test_name'],
            "chat_count": len(context['chat_history'])
        })
    
    return {
        "session_id": session_id,
        "active_chats": active_chats
    }

# Error Handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

@app.exception_handler(400)
async def bad_request_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=400,
        content={"error": "Bad request"}
    )

# Additional utility endpoints for development
@app.get("/api/dev/clear-sessions")
async def clear_all_sessions():
    """Development endpoint to clear all chat sessions"""
    global chat_sessions
    chat_sessions.clear()
    return {"message": "All chat sessions cleared"}

@app.get("/api/dev/session-count")
async def get_session_count():
    """Development endpoint to get active session count"""
    return {"active_sessions": len(chat_sessions)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)