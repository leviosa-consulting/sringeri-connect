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
  id?: number;
  addresseeName?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  alternatePhone?: string;
}

interface SevaKarta {
  id?: number;
  name?: string;
  nameK?: string;
  gotra?: string;
  gotraK?: string;
  nakshatraId?: number;
  rashiId?: number;
  nakshatraDisp?: string;
  rashiDisp?: string;
}

interface PastSeva {
  id?: number;
  sevaRefId?: number;
  sevaName?: string;
  deityName?: string;
  devoteeName?: string;
  sevaDate?: string;
  performedStatus?: string;
  amount?: string;
  performedAs?: string;
  ref?: string;
}

interface DonationDetail {
  id?: number;
  categoryName?: string;
  causeName?: string;
  donationAmount?: number;
  donationInTheNameOf?: string;
  dispText?: string;
}

interface PastDonation {
  id?: number;
  payeeName?: string;
  totalAmount?: number;
  donationDate?: string;
  requireTaxReceipt?: string;
  ref?: string;
  details?: DonationDetail[];
}

interface PastAccommodation {
  id?: number;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  status?: string;
}

interface DevoteeData {
  id?: number;
  devoteeId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  addresses: Address[];
  kartas: SevaKarta[];
  pastSevas: PastSeva[];
  pastDonations: PastDonation[];
  pastAccommodations: PastAccommodation[];
  sevaBookingSummary: {
    totalSeva: number;
    totalSevaAmount: string | number | null;
  };
  donationBookingSummary: {
    totalDonation: number;
    totalDonationAmount: string | number | null;
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
        
        // Update profile with devotee data if available
        if (data.name) {
          setProfile({
            uid: firebaseUser.uid,
            name: data.name || firebaseUser.displayName || "Devotee",
            email: data.email || firebaseUser.email || "",
            phone: data.mobile,
          });
        }
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
