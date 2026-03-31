export function isLoginSuccessful(response) {
    return response.status === 'OK' || response.message?.includes('team member exist');
}

export function extractToken(response) {
    return response.result?.access_token || null;
}

export function extractUserData(data) {
    return {
      id: data.result.team_member_id,
      name: data.result.team_member_name,
      role: data.result.role_display_name,
      mobile: data.result.mobile_number,
      executiveMobile: data.result.executive_mobile_number,
      departments: safeParseJSON(data.result.departments),
    };
}
  
function safeParseJSON(jsonString) {
try {
    return JSON.parse(jsonString || '[]');
} catch {
    return [];
}
}