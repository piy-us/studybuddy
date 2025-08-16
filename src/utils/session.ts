// src/utils/session.ts
export function getOrCreateSessionId(): string {
  const STORAGE_KEY = 'chatbot_session_id';
  
  try {
    // Check if we already have a session ID
    let sessionId = sessionStorage.getItem(STORAGE_KEY);
    
    if (!sessionId) {
      // Generate a new session ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(STORAGE_KEY, sessionId);
    }
    
    return sessionId;
  } catch (error) {
    // Fallback if sessionStorage is not available
    console.warn('SessionStorage not available, using temporary session ID');
    return `temp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem('chatbot_session_id');
  } catch (error) {
    console.warn('Failed to clear session:', error);
  }
}

export function getCurrentSessionId(): string | null {
  try {
    return sessionStorage.getItem('chatbot_session_id');
  } catch (error) {
    return null;
  }
}