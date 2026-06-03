import { useState, useEffect, useRef } from "react";
import CountryStateCityFields from "@/components/country-state-city-fields";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import { PendingTransactionBanner } from "@/components/pending-transaction-banner";
import { useLocation } from "wouter";
import { useSubdomainMode } from "@/contexts/subdomain-mode-context";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
  Info,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Landmark,
  Flower2,
  BookOpen,
  GraduationCap,
  Home,
  Utensils,
  Music,
  Sun,
  Star,
  Gift,
  HandHeart,
  Flame,
  Hospital,
  Stethoscope,
  Eye,
  Baby,
  Pill,
  Ambulance,
  Microscope,
  Scissors,
  Droplets,
  TreePine,
  Wheat,
  Brush,
  Sparkles,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import annadanamIcon from "@assets/01-annadanam_1780254525422.png";
import vedaPatashalaIcon from "@assets/02-veda-patashala_1780254525421.png";
import educationIcon from "@assets/03-education_1780254525421.png";
import sringeriHospitalIcon from "@assets/04-sringeri-hospital_1780254525421.png";
import mobileHospitalIcon from "@assets/05-mobile-hospital_1780254525420.png";
import monumentsIcon from "@assets/06-monuments-preservation_1780254525420.png";
import guruKanikeIcon from "@assets/07-guru-kanike_1780254525420.png";
import gajaShalaIcon from "@assets/08-gaja-shala_1780254525420.png";
import goSamrakshanamIcon from "@assets/09-go-samrakshanam_1780254525419.png";
import vocationSupportIcon from "@assets/10-vocation-support_1780254525420.png";
import environmentIcon from "@assets/12-environment_1780254525421.png";

interface DonationHeading {
  id: number;
  name: string;
  shortDescription?: string;
  about?: string;
  slug?: string;
}

interface DonationCategory {
  id: number;
  name: string;
  donationHeadingId: number;
  subcategories?: DonationSubCategory[];
}

interface DonationSubCategory {
  id: number;
  name: string;
  desc?: string;
  is80G: number;
  amountOptions?: number[];
  anyAmount?: boolean;
  hasDonationDate?: number;
  hasUpload?: number;
  donationCategoryId?: number;
  isFeatured?: number;
}

interface FeaturedDonationItem {
  subcategory: DonationSubCategory;
  category: { id: number; name: string; donationHeadingId: number };
  heading: DonationHeading | null;
}

interface CartDonation {
  donationName: string;
  donationId: number;
  subCategoryId: number;
  subcategoryName: string;
  is80G: number;
  donationAmount: number;
  calendarType: string;
  monthId: string;
  fromChandraMasaId: string;
  fromSouraMasaId: string;
  specificDate: string;
  fromTithiId: string;
  fromNakshatraId: string;
  donationInTheNameOf: string;
  donationRemarks: string;
  imagePath: string;
}

interface DonationForm {
  uid: string;
  selectedDonations: CartDonation[];
  donorName: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
  country: string;
  pincode: string;
  state: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  district: string;
  postageCharges: number;
  postageId: string;
  totalAmount: number;
  claim80G: number;
  pan: string;
  confirmInfo: boolean;
}

interface PostageOption {
  id: number;
  name: string;
  amount: number;
}

interface CalendarType {
  id: number;
  name: string;
}

interface Karta {
  name: string;
  id?: number;
}

interface Address {
  addresseeName?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

const MONTHS = [
  { id: 1, name: "January" }, { id: 2, name: "February" }, { id: 3, name: "March" },
  { id: 4, name: "April" }, { id: 5, name: "May" }, { id: 6, name: "June" },
  { id: 7, name: "July" }, { id: 8, name: "August" }, { id: 9, name: "September" },
  { id: 10, name: "October" }, { id: 11, name: "November" }, { id: 12, name: "December" },
];

function formatNumber(value: number): string {
  return value ? value.toLocaleString("en-IN") : "0";
}

const CUSTOM_ICON_KEYWORDS: [string, string][] = [
  ["annadanam", annadanamIcon],
  ["annadana", annadanamIcon],
  ["prasad", annadanamIcon],
  ["bhojan", annadanamIcon],
  ["bhojana", annadanamIcon],
  ["meal", annadanamIcon],
  ["food", annadanamIcon],
  ["kitchen", annadanamIcon],
  ["anna", annadanamIcon],
  ["veda", vedaPatashalaIcon],
  ["patashala", vedaPatashalaIcon],
  ["pathshala", vedaPatashalaIcon],
  ["shastra", vedaPatashalaIcon],
  ["vedic", vedaPatashalaIcon],
  ["grantha", vedaPatashalaIcon],
  ["book", vedaPatashalaIcon],
  ["library", vedaPatashalaIcon],
  ["education", educationIcon],
  ["vidya", educationIcon],
  ["school", educationIcon],
  ["student", educationIcon],
  ["scholarship", educationIcon],
  ["college", educationIcon],
  ["mobile hospital", mobileHospitalIcon],
  ["mobile dispensary", mobileHospitalIcon],
  ["health", mobileHospitalIcon],
  ["ambulance", mobileHospitalIcon],
  ["hospital", sringeriHospitalIcon],
  ["clinic", sringeriHospitalIcon],
  ["medical", sringeriHospitalIcon],
  ["dispensary", sringeriHospitalIcon],
  ["infirmary", sringeriHospitalIcon],
  ["monument", monumentsIcon],
  ["preservation", monumentsIcon],
  ["heritage", monumentsIcon],
  ["peetham", monumentsIcon],
  ["mutt", monumentsIcon],
  ["math", monumentsIcon],
  ["mandir", monumentsIcon],
  ["temple", monumentsIcon],
  ["sringeri", monumentsIcon],
  ["kanike", guruKanikeIcon],
  ["guru kanike", guruKanikeIcon],
  ["prarthana", guruKanikeIcon],
  ["gaja", gajaShalaIcon],
  ["elephant", gajaShalaIcon],
  ["samrakshanam", goSamrakshanamIcon],
  ["goshala", goSamrakshanamIcon],
  ["gaushala", goSamrakshanamIcon],
  ["gomata", goSamrakshanamIcon],
  ["vocation", vocationSupportIcon],
  ["skill", vocationSupportIcon],
  ["livelihood", vocationSupportIcon],
  ["employment", vocationSupportIcon],
  ["artisan", vocationSupportIcon],
  ["training", vocationSupportIcon],
  ["environment", environmentIcon],
  ["ecology", environmentIcon],
  ["nature", environmentIcon],
  ["tree", environmentIcon],
  ["plant", environmentIcon],
  ["garden", environmentIcon],
  ["vanasampada", environmentIcon],
];

const ORANGE_FILTER = "brightness(0) saturate(100%) invert(43%) sepia(97%) saturate(2000%) hue-rotate(1deg) brightness(100%)";
const WHITE_FILTER = "brightness(0) invert(1)";

const CUSTOM_ICON_SKIP_KEYWORDS = ["ashakta", "shishu", "sishu", "infant", "special child", "kalaangana"];

function getCustomIconSrc(name: string): string | null {
  const lower = name.toLowerCase();
  if (CUSTOM_ICON_SKIP_KEYWORDS.some((k) => lower.includes(k))) return null;
  for (const [keyword, src] of CUSTOM_ICON_KEYWORDS) {
    if (lower.includes(keyword)) return src;
  }
  return null;
}

function DonationIcon({
  name,
  sizeClass = "h-7 w-7",
  isSelected = false,
  colorClass,
}: {
  name: string;
  sizeClass?: string;
  isSelected?: boolean;
  colorClass?: string;
}) {
  const customSrc = getCustomIconSrc(name);
  if (customSrc) {
    return (
      <img
        src={customSrc}
        className={sizeClass}
        style={{ filter: isSelected ? WHITE_FILTER : ORANGE_FILTER }}
        alt=""
        draggable={false}
      />
    );
  }
  const LIcon = getIconForName(name);
  return <LIcon className={`${sizeClass} ${colorClass ?? (isSelected ? "text-white" : "text-primary")}`} />;
}

const ICON_KEYWORDS: [string, LucideIcon][] = [
  ["nephro", Droplets],
  ["kidney", Droplets],
  ["dialysis", Droplets],
  ["uro", Droplets],
  ["hospital", Hospital],
  ["clinic", Hospital],
  ["medical", Hospital],
  ["dispensary", Hospital],
  ["eye", Eye],
  ["ophthal", Eye],
  ["nethra", Eye],
  ["netra", Eye],
  ["dental", Scissors],
  ["ortho", Stethoscope],
  ["cardio", Heart],
  ["heart", Heart],
  ["pediatr", Baby],
  ["paediatr", Baby],
  ["child", Baby],
  ["shishu", Baby],
  ["sishu", Baby],
  ["ashakta", Baby],
  ["infant", Baby],
  ["pharma", Pill],
  ["medicine", Pill],
  ["lab", Microscope],
  ["pathol", Microscope],
  ["diagnostic", Microscope],
  ["ambulance", Ambulance],
  ["emergency", Ambulance],
  ["surgery", Stethoscope],
  ["doctor", Stethoscope],
  ["health", Stethoscope],
  ["gaushala", TreePine],
  ["goshala", TreePine],
  ["cow", TreePine],
  ["anna", Utensils],
  ["annadana", Utensils],
  ["food", Utensils],
  ["bhojan", Utensils],
  ["kitchen", Utensils],
  ["meal", Utensils],
  ["bhojana", Utensils],
  ["education", GraduationCap],
  ["vidya", GraduationCap],
  ["school", GraduationCap],
  ["patashala", GraduationCap],
  ["pathshala", GraduationCap],
  ["student", GraduationCap],
  ["scholarship", GraduationCap],
  ["veda", BookOpen],
  ["shastra", BookOpen],
  ["vedic", BookOpen],
  ["library", BookOpen],
  ["grantha", BookOpen],
  ["book", BookOpen],
  ["puja", Flower2],
  ["pooja", Flower2],
  ["archana", Flower2],
  ["homa", Flame],
  ["havan", Flame],
  ["yagna", Flame],
  ["yajna", Flame],
  ["yaga", Flame],
  ["temple", Landmark],
  ["mandir", Landmark],
  ["sringeri", Landmark],
  ["math", Landmark],
  ["peetham", Landmark],
  ["mutt", Landmark],
  ["kanike", Gift],
  ["donation", Gift],
  ["daan", Gift],
  ["seva", HandHeart],
  ["service", HandHeart],
  ["kainkary", HandHeart],
  ["samaj", HandHeart],
  ["trust", HandHeart],
  ["music", Music],
  ["cultural", Music],
  ["sangeet", Music],
  ["kala", Music],
  ["festival", Sun],
  ["utsav", Sun],
  ["jayanti", Sun],
  ["celebration", Sun],
  ["special", Star],
  ["general", Sparkles],
  ["other", Sparkles],
  ["misc", Sparkles],
  ["wheat", Wheat],
  ["grain", Wheat],
  ["crop", Wheat],
  ["agri", Wheat],
  ["farm", Wheat],
  ["nature", TreePine],
  ["garden", TreePine],
  ["environment", TreePine],
  ["tree", TreePine],
  ["plant", TreePine],
  ["clean", Brush],
  ["maintenance", Brush],
  ["repair", Brush],
  ["construction", Home],
  ["building", Home],
  ["accommodation", Home],
  ["guest", Home],
  ["choultry", Home],
];

function getIconForName(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of ICON_KEYWORDS) {
    if (lower.includes(keyword)) return icon;
  }
  return Landmark;
}


export default function Donation() {
  const { user, devoteeData } = useAuth();
  const [, navigate] = useLocation();
  const { isServicesMode, homeRoute } = useSubdomainMode();

  const [step, setStep] = useState<"select" | "review" | "payee">("select");
  const [selectedHeading, setSelectedHeading] = useState<DonationHeading | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DonationCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<DonationSubCategory | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donationInTheNameOf, setDonationInTheNameOf] = useState("");
  const [donationRemarks, setDonationRemarks] = useState("");

  const [calendarType, setCalendarType] = useState("");
  const [monthId, setMonthId] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [chandraMasaId, setChandraMasaId] = useState("");
  const [souraMasaId, setSouraMasaId] = useState("");
  const [tithiId, setTithiId] = useState("");
  const [nakshatraId, setNakshatraId] = useState("");

  const [cart, setCart] = useState<CartDonation[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [donationForm, setDonationForm] = useState<DonationForm>({
    uid: user?.uid || "",
    selectedDonations: [],
    donorName: "",
    countryCode: "+91",
    mobileNumber: "",
    email: "",
    country: "India",
    pincode: "",
    state: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    district: "",
    postageCharges: 0,
    postageId: "",
    totalAmount: 0,
    claim80G: 0,
    pan: "",
    confirmInfo: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ackData, setAckData] = useState<{ txnId: string; orderId: string; amount: string; donationNames: string[] } | null>(null);
  const [showKartaList, setShowKartaList] = useState(false);
  const [showAddressList, setShowAddressList] = useState(false);
  const [show80GWarning, setShow80GWarning] = useState(false);
  const [pendingFocusSubcategoryId, setPendingFocusSubcategoryId] = useState<number | null>(null);
  const [expandedDescs, setExpandedDescs] = useState<Set<number>>(new Set());
  const [showFocusInfo, setShowFocusInfo] = useState<number | null>(null);

  const subCategoryRef = useRef<HTMLDivElement>(null);
  const causeListRef = useRef<HTMLDivElement>(null);

  const { data: headings = [], isLoading: headingsLoading } = useQuery<DonationHeading[]>({
    queryKey: ["donationHeadings"],
    queryFn: async () => {
      const res = await fetch("/api/donationHeading");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<DonationCategory[]>({
    queryKey: ["donationCategories"],
    queryFn: async () => {
      const res = await fetch("/api/donationCategory");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: featuredDonations = [], isLoading: featuredLoading } = useQuery<FeaturedDonationItem[]>({
    queryKey: ["featuredDonations"],
    queryFn: async () => {
      const res = await fetch("/api/featuredDonations");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const donationDataLoading = headingsLoading || categoriesLoading || featuredLoading;

  const filteredCategories = categories.filter(
    (c) => c.donationHeadingId === selectedHeading?.id
  );

  const { data: apiSubcategories = [], isLoading: subCatLoading } = useQuery<DonationSubCategory[]>({
    queryKey: ["donationSubCategory", selectedCategory?.id],
    queryFn: async () => {
      const res = await fetch(`/api/donationSubCategory/${selectedCategory!.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedCategory?.id && !selectedCategory?.subcategories?.length,
  });

  const rawSubcategories = selectedCategory?.subcategories?.length
    ? selectedCategory.subcategories
    : apiSubcategories;

  const subcategories = rawSubcategories.map((sub) => ({
    ...sub,
    amountOptions: sub.amountOptions
      ? sub.amountOptions.map((a: any) => Number(a)).filter((a: number) => !isNaN(a) && a > 0)
      : [],
  }));

  const { data: postageOptions = [] } = useQuery<PostageOption[]>({
    queryKey: ["postageOptions"],
    queryFn: async () => {
      const res = await fetch("/api/postageOptionsDonation");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: calendarTypes = [] } = useQuery<CalendarType[]>({
    queryKey: ["calendarTypes"],
    queryFn: async () => {
      const res = await fetch("/api/calendarTypes");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: tithis = [] } = useQuery<any[]>({
    queryKey: ["tithis"],
    queryFn: async () => {
      const res = await fetch("/api/tithis");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: chandraMasas = [] } = useQuery<any[]>({
    queryKey: ["chandraMasas"],
    queryFn: async () => {
      const res = await fetch("/api/chandraMasas");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: souraMasas = [] } = useQuery<any[]>({
    queryKey: ["souraMasas"],
    queryFn: async () => {
      const res = await fetch("/api/souraMasas");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: nakshatras = [] } = useQuery<any[]>({
    queryKey: ["nakshatras"],
    queryFn: async () => {
      const res = await fetch("/api/nakshatras");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useEffect(() => {
    if (user?.uid) {
      user.getIdToken()
        .then((token) => fetch(`/api/onlineDevotee/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        }))
        .then((r) => r.json())
        .then((data) => {
          setDonationForm((prev) => ({
            ...prev,
            uid: user.uid,
            donorName: data.name || "",
            email: data.email || "",
            mobileNumber: data.mobile || "",
            countryCode: data.countryCode || "+91",
          }));
        })
        .catch(() => {});
    }
  }, [user?.uid]);

  useEffect(() => {
    if (pendingFocusSubcategoryId !== null && subcategories.length > 0) {
      const match = subcategories.find((s) => s.id === pendingFocusSubcategoryId);
      if (match) {
        handleSelectSubCategory(match);
      }
      setPendingFocusSubcategoryId(null);
    }
  }, [subcategories, pendingFocusSubcategoryId]);

  useEffect(() => {
    if (subcategories.length === 1 && !selectedSubCategory) {
      handleSelectSubCategory(subcategories[0]);
    }
  }, [subcategories]);

  function getDaysInMonth(mId: string): number {
    const m = parseInt(mId);
    if (m === 2) return 28;
    if ([4, 6, 9, 11].includes(m)) return 30;
    return 31;
  }

  useEffect(() => {
    if (monthId && specificDate) {
      const max = getDaysInMonth(monthId);
      if (parseInt(specificDate) > max) setSpecificDate("");
    }
  }, [monthId]);

  const kartas = devoteeData?.kartas || [];
  const addresses = devoteeData?.addresses || [];

  const totalAmount = cart.reduce((sum, d) => sum + Number(d.donationAmount), 0) + donationForm.postageCharges;

  const has80GInCart = cart.some((d) => Number(d.is80G) === 1);
  const hasNon80GInCart = cart.some((d) => Number(d.is80G) === 0);

  const resetSelection = () => {
    setSelectedSubCategory(null);
    setSelectedAmount(0);
    setCustomAmount("");
    setDonationInTheNameOf("");
    setDonationRemarks("");
    setCalendarType("");
    setMonthId("");
    setSpecificDate("");
    setChandraMasaId("");
    setSouraMasaId("");
    setTithiId("");
    setNakshatraId("");
    setValidationErrors([]);
  };


  const handleFeaturedDonation = (featured: FeaturedDonationItem) => {
    if (featured.heading) {
      const heading = headings.find((h) => h.id === featured.heading!.id);
      if (heading) setSelectedHeading(heading);
    }

    const category = categories.find((c) => c.id === featured.category.id);
    if (category) {
      setSelectedCategory(category);
      resetSelection();
      setPendingFocusSubcategoryId(featured.subcategory.id);
    }
  };

  const handleSelectHeading = (heading: DonationHeading) => {
    setSelectedHeading(heading);
    setSelectedCategory(null);
    resetSelection();
  };

  const handleSelectCategory = (category: DonationCategory) => {
    setSelectedCategory(category);
    resetSelection();
    setTimeout(() => {
      causeListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const handleSelectSubCategory = (sub: DonationSubCategory) => {
    const isAdding80G = Number(sub.is80G) === 1;
    if ((has80GInCart && !isAdding80G) || (hasNon80GInCart && isAdding80G)) {
      setShow80GWarning(true);
      return;
    }
    setSelectedSubCategory(sub);
    setSelectedAmount(0);
    setCustomAmount("");
    setValidationErrors([]);
    setTimeout(() => {
      subCategoryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const applyCustomAmount = () => {
    const val = parseInt(customAmount);
    if (val > 0) {
      setSelectedAmount(val);
    }
  };

  const validateAndAddToCart = () => {
    const errors: string[] = [];
    if (!selectedCategory) errors.push("Please select a donation category.");
    if (!selectedSubCategory) errors.push("Please select a donation cause.");
    if (!selectedAmount && !customAmount) errors.push("Please select or enter a donation amount.");
    if (customAmount && parseInt(customAmount) <= 0) errors.push("Please enter a valid amount.");

    if (selectedSubCategory?.hasDonationDate === 1) {
      if (!calendarType) errors.push("Please select a calendar type.");
      if (calendarType === "1" && !monthId) errors.push("Please select a month.");
      if (calendarType === "1" && !specificDate) errors.push("Please select a date.");
      if (calendarType === "2" && !chandraMasaId) errors.push("Please select a Chandra Masa.");
      if (calendarType === "3" && !souraMasaId) errors.push("Please select a Soura Masa.");
      if ((calendarType === "2" || calendarType === "3") && !tithiId && !nakshatraId) {
        errors.push("Please select a Tithi or Nakshatra.");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const amt = selectedAmount || parseInt(customAmount) || 0;
    const newDonation: CartDonation = {
      donationName: selectedCategory?.name || "",
      donationId: selectedCategory!.id,
      subCategoryId: selectedSubCategory!.id,
      subcategoryName: selectedSubCategory!.name,
      is80G: selectedSubCategory!.is80G,
      donationAmount: amt,
      calendarType,
      monthId,
      specificDate,
      fromChandraMasaId: chandraMasaId,
      fromSouraMasaId: souraMasaId,
      fromTithiId: tithiId,
      fromNakshatraId: nakshatraId,
      donationInTheNameOf,
      donationRemarks,
      imagePath: "",
    };

    const isAdding80G = Number(selectedSubCategory!.is80G) === 1;
    if ((has80GInCart && !isAdding80G) || (hasNon80GInCart && isAdding80G)) {
      setCart([newDonation]);
    } else {
      setCart((prev) => [...prev, newDonation]);
    }

    resetSelection();
    setSelectedCategory(null);
    setShowCart(true);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeDonation = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProceedToPayee = () => {
    if (cart.length === 0) return;
    setValidationErrors([]);
    setDonationForm((prev) => ({
      ...prev,
      selectedDonations: cart,
      totalAmount: totalAmount,
    }));
    setStep("payee");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validatePayeeAndSubmit = async () => {
    const errors: string[] = [];
    if (!donationForm.donorName || donationForm.donorName.trim().length < 3)
      errors.push("Donor name must be at least 3 characters.");
    if (!donationForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donationForm.email.trim()))
      errors.push("Enter a valid email address.");
    if (!donationForm.mobileNumber)
      errors.push("Enter a valid mobile number.");
    if (!donationForm.countryCode)
      errors.push("Please select a country code.");
    if (!donationForm.country)
      errors.push("Please enter your country.");
    if (!donationForm.state)
      errors.push("Please enter your state.");
    if (!donationForm.city)
      errors.push("Please enter your city.");
    if (!donationForm.addressLine1)
      errors.push("Please enter your street address.");
    if (!donationForm.pincode)
      errors.push("Please enter your pincode.");
    if (donationForm.claim80G === 1 && !donationForm.pan)
      errors.push("PAN number is required for 80G claims.");
    if (donationForm.claim80G === 1 && donationForm.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(donationForm.pan.trim().toUpperCase()))
      errors.push("Please enter a valid PAN number (e.g., ABCDE1234F).");
    if (postageOptions.length > 0 && !donationForm.postageId)
      errors.push("Please select a postage option.");
    if (!donationForm.confirmInfo)
      errors.push("Please confirm the information is correct.");

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        ...donationForm,
        selectedDonations: cart,
        totalAmount: totalAmount,
        uid: user?.uid || "",
      };

      const initRes = await fetch("/api/makeDonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        setErrorMessage(errData.details || errData.error || "Failed to initiate payment. Please try again.");
        setSubmitting(false);
        return;
      }

      const { txnToken, orderId, mid, amount } = await initRes.json();

      if (!txnToken || !orderId || !mid) {
        setErrorMessage("We could not complete the payment at this moment. Please try after sometime.");
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem("pendingPayment", JSON.stringify({
        flowType: "donation",
        itemNames: cart.map((d) => d.subcategoryName || d.donationName),
        amount,
        orderId,
        is80G: donationForm.claim80G === 1,
        ts: Date.now(),
        retryData: {
          payload: { ...donationForm, selectedDonations: cart, totalAmount: totalAmount, uid: user?.uid || "" },
          endpoint: "/api/makeDonation",
        },
      }));

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`;
      form.style.display = "none";
      const fields = { mid, orderId, txnToken };
      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      console.error("Donation payment error:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const updatePayeeField = (field: keyof DonationForm, value: any) => {
    setDonationForm((prev) => ({ ...prev, [field]: value }));
  };

  if (paymentSuccess && ackData) {
    return (
      <div className="min-h-screen bg-[#F7F2EC]" data-testid="donation-ack">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <div className="max-w-2xl mx-auto flex justify-center">
            <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-14 w-auto object-contain" />
          </div>
        </div>
        <div className="px-4 mt-6 pb-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md px-6 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-serif font-bold text-primary mb-2" data-testid="text-ack-title">Payment Successful</h2>
              <p className="text-sm text-muted-foreground mb-6">Your donation has been received. Thank you for your generosity.</p>

              <div className="text-left bg-[#F7F2EC] rounded-lg p-4 mb-6">
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Transaction ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-ack-txnid">{ackData.txnId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Order ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-ack-orderid">{ackData.orderId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-semibold text-primary" data-testid="text-ack-amount">₹{ackData.amount}</span>
                </div>
                <div className="py-2">
                  <span className="text-xs text-muted-foreground">Donations</span>
                  <ul className="mt-1">
                    {ackData.donationNames.map((name, i) => (
                      <li key={i} className="text-xs text-primary py-0.5" data-testid={`text-ack-donation-${i}`}>• {name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={() => {
                  setPaymentSuccess(false);
                  setAckData(null);
                  setCart([]);
                  setStep("select");
                  setDonationForm((prev) => ({ ...prev, confirmInfo: false }));
                  setErrorMessage("");
                }}
                  className="uppercase font-medium rounded-md bg-[#3d2000] text-white px-6 py-3 text-sm hover:bg-[#5a3510] transition-colors"
                  data-testid="button-ack-new-donation">
                  Make Another Donation
                </button>
                {!isServicesMode && (
                  <button onClick={() => navigate(homeRoute)}
                    className="uppercase font-medium rounded-md border border-[#3d2000] text-[#3d2000] px-6 py-3 text-sm hover:bg-[#F7F2EC] transition-colors"
                    data-testid="button-ack-go-home">
                    Go Home
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Sri Sringeri Sharada Peetham — Online Donations
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "payee") {
    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button
            onClick={() => { setStep("review"); setValidationErrors([]); }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
            data-testid="button-back-payee"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <Heart className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold" data-testid="text-payee-title">Payee Details</h1>
              <p className="text-sm opacity-80">Complete your donation</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-serif font-bold text-base">Personal Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Donor Name *</label>
                  <input
                    type="text"
                    value={donationForm.donorName}
                    onChange={(e) => updatePayeeField("donorName", e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-donor-name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                  <input
                    type="email"
                    value={donationForm.email}
                    onChange={(e) => updatePayeeField("email", e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-email"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Code</label>
                    <input
                      type="text"
                      value={donationForm.countryCode}
                      onChange={(e) => updatePayeeField("countryCode", e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-country-code"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Mobile *</label>
                    <input
                      type="text"
                      value={donationForm.mobileNumber}
                      onChange={(e) => updatePayeeField("mobileNumber", e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-mobile"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base">Address</h3>
                <button
                  className="text-xs text-primary underline"
                  onClick={() => setShowAddressList(!showAddressList)}
                  data-testid="button-pick-address"
                >
                  + Pick from saved
                </button>
              </div>
              {showAddressList && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {addresses.length > 0 ? addresses.map((addr, i) => (
                    <button
                      key={i}
                      className="w-full text-left text-xs p-2 rounded hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        updatePayeeField("addressLine1", addr.addressLine1 || "");
                        updatePayeeField("addressLine2", addr.addressLine2 || "");
                        updatePayeeField("landmark", addr.landmark || "");
                        updatePayeeField("city", addr.city || "");
                        updatePayeeField("state", addr.state || "");
                        updatePayeeField("country", addr.country || "");
                        updatePayeeField("pincode", addr.pincode || "");
                        setShowAddressList(false);
                      }}
                      data-testid={`button-address-${i}`}
                    >
                      <span className="font-semibold">{addr.addresseeName || addr.city}</span>
                      <span className="text-muted-foreground"> — {addr.addressLine1}, {addr.city}</span>
                    </button>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No saved addresses found</p>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <CountryStateCityFields
                  country={donationForm.country}
                  state={donationForm.state}
                  city={donationForm.city}
                  onCountryChange={(v) => updatePayeeField("country", v)}
                  onStateChange={(v) => updatePayeeField("state", v)}
                  onCityChange={(v) => updatePayeeField("city", v)}
                  variant="form"
                  idPrefix="donation-"
                  showRequired
                />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Pincode *</label>
                  <input
                    type="text"
                    value={donationForm.pincode}
                    onChange={(e) => updatePayeeField("pincode", e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-pincode"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Street Address *</label>
                  <input
                    type="text"
                    value={donationForm.addressLine1}
                    onChange={(e) => updatePayeeField("addressLine1", e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-address1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Locality</label>
                  <input
                    type="text"
                    value={donationForm.addressLine2}
                    onChange={(e) => updatePayeeField("addressLine2", e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-address2"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Landmark</label>
                  <input
                    type="text"
                    value={donationForm.landmark}
                    onChange={(e) => updatePayeeField("landmark", e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-landmark"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {postageOptions.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-base">Postage <span className="text-red-500">*</span></h3>
                <select
                  value={donationForm.postageId}
                  onChange={(e) => {
                    const selectedOpt = postageOptions.find((o) => String(o.id) === e.target.value);
                    if (selectedOpt) {
                      setDonationForm((prev) => ({
                        ...prev,
                        postageId: String(selectedOpt.id),
                        postageCharges: selectedOpt.amount,
                      }));
                    }
                  }}
                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="select-postage"
                >
                  <option value="" disabled>Select Postage</option>
                  {postageOptions.map((opt) => (
                    <option key={opt.id} value={String(opt.id)}>
                      {opt.name} — ₹{opt.amount}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <label className="flex gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={donationForm.confirmInfo}
                  onChange={(e) => updatePayeeField("confirmInfo", e.target.checked)}
                  className="mt-0.5 accent-primary"
                  data-testid="checkbox-confirm"
                />
                <span>I confirm that the information given in this form is true, complete and accurate. I agree that the above contribution may be treated as donation towards the corpus fund of the trust.</span>
              </label>
            </CardContent>
          </Card>

          {has80GInCart && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-base">80G Tax Benefit</h3>
                <div className="flex items-center gap-4">
                  <label className="text-sm">Claim 80G benefit?</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="claim80G"
                        value={1}
                        checked={donationForm.claim80G === 1}
                        onChange={() => updatePayeeField("claim80G", 1)}
                        className="accent-primary"
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="claim80G"
                        value={0}
                        checked={donationForm.claim80G === 0}
                        onChange={() => updatePayeeField("claim80G", 0)}
                        className="accent-primary"
                      />
                      No
                    </label>
                  </div>
                </div>
                {donationForm.claim80G === 1 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">PAN Number *</label>
                    <input
                      type="text"
                      value={donationForm.pan}
                      onChange={(e) => updatePayeeField("pan", e.target.value.toUpperCase())}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                      data-testid="input-pan"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-red-600 text-xs">{err}</p>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-xl font-serif font-bold text-primary">₹{formatNumber(totalAmount)}</span>
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={validatePayeeAndSubmit}
              disabled={submitting || !donationForm.confirmInfo}
              data-testid="button-submit-donation"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${formatNumber(totalAmount)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button
            onClick={() => setStep("select")}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
            data-testid="button-back-review"
          >
            <ArrowLeft className="h-4 w-4" />
            Add More
          </button>
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold" data-testid="text-review-title">Review Donations</h1>
              <p className="text-sm opacity-80">{cart.length} donation(s) added</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">
          {cart.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No donations added yet.</p>
                <Button className="mt-4" onClick={() => setStep("select")} data-testid="button-add-first">
                  Add a Donation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {cart.map((donation, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" data-testid={`text-donation-name-${index}`}>
                            {donation.donationName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {donation.is80G === 0
                              ? `${donation.subcategoryName} (non-80G)`
                              : donation.subcategoryName}
                          </p>
                          {donation.donationInTheNameOf && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              In the name of: {donation.donationInTheNameOf}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-serif font-bold text-lg">₹{formatNumber(donation.donationAmount)}</span>
                        <button
                          className="text-red-500 text-xs flex items-center gap-1"
                          onClick={() => removeDonation(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="bg-white border border-border rounded-lg p-4 shadow-sm mt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-serif font-bold text-primary">
                    ₹{formatNumber(totalAmount)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("select")}
                    data-testid="button-add-another"
                  >
                    + Add Another
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleProceedToPayee}
                    data-testid="button-proceed-pay"
                  >
                    Proceed to Pay
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EC] pb-24">
      <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          {!isServicesMode && (
            <button
              onClick={() => navigate(homeRoute)}
              className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </button>
          )}
          <div className="flex items-center gap-3">
            <HandHeart className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold" data-testid="text-page-title">Make a Donation</h1>
              <p className="text-sm opacity-80">Sri Sringeri Sharada Peetham</p>
            </div>
          </div>
        </div>
      </div>

      <PendingTransactionBanner
        typeKeywords={["donation", "donate", "daan"]}
        sessionKey="ssp_pending_donation_checked"
        label="donation"
      />

      <div className="px-4 mt-4 space-y-4">
        {donationDataLoading && (
          <div className="flex flex-col items-center justify-center py-20" data-testid="loading-donation-data">
            <RangoliLoader size={56} />
            <p className="text-sm text-muted-foreground mt-4">Loading donation options…</p>
          </div>
        )}
        {!donationDataLoading && featuredDonations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 px-1" data-testid="text-donations-in-focus">
              <Star className="h-4 w-4 inline-block mr-1 text-amber-500" />
              Donations in Focus
            </h3>
            <div className="space-y-2">
              {featuredDonations.map((featured, idx) => {
                return (
                  <div key={featured.subcategory.id} className="relative">
                    <div
                      className={`w-full flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-3 transition-all hover:shadow-md hover:border-amber-300 ${headings.length === 0 || categories.length === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"}`}
                    >
                      <button
                        onClick={() => handleFeaturedDonation(featured)}
                        disabled={headings.length === 0 || categories.length === 0}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                        data-testid={`button-featured-${featured.subcategory.id}`}
                      >
                        <div className="bg-primary/10 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                          <DonationIcon name={featured.subcategory.name} sizeClass="h-5 w-5" colorClass="text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-foreground flex-1 leading-tight">{featured.subcategory.name}</span>
                      </button>
                      {featured.subcategory.desc && (
                        <button
                          onClick={() => setShowFocusInfo(showFocusInfo === idx ? null : idx)}
                          className="shrink-0 p-1 rounded-full hover:bg-amber-100 transition-colors"
                          data-testid={`button-featured-info-${featured.subcategory.id}`}
                        >
                          <Info className="h-4 w-4 text-amber-600" />
                        </button>
                      )}
                    </div>
                    {showFocusInfo === idx && featured.subcategory.desc && (
                      <div className="mx-4 mt-1 mb-1 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-xs text-muted-foreground leading-relaxed">{featured.subcategory.desc}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!donationDataLoading && (
        <div>
          <h3 className="text-sm font-semibold mb-3 px-1" data-testid="text-choose-center">Choose Donation Center</h3>
          <div className="grid grid-cols-3 gap-3">
            {headings.map((heading) => {
              const isSelected = selectedHeading?.id === heading.id;
              return (
                <button
                  key={heading.id}
                  onClick={() => handleSelectHeading(heading)}
                  className={`flex flex-col items-center rounded-xl p-3 pt-4 pb-3 transition-all min-h-[100px] ${
                    isSelected
                      ? "bg-primary text-white shadow-lg ring-2 ring-primary/30"
                      : "bg-white border border-border text-foreground hover:border-primary/50 hover:shadow-md"
                  }`}
                  data-testid={`button-heading-${heading.id}`}
                >
                  <div className="flex-1 flex items-center">
                    <DonationIcon name={heading.name} sizeClass="h-7 w-7" isSelected={isSelected} />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight line-clamp-2 mt-2">{heading.name}</span>
                </button>
              );
            })}
          </div>
          {selectedHeading?.shortDescription && (
            <p className="text-xs text-muted-foreground mt-3 px-1">{selectedHeading.shortDescription}</p>
          )}
        </div>
        )}

        {selectedHeading && filteredCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 px-1" data-testid="text-choose-category">Choose Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`flex flex-col items-center rounded-xl p-3 pt-4 pb-3 transition-all min-h-[90px] ${
                      isSelected
                        ? "bg-primary text-white shadow-lg ring-2 ring-primary/30"
                        : "bg-white border border-border text-foreground hover:border-primary/50 hover:shadow-md"
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <div className="flex-1 flex items-center">
                      <DonationIcon name={cat.name} sizeClass="h-6 w-6" isSelected={isSelected} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight line-clamp-2 mt-2">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedCategory && (
          <div ref={causeListRef}>
            <h3 className="text-sm font-semibold mb-2 px-1" data-testid="text-choose-cause">Choose Donation Cause</h3>
            {subCatLoading ? (
              <div className="flex items-center justify-center py-8">
                <RangoliLoader size={36} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subcategories.map((sub) => {
                  const isSubSelected = selectedSubCategory?.id === sub.id;
                  return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubCategory(sub)}
                    className={`w-full text-left rounded-lg p-3 transition-all ${
                      isSubSelected
                        ? "bg-primary text-white shadow-md"
                        : "bg-white border border-border hover:border-primary/50"
                    }`}
                    data-testid={`button-subcategory-${sub.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <DonationIcon name={sub.name} sizeClass="h-4 w-4 shrink-0" isSelected={isSubSelected} colorClass={isSubSelected ? "text-white" : "text-primary"} />
                        <span className="text-sm font-medium leading-snug">
                          {sub.is80G === 0 ? `${sub.name} (non-80G)` : sub.name}
                        </span>
                      </div>
                      {isSubSelected && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                    {sub.desc && (
                      <div className="mt-1">
                        <p
                          className={`text-xs ${isSubSelected ? "text-white/80" : "text-muted-foreground"} ${expandedDescs.has(sub.id) ? "" : "line-clamp-1"}`}
                        >
                          {sub.desc}
                        </p>
                        {sub.desc.length > 60 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDescs((prev) => {
                                const next = new Set(prev);
                                if (next.has(sub.id)) next.delete(sub.id);
                                else next.add(sub.id);
                                return next;
                              });
                            }}
                            className={`text-[11px] font-medium mt-0.5 ${isSubSelected ? "text-white/90 underline" : "text-primary underline"}`}
                            data-testid={`button-desc-toggle-${sub.id}`}
                          >
                            {expandedDescs.has(sub.id) ? "Show less" : "More"}
                          </button>
                        )}
                      </div>
                    )}
                  </button>
                );
                })}
              </div>
            )}
          </div>
        )}

        {selectedSubCategory && (
          <div ref={subCategoryRef}>
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-serif font-bold text-base">
                  {selectedSubCategory.name}
                </h3>

                {selectedSubCategory.amountOptions && selectedSubCategory.amountOptions.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Select Amount</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubCategory.amountOptions.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleSelectAmount(amt)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedAmount === amt
                              ? "bg-primary text-white shadow-md"
                              : "bg-white border border-border hover:border-primary/50"
                          }`}
                          data-testid={`button-amount-${amt}`}
                        >
                          ₹{formatNumber(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSubCategory.anyAmount && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Or enter custom amount</label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                      onBlur={applyCustomAmount}
                      onKeyDown={(e) => e.key === "Enter" && applyCustomAmount()}
                      placeholder="Enter amount"
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-custom-amount"
                    />
                  </div>
                )}

                {selectedSubCategory.hasDonationDate === 1 && (
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Sun className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">Donation Date</p>
                        <p className="text-xs text-muted-foreground">Choose a calendar system and date</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-foreground/70 mb-2 uppercase tracking-wide">Calendar Type</p>
                      <div className="grid grid-cols-3 gap-2">
                        {calendarTypes.map((ct) => (
                          <button
                            key={ct.id}
                            onClick={() => {
                              setCalendarType(String(ct.id));
                              setMonthId(""); setSpecificDate("");
                              setChandraMasaId(""); setSouraMasaId("");
                              setTithiId(""); setNakshatraId("");
                            }}
                            className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                              calendarType === String(ct.id)
                                ? "bg-primary text-white shadow-md"
                                : "bg-white border border-border hover:border-primary/50"
                            }`}
                            data-testid={`button-cal-type-${ct.id}`}
                          >
                            {ct.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {calendarType === "1" && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-foreground/70 mb-1.5 uppercase tracking-wide">Month</p>
                          <select
                            value={monthId}
                            onChange={(e) => setMonthId(e.target.value)}
                            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="select-month"
                          >
                            <option value="">Select month</option>
                            {MONTHS.map((m) => (
                              <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        {monthId && (
                          <div>
                            <p className="text-xs font-medium text-foreground/70 mb-1.5 uppercase tracking-wide">Date</p>
                            <select
                              value={specificDate}
                              onChange={(e) => setSpecificDate(e.target.value)}
                              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                              data-testid="select-specific-date"
                            >
                              <option value="">Select date</option>
                              {Array.from({ length: getDaysInMonth(monthId) }, (_, i) => i + 1).map((d) => (
                                <option key={d} value={String(d)}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {calendarType === "2" && (
                      <div>
                        <p className="text-xs font-medium text-foreground/70 mb-1.5 uppercase tracking-wide">Chandra Masa</p>
                        <select
                          value={chandraMasaId}
                          onChange={(e) => setChandraMasaId(e.target.value)}
                          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          data-testid="select-chandra-masa"
                        >
                          <option value="">Select Chandra Masa</option>
                          {chandraMasas.map((cm: any) => (
                            <option key={cm.id} value={cm.id}>{cm.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {calendarType === "3" && (
                      <div>
                        <p className="text-xs font-medium text-foreground/70 mb-1.5 uppercase tracking-wide">Soura Masa</p>
                        <select
                          value={souraMasaId}
                          onChange={(e) => setSouraMasaId(e.target.value)}
                          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          data-testid="select-soura-masa"
                        >
                          <option value="">Select Soura Masa</option>
                          {souraMasas.map((sm: any) => (
                            <option key={sm.id} value={sm.id}>{sm.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(calendarType === "2" || calendarType === "3") && (
                      <div>
                        <p className="text-xs font-medium text-foreground/70 mb-2 uppercase tracking-wide">Tithi or Nakshatra</p>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={tithiId}
                            onChange={(e) => { setTithiId(e.target.value); if (e.target.value) setNakshatraId(""); }}
                            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="select-tithi"
                          >
                            <option value="">Tithi</option>
                            {tithis.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <select
                            value={nakshatraId}
                            onChange={(e) => { setNakshatraId(e.target.value); if (e.target.value) setTithiId(""); }}
                            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="select-nakshatra"
                          >
                            <option value="">Nakshatra</option>
                            {nakshatras.map((n: any) => (
                              <option key={n.id} value={n.id}>{n.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground mb-1 block">Donation in the name of</label>
                      <button
                        className="text-xs text-primary underline"
                        onClick={() => setShowKartaList(!showKartaList)}
                        data-testid="button-pick-karta"
                      >
                        + Pick karta
                      </button>
                    </div>
                    {showKartaList && (
                      <div className="bg-muted/50 rounded-lg p-2 mb-2 max-h-32 overflow-y-auto">
                        {kartas.length > 0 ? kartas.map((karta, i) => (
                          <button
                            key={i}
                            className="w-full text-left text-xs p-2 rounded hover:bg-primary/10"
                            onClick={() => { setDonationInTheNameOf(karta.name || ""); setShowKartaList(false); }}
                            data-testid={`button-karta-${i}`}
                          >
                            {karta.name}{karta.gotra ? ` (${karta.gotra})` : ""}
                          </button>
                        )) : (
                          <p className="text-xs text-muted-foreground text-center py-2">No saved kartas found</p>
                        )}
                      </div>
                    )}
                    <input
                      type="text"
                      value={donationInTheNameOf}
                      onChange={(e) => setDonationInTheNameOf(e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-name-of"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Remarks</label>
                    <input
                      type="text"
                      value={donationRemarks}
                      onChange={(e) => setDonationRemarks(e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-remarks"
                    />
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-red-600 text-xs">{err}</p>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full h-11"
                  onClick={validateAndAddToCart}
                  disabled={!selectedAmount && !customAmount}
                  data-testid="button-add-to-cart"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Donation{selectedAmount || customAmount ? ` — ₹${formatNumber(selectedAmount || parseInt(customAmount) || 0)}` : ""}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border shadow-lg px-4 py-3 z-40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{cart.length} donation(s)</p>
              <p className="text-lg font-serif font-bold text-primary">₹{formatNumber(totalAmount)}</p>
            </div>
            <Button
              onClick={() => setStep("review")}
              className="px-6"
              data-testid="button-view-cart"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Review & Pay
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={show80GWarning} onOpenChange={setShow80GWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Mix Donation Types</AlertDialogTitle>
            <AlertDialogDescription>
              Donations for 80G and non-80G causes cannot be added in a single transaction due to statutory reasons. Please complete the current donations first or clear your cart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-80g-cancel">OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
