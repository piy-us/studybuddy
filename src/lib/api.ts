// src/lib/api.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Enhanced error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API Error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
      url: err.config?.url
    });
    
    // Create a normalized error object
    const normalizedError = {
      message: err.response?.data?.detail || err.response?.data?.message || err.message || "An unknown error occurred",
      status: err.response?.status,
      data: err.response?.data
    };
    
    return Promise.reject(normalizedError);
  }
);

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (err) => {
    console.error("Request Error:", err);
    return Promise.reject(err);
  }
);

// ----------------- Folders -----------------
function getOrCreateSessionId(): string {
  // Since we can't use localStorage in artifacts, we'll use a simple in-memory approach
  // In your actual implementation, this should use localStorage as you have it
  if (typeof window !== 'undefined' && window.localStorage) {
    let sessionId = localStorage.getItem('quiz-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('quiz-session-id', sessionId);
    }
    return sessionId;
  }
  // Fallback for when localStorage isn't available
  return 'session-' + Date.now();
}

/** Primary folder list (backend returns { folders: [...] }) */
export async function getFolders() {
  try {
    const res = await api.get("/api/folders");
    return res.data?.folders ?? res.data ?? [];
  } catch (error) {
    console.error("Error fetching folders:", error);
    throw error;
  }
}

/** Backwards-compatible alias some pages expect */
export async function getAllFolders() {
  return getFolders();
}

/** Create folder: backend expects { folder_name, description? } */
export async function createFolder(payload: { folder_name: string; description?: string }) {
  try {
    const res = await api.post("/api/folders", {
      folder_name: payload.folder_name,
      description: payload.description ?? "",
    });
    return res.data;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw error;
  }
}

/** Delete folder */
export async function deleteFolder(folderId: string) {
  try {
    const res = await api.delete(`/api/folders/${folderId}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting folder:", error);
    throw error;
  }
}

/** Folder links/tests */
export async function getFolderLinks(folderId: string) {
  try {
    const res = await api.get(`/api/folders/${folderId}/links`);
    return res.data?.links ?? [];
  } catch (error) {
    console.error("Error fetching folder links:", error);
    throw error;
  }
}

export async function getFolderTests(folderId: string) {
  try {
    const res = await api.get(`/api/folders/${folderId}/tests`);
    return res.data?.tests ?? [];
  } catch (error) {
    console.error("Error fetching folder tests:", error);
    throw error;
  }
}

/** Add multiple URLs to a folder: { urls: [...], custom_names?: {...} } */
export async function addLinksToFolder(
  folderId: string,
  urls: string[],
  customNames: Record<string, string> = {}
) {
  try {
    const res = await api.post(`/api/folders/${folderId}/links`, {
      urls,
      custom_names: customNames,
    });
    return res.data;
  } catch (error) {
    console.error("Error adding links to folder:", error);
    throw error;
  }
}

/** Single-link helper (convenience) */
export async function addLinkToFolder(folderId: string, url: string, customName?: string) {
  return addLinksToFolder(folderId, [url], customName ? { [url]: customName } : {});
}

export async function uploadPdfsToFolder(folderId: string, files: File[]) {
  try {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await api.post(`/api/folders/${folderId}/upload-pdf`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return res.data;
  } catch (error) {
    console.error("Error uploading PDFs:", error);
    throw error;
  }
}

export async function deleteLink(linkId: string) {
  try {
    const res = await api.delete(`/api/links/${linkId}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting link:", error);
    throw error;
  }
}

// Bulk delete functions
export async function bulkDeleteLinks(linkIds: string[]) {
    const response = await fetch('/api/links/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_ids: linkIds }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete links');
    }
  
    return response.json();
  }

/** Generate test for a folder (payload: { link_ids, question_types, difficulty, num_questions, test_name? }) */
export async function generateTestFromFolder(folderId: string, payload: any) {
  try {
    const res = await api.post(`/api/folders/${folderId}/generate-test`, payload);
    return res.data;
  } catch (error) {
    console.error("Error generating test from folder:", error);
    throw error;
  }
}

// Generate comprehensive test from all folder content
export async function generateComprehensiveTestFromFolder(
    folderId: string,
    payload: {
      question_types: string[];
      difficulty: string;
      num_questions: number;
      test_name?: string;
    }
  ) {
    const response = await fetch(`/api/folders/${folderId}/generate-comprehensive-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate comprehensive test');
    }
  
    return response.json();
  }
  
export async function deleteTest(testId: string) {
  try {
    const res = await api.delete(`/api/tests/${testId}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting test:", error);
    throw error;
  }
}

export async function bulkDeleteTests(testIds: string[]) {
    const response = await fetch('/api/tests/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_ids: testIds }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete tests');
    }
  
    return response.json();
  }

// ----------------- Quiz / generation -----------------

export async function getAllQuizzes() {
  try {
    const res = await api.get("/api/tests");
    return res.data?.tests ?? [];
  } catch (error) {
    console.error("Error fetching all quizzes:", error);
    throw error;
  }
}

// Get test details - FIXED with proper error handling
export async function getTestDetails(testId: string) {
  try {
    console.log("Fetching test details for ID:", testId);
    const res = await api.get(`/api/tests/${testId}`);
    console.log("Test details response:", res.data);
    return res.data;
  } catch (error: any) {
    console.error("Error fetching test details:", error);
    
    // More specific error messages
    if (error.status === 404) {
      throw new Error(`Test not found (ID: ${testId})`);
    } else if (error.status === 500) {
      throw new Error("Server error while loading test");
    } else if (error.message.includes('timeout')) {
      throw new Error("Request timeout - please try again");
    } else if (error.message.includes('Network Error')) {
      throw new Error("Network error - please check your connection");
    }
    
    throw new Error(error.message || "Failed to load test details");
  }
}
  
export const generateQuiz = async (payload: any, opts?: { multipart?: boolean }) => {
    try {
      if (opts?.multipart) {
        // For multipart form data (when files are included)
        const response = await axios.post(`${API_BASE}/api/generate-quiz-from-pdfs`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        });
        return response;
      } else {
        // For JSON payload (URLs only)
        const response = await axios.post(`${API_BASE}/api/generate-quiz-from-links`, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 120000,
        });
        return response;
      }
    } catch (error) {
      console.error("Error in generateQuiz:", error);
      throw error;
    }
  };
  

  export async function generateQuizFromLinks(
    links: string[],
    numQuestions: number,
    types: string[],
    difficulty: string,
    testName?: string
  ) {
    try {
      const res = await api.post("/api/generate-quiz-from-links", {
        urls: links,  // Backend expects 'urls' not 'links'
        num_questions: numQuestions,
        question_types: types,
        difficulty,
        test_name: testName,
      });
      return res.data;
    } catch (error) {
      console.error("Error generating quiz from links:", error);
      throw error;
    }
  }
  
  export async function generateQuizFromPDFs(formData: FormData) {
    try {
      const res = await api.post("/api/generate-quiz-from-pdfs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      return res.data;
    } catch (error) {
      console.error("Error generating quiz from PDFs:", error);
      throw error;
    }
  }
// Alternative implementation for mixed content (both files and URLs)
export async function generateQuizMixed(formData: FormData) {
    try {
      const res = await api.post("/api/generate-quiz-mixed", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      return res.data;
    } catch (error) {
      console.error("Error generating mixed quiz:", error);
      throw error;
    }
  }
  
export async function getQuizResult(quizId: string) {
  try {
    const res = await api.get(`/api/tests/${quizId}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching quiz result:", error);
    throw error;
  }
}

export async function submitQuizAnswers(testId: string, answers: any, scores?: any) {
  try {
    const res = await api.post(`/api/tests/${testId}/submit`, { 
      answers, 
      scores: scores || {} 
    });
    return res.data;
  } catch (error) {
    console.error("Error submitting quiz answers:", error);
    throw error;
  }
}

// Update self-assessment scores
export async function updateSubmissionScores(
    submissionId: string,
    scores: Record<number, number>
  ) {
    const response = await fetch(`/api/submissions/${submissionId}/update-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update scores');
    }
  
    return response.json();
  }

// ----------------- Submissions and Results -----------------

// Get test submissions for a test
export async function getTestSubmissions(testId: string) {
    const response = await fetch(`/api/tests/${testId}/submissions`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch test submissions');
    }
    
    return response.json();
  }

// Get submission details
export async function getSubmissionDetails(submissionId: string) {
  const response = await fetch(`/api/submissions/${submissionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch submission details');
  }
  
  return response.json();
}


export async function getSubmissionFeedback(submissionId: string) {
  try {
    const res = await api.get(`/api/submissions/${submissionId}/feedback`);
    return res.data?.feedback ?? {};
  } catch (error) {
    console.error("Error fetching submission feedback:", error);
    throw error;
  }
}

export async function explainAnswer(questionData: any, userAnswer: string, submissionId: string, questionIndex: number) {
  try {
    const res = await api.post("/api/explain-answer", {
      question_data: questionData,
      user_answer: userAnswer,
      submission_id: submissionId,
      question_index: questionIndex,
    });
    return res.data;
  } catch (error) {
    console.error("Error explaining answer:", error);
    throw error;
  }
}

// ----------------- Enhanced Chatbot and AI -----------------

// Initialize chat with context
export async function initializeChat(contextData: {
  folder_id?: string;
  selected_link_ids?: string[];
  selected_test_ids?: string[];
  selected_submission_ids?: string[];
}, sessionId?: string) {
  try {
    const headers = sessionId ? { 'x-session-id': sessionId } : {};
    const res = await api.post('/api/chat/init', {
      folder_id: contextData.folder_id,
      selected_link_ids: contextData.selected_link_ids || [],
      selected_test_ids: contextData.selected_test_ids || [],
      selected_submission_ids: contextData.selected_submission_ids || []
    }, { headers });
    return res.data;
  } catch (error) {
    console.error("Error initializing chat:", error);
    throw error;
  }
}

// Update chat context
export async function updateChatContext(contextData: {
  folder_id?: string;
  selected_link_ids?: string[];
  selected_test_ids?: string[];
  selected_submission_ids?: string[];
}, sessionId?: string) {
  try {
    const headers = sessionId ? { 'x-session-id': sessionId } : {};
    const res = await api.post('/api/chat/update-context', {
      folder_id: contextData.folder_id,
      selected_link_ids: contextData.selected_link_ids || [],
      selected_test_ids: contextData.selected_test_ids || [],
      selected_submission_ids: contextData.selected_submission_ids || []
    }, { headers });
    return res.data;
  } catch (error) {
    console.error("Error updating chat context:", error);
    throw error;
  }
}

// Send chat message
export async function sendChatMessage(
  message: string,
  questionIndex?: number,
  sessionId?: string
) {
  try {
    const headers = sessionId ? { 'x-session-id': sessionId } : {};
    const res = await api.post('/api/chat/message', {
      message,
      question_index: questionIndex,
    }, { headers });
    return res.data;
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
  }
}

// Get chat history
export async function getChatHistory(sessionId?: string) {
  try {
    const headers = sessionId ? { 'x-session-id': sessionId } : {};
    const res = await api.get('/api/chat/history', { headers });
    return res.data;
  } catch (error) {
    console.error("Error getting chat history:", error);
    throw error;
  }
}

// Clear chat history
export async function clearChatHistory(sessionId?: string) {
  try {
    const headers = sessionId ? { 'x-session-id': sessionId } : {};
    const res = await api.post('/api/chat/clear', {}, { headers });
    return res.data;
  } catch (error) {
    console.error("Error clearing chat history:", error);
    throw error;
  }
}

// Get chat context information
export async function getChatContext(sessionId?: string) {
  try {
    const headers = sessionId ? { 'x-session-id': sessionId } : {};
    const res = await api.get('/api/chat/context', { headers });
    return res.data;
  } catch (error) {
    console.error("Error getting chat context:", error);
    throw error;
  }
}

// Get available content for folder (for context selection)
export async function getFolderAvailableContent(folderId: string) {
  try {
    const res = await api.get(`/api/folders/${folderId}/available-content`);
    return res.data;
  } catch (error) {
    console.error("Error getting folder available content:", error);
    throw error;
  }
}

// Legacy compatibility - map old test chat functions to new general chat
export async function initializeChatForTest(testId: string, sessionId?: string) {
  console.warn("initializeChatForTest is deprecated. Use initializeChat with selected_test_ids instead.");
  return initializeChat({ selected_test_ids: [testId] }, sessionId);
}

export async function chatWithTest(testId: string, message: string, questionIndex?: number, sessionId?: string) {
  console.warn("chatWithTest is deprecated. Use sendChatMessage instead.");
  // For backward compatibility, we can still support this by updating context first
  try {
    await updateChatContext({ selected_test_ids: [testId] }, sessionId);
    return sendChatMessage(message, questionIndex, sessionId);
  } catch (error) {
    console.error("Error in legacy chatWithTest:", error);
    throw error;
  }
}

// Old test-specific chat functions (keep for backward compatibility)
export async function initializeTestChat(testId: string, sessionId?: string) {
  return initializeChatForTest(testId, sessionId);
}

// ----------------- Performance Analytics -----------------

// Get folder performance analytics
export async function getFolderPerformanceAnalytics(folderId: string) {
    const response = await fetch(`/api/folders/${folderId}/performance-analytics`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch performance analytics');
    }
    
    return response.json();
  }

// Get folder performance insights
export async function getFolderPerformanceInsights(folderId: string) {
    const response = await fetch(`/api/folders/${folderId}/performance-insights`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch performance insights');
    }
    
    return response.json();
  }

export async function getFolderComprehensiveSubmissions(folderId: string) {
  try {
    const res = await api.get(`/api/folders/${folderId}/comprehensive-submissions`);
    return res.data?.submissions ?? [];
  } catch (error) {
    console.error("Error fetching folder comprehensive submissions:", error);
    throw error;
  }
}

// ----------------- Search and Dashboard -----------------

export async function searchTests(params: {
  q?: string;
  difficulty?: string;
  folder_id?: string;
  test_type?: string;
}) {
  try {
    const res = await api.get("/api/search/tests", { params });
    return res.data?.tests ?? [];
  } catch (error) {
    console.error("Error searching tests:", error);
    throw error;
  }
}

export async function getStatsOverview() {
  try {
    const res = await api.get("/api/dashboard/stats");
    const data = res.data?.overview ?? {};

    return [
      {
        label: "Quizzes Taken",
        value: data.total_tests?.toString() ?? "0",
        change: "",
        icon: "BookOpen",
        trend: "neutral",
      },
      {
        label: "Avg Score",
        value: "—",
        change: "",
        icon: "Award",
        trend: "neutral",
      },
      {
        label: "Study Time",
        value: "—",
        change: "",
        icon: "Clock",
        trend: "neutral",
      },
      {
        label: "Folders",
        value: data.total_folders?.toString() ?? "0",
        change: "",
        icon: "TrendingUp",
        trend: "neutral",
      },
    ];
  } catch (error) {
    console.error("Error fetching stats overview:", error);
    throw error;
  }
}

// Get dashboard stats
export async function getDashboardStats() {
    const response = await fetch('/api/dashboard/stats');
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    
    return response.json();
  }

// ----------------- Export/Import -----------------

export async function exportFolderData(folderId: string) {
  try {
    const res = await api.get(`/api/folders/${folderId}/export`);
    return res.data;
  } catch (error) {
    console.error("Error exporting folder data:", error);
    throw error;
  }
}

// ----------------- Session Management -----------------

export async function getSessionInfo() {
  try {
    const res = await api.get("/api/session/info");
    return res.data;
  } catch (error) {
    console.error("Error fetching session info:", error);
    throw error;
  }
}

// ----------------- Development/Utilities -----------------

export async function clearAllSessions() {
  try {
    const res = await api.get("/api/dev/clear-sessions");
    return res.data;
  } catch (error) {
    console.error("Error clearing all sessions:", error);
    throw error;
  }
}

export async function getSessionCount() {
  try {
    const res = await api.get("/api/dev/session-count");
    return res.data;
  } catch (error) {
    console.error("Error fetching session count:", error);
    throw error;
  }
}

// ----------------- Health Check -----------------

export async function healthCheck() {
  try {
    const res = await api.get("/api/health");
    return res.data;
  } catch (error) {
    console.error("Error checking API health:", error);
    throw error;
  }
}

// Get AI explanation for an answer
export async function getAnswerExplanation(
    submissionId: string,
    questionData: any,
    questionIndex: number,
    userAnswer: string
  ) {
    const response = await fetch('/api/explain-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_data: questionData,
        submission_id: submissionId,
        question_index: questionIndex,
        user_answer: userAnswer,
      }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to get explanation');
    }
  
    return response.json();
  }
  
// Submit test answers - FIXED with proper error handling
export async function submitTest(
    testId: string,
    answers: Record<number, string>,
    scores?: Record<number, number>
  ) {
    try {
      console.log("Submitting test:", { testId, answers, scores });
      const res = await api.post(`/api/tests/${testId}/submit`, {
        answers,
        scores: scores || {}
      });
      console.log("Submit response:", res.data);
      return res.data;
    } catch (error: any) {
      console.error("Error submitting test:", error);
      
      if (error.status === 404) {
        throw new Error(`Test not found (ID: ${testId})`);
      } else if (error.status === 400) {
        throw new Error("Invalid submission data");
      } else if (error.status === 500) {
        throw new Error("Server error while submitting test");
      }
      
      throw new Error(error.message || "Failed to submit test");
    }
  }

// ----------------- Compatibility wrappers -----------------
/**
 * Many existing components call these old names – keep wrappers so we don't need to change every import.
 * - addLink(folderId, url)
 * - generateTest(folderId, linkIds, options)
 */
export const addLink = async (folderId: string, url: string) => {
  return addLinkToFolder(folderId, url);
};

export const generateTest = async (
  folderId: string,
  linkIds: string[],
  options: { question_types: string[]; difficulty: string; num_questions: number; test_name?: string }
) => {
  return generateTestFromFolder(folderId, { link_ids: linkIds, ...options });
};

export default api;