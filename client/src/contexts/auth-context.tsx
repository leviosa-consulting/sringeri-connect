import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth, subscribeToAuthState, loginWithEmail, signUpWithEmail, loginWithGoogle, logout as firebaseLogout, getIdToken } from "@/lib/firebase";

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  nakshatra?: string;
  gothra?: string;
}

interface Address {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

interface SevaKarta {
  id?: string;
  name?: string;
  nakshatra?: string;
  gothra?: string;
}

interface PastSeva {
  id?: string;
  sevaName?: string;
  date?: string;
  amount?: number;
  status?: string;
}

interface PastDonation {
  id?: string;
  donationType?: string;
  date?: string;
  amount?: number;
  status?: string;
}

interface PastAccommodation {
  id?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  status?: string;
}

interface DevoteeData {
  addresses: Address[];
  kartas: SevaKarta[];
  pastSevas: PastSeva[];
  pastDonations: PastDonation[];
  pastAccommodations: PastAccommodation[];
  sevaBookingSummary: {
    totalSeva: number;
    totalSevaAmount: number | null;
  };
  donationBookingSummary: {
    totalDonation: number;
    totalDonationAmount: number | null;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  devoteeData: DevoteeData | null;
  loading: boolean;
  devoteeLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshDevoteeData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [devoteeData, setDevoteeData] = useState<DevoteeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [devoteeLoading, setDevoteeLoading] = useState(false);

  const fetchDevoteeData = async (firebaseUser: User) => {
    setDevoteeLoading(true);
    try {
      // Use Firebase user UID for the API call
      const uid = firebaseUser.uid;
      const response = await fetch(`/api/onlineDevotee/${uid}`);
      
      if (response.ok) {
        const data = await response.json();
        setDevoteeData(data);
      } else {
        console.error("Failed to fetch devotee data");
        setDevoteeData(null);
      }
    } catch (error) {
      console.error("Error fetching devotee data:", error);
      setDevoteeData(null);
    } finally {
      setDevoteeLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        setProfile({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Devotee",
          email: firebaseUser.email || "",
        });
        
        // Fetch devotee data from external API using user UID
        await fetchDevoteeData(firebaseUser);
      } else {
        setProfile(null);
        setDevoteeData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await loginWithEmail(email, password);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    await signUpWithEmail(email, password, displayName);
  };

  const signInWithGoogle = async () => {
    await loginWithGoogle();
  };

  const logout = async () => {
    await firebaseLogout();
    setProfile(null);
    setDevoteeData(null);
  };

  const getToken = async () => {
    return getIdToken();
  };

  const refreshDevoteeData = async () => {
    if (user) {
      await fetchDevoteeData(user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      devoteeData,
      loading, 
      devoteeLoading,
      login, 
      signUp, 
      signInWithGoogle, 
      logout, 
      getToken,
      refreshDevoteeData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
