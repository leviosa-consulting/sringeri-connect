import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged, 
  User,
  updateProfile
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const DEEP_LINK_URL = "sevaconnect://auth";

function isMobileWebView(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  
  if (!isMobile) {
    return false;
  }
  
  const isWebView = 
    /(wv|webview)/i.test(userAgent) ||
    /\bwv\b/.test(userAgent) ||
    (userAgent.includes('Android') && userAgent.includes('Version/')) ||
    (window as any).ReactNativeWebView !== undefined ||
    (window as any).flutter_inappwebview !== undefined ||
    userAgent.includes('SevaConnect') ||
    (userAgent.includes('iPhone') || userAgent.includes('iPad')) && !userAgent.includes('Safari') ||
    document.referrer.includes('android-app://');
  
  const isStandalonePWA = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator as any).standalone === true;
  
  return isWebView || isStandalonePWA;
}

function redirectToMobileApp(): void {
  if (isMobileWebView()) {
    window.location.href = DEEP_LINK_URL;
  }
}

getRedirectResult(auth).then((result) => {
  if (result?.user) {
    redirectToMobileApp();
  }
}).catch((error) => {
  console.error("Error handling redirect result:", error);
});

export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  redirectToMobileApp();
  return result;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  redirectToMobileApp();
  return userCredential;
}

export async function loginWithGoogle() {
  return signInWithRedirect(auth, googleProvider);
}

export async function logout() {
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { isMobileWebView };
