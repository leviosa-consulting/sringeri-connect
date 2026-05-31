import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signInAnonymously,
  GoogleAuthProvider,
  OAuthProvider,
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
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
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

function isInReactNativeWebView(): boolean {
  return (window as any).ReactNativeWebView !== undefined;
}

function isInWebView(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  if (isInReactNativeWebView()) {
    return true;
  }
  
  const isAndroidWebView = 
    userAgent.includes('wv') ||
    (userAgent.includes('Android') && userAgent.includes('Version/'));
  
  const isIOSWebView = 
    (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) && 
    !userAgent.includes('Safari');
  
  const hasWebViewGlobals = (window as any).flutter_inappwebview !== undefined;
  
  const hasCustomWebViewIndicator = 
    userAgent.includes('SevaConnect') || 
    document.referrer.includes('sevaconnect');
  
  return isAndroidWebView || isIOSWebView || hasWebViewGlobals || hasCustomWebViewIndicator;
}

function requestNativeGoogleSignIn(): void {
  if ((window as any).ReactNativeWebView) {
    (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'GOOGLE_SIGNIN_REQUEST' }));
  }
}

type NativeAuthCallback = {
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
  onCancelled?: () => void;
};

let pendingNativeAuthCallback: NativeAuthCallback | null = null;

async function handleGoogleAuthResponse(payload: { accessToken?: string; idToken: string; expiresIn?: number }) {
  try {
    const credential = GoogleAuthProvider.credential(payload.idToken, payload.accessToken);
    const result = await signInWithCredential(auth, credential);
    console.log("Signed in via native Google:", result.user);
    if (pendingNativeAuthCallback?.onSuccess) {
      pendingNativeAuthCallback.onSuccess(result.user);
    }
    pendingNativeAuthCallback = null;
    return result;
  } catch (error) {
    console.error("Error signing in with native credential:", error);
    if (pendingNativeAuthCallback?.onError) {
      pendingNativeAuthCallback.onError(error as Error);
    }
    pendingNativeAuthCallback = null;
    throw error;
  }
}

window.addEventListener('message', (event) => {
  let data = event.data;
  
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return;
    }
  }
  
  if (data.type === 'GOOGLE_SIGNIN_SUCCESS') {
    handleGoogleAuthResponse(data.payload);
  } else if (data.type === 'GOOGLE_SIGNIN_ERROR') {
    console.error("Native Google sign-in error:", data.payload?.error);
    if (pendingNativeAuthCallback?.onError) {
      pendingNativeAuthCallback.onError(new Error(data.payload?.error || 'Native sign-in failed'));
    }
    pendingNativeAuthCallback = null;
  } else if (data.type === 'GOOGLE_SIGNIN_CANCELLED') {
    console.log("Native Google sign-in cancelled");
    if (pendingNativeAuthCallback?.onCancelled) {
      pendingNativeAuthCallback.onCancelled();
    }
    pendingNativeAuthCallback = null;
  } else if (data.type === 'APPLE_SIGNIN_SUCCESS') {
    (async () => {
      try {
        const idToken = data.idToken || data.payload?.idToken;
        const rawNonce = data.rawNonce || data.payload?.rawNonce;
        const credential = appleProvider.credential({
          idToken,
          rawNonce,
        });
        const result = await signInWithCredential(auth, credential);
        if (pendingNativeAuthCallback?.onSuccess) {
          pendingNativeAuthCallback.onSuccess(result.user);
        }
        pendingNativeAuthCallback = null;
      } catch (error) {
        console.error("Error signing in with native Apple credential:", error);
        if (pendingNativeAuthCallback?.onError) {
          pendingNativeAuthCallback.onError(error as Error);
        }
        pendingNativeAuthCallback = null;
      }
    })();
  } else if (data.type === 'APPLE_SIGNIN_ERROR') {
    const errorMsg = data.error || data.payload?.error || 'Native Apple sign-in failed';
    console.error("Native Apple sign-in error:", errorMsg);
    if (pendingNativeAuthCallback?.onError) {
      pendingNativeAuthCallback.onError(new Error(errorMsg));
    }
    pendingNativeAuthCallback = null;
  } else if (data.type === 'APPLE_SIGNIN_CANCELLED') {
    if (pendingNativeAuthCallback?.onCancelled) {
      pendingNativeAuthCallback.onCancelled();
    }
    pendingNativeAuthCallback = null;
  }
});

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
}

export async function loginAsGuest() {
  return signInAnonymously(auth);
}

export async function loginWithGoogle(callbacks?: NativeAuthCallback) {
  if (isInReactNativeWebView()) {
    pendingNativeAuthCallback = callbacks || null;
    requestNativeGoogleSignIn();
    return;
  }
  
  return signInWithPopup(auth, googleProvider);
}

export function loginWithApple(callbacks?: NativeAuthCallback): Promise<any> {
  if (isInReactNativeWebView()) {
    return new Promise((resolve, reject) => {
      pendingNativeAuthCallback = {
        onSuccess: (user) => {
          callbacks?.onSuccess?.(user);
          resolve(user);
        },
        onError: (error) => {
          callbacks?.onError?.(error);
          reject(error);
        },
        onCancelled: () => {
          callbacks?.onCancelled?.();
          reject(new Error('Apple Sign-In was cancelled'));
        },
      };
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'APPLE_SIGNIN_REQUEST' }));
      } else {
        pendingNativeAuthCallback = null;
        reject(new Error('ReactNativeWebView not available'));
      }
    });
  }

  return signInWithPopup(auth, appleProvider);
}

export async function logout() {
  return signOut(auth);
}

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { isInWebView, isInReactNativeWebView };
