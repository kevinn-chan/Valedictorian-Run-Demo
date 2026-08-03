// sessionStorage key holding the shared sign-in password for the current tab.
// Written by the login form, read by the sidebar's profile switcher so a switch
// can re-submit /api/profile-login without a second password prompt. Tab-scoped
// on purpose: closing the tab drops it, and it is never written to localStorage.
export const SHARED_PASSWORD_KEY = "vr_shared_pw";
